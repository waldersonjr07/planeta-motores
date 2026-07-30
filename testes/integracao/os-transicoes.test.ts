import { beforeEach, expect, test } from 'vitest'
import { obterOs } from '../../src/modulos/os/consultas'
import { adicionarItem, mudarSituacao } from '../../src/modulos/os/operacoes'
import { limparBanco } from '../ajuda/banco'
import { cenarioOs } from '../ajuda/os'

beforeEach(limparBanco)

test('transição válida grava histórico e carimba a data', async () => {
  const { osId } = await cenarioOs()

  const r = await mudarSituacao(osId, 'em_diagnostico', { observacao: 'Ivan avaliou' })

  expect(r.ok).toBe(true)
  const os = await obterOs(osId)
  expect(os?.situacao).toBe('em_diagnostico')
  expect(os?.diagnosticadoEm).toBeInstanceOf(Date)
  expect(os?.historico.at(-1)).toMatchObject({
    situacaoAnterior: 'recebido',
    situacaoNova: 'em_diagnostico',
    observacao: 'Ivan avaliou',
  })
})

test('pular etapa é recusado e nada muda', async () => {
  const { osId } = await cenarioOs()

  const r = await mudarSituacao(osId, 'pronto')

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Não é possível ir de Recebido para Pronto.')
  const os = await obterOs(osId)
  expect(os?.situacao).toBe('recebido')
  expect(os?.historico).toHaveLength(1)
})

test('enviar orçamento cria a versão 1 com os itens', async () => {
  const { osId, servico } = await cenarioOs()
  await mudarSituacao(osId, 'em_diagnostico')
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })

  await mudarSituacao(osId, 'orcamento_enviado')

  const os = await obterOs(osId)
  expect(os?.versaoOrcamento).toBe(1)
  expect(os?.versoesOrcamento).toHaveLength(1)
  expect(os?.versoesOrcamento[0].totalCentavos).toBe(21000)
})

test('reenviar sem alterar item não cria versão nova', async () => {
  const { osId, servico } = await cenarioOs()
  await mudarSituacao(osId, 'em_diagnostico')
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  await mudarSituacao(osId, 'orcamento_enviado')

  await mudarSituacao(osId, 'orcamento_enviado', { observacao: 'Reenviado por WhatsApp' })

  const os = await obterOs(osId)
  expect(os?.versaoOrcamento).toBe(1)
  expect(os?.versoesOrcamento).toHaveLength(1)
  // O reenvio existe no histórico, mesmo sem versão nova.
  expect(os?.historico.at(-1)?.observacao).toBe('Reenviado por WhatsApp')
})

test('alterar item depois de aprovado e reenviar cria a versão 2', async () => {
  const { osId, servico, peca } = await cenarioOs()
  await mudarSituacao(osId, 'em_diagnostico')
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  await mudarSituacao(osId, 'orcamento_enviado')
  await mudarSituacao(osId, 'aprovado')

  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 1 })
  await mudarSituacao(osId, 'orcamento_enviado', { observacao: 'Achou cilindro riscado' })

  const os = await obterOs(osId)
  expect(os?.situacao).toBe('orcamento_enviado')
  expect(os?.versaoOrcamento).toBe(2)
  expect(os?.versoesOrcamento).toHaveLength(2)
  expect(os?.versoesOrcamento[0].totalCentavos).toBe(21000)
  expect(os?.versoesOrcamento[1].totalCentavos).toBe(24800)
})

test('recusa registra o motivo e permite devolver', async () => {
  const { osId } = await cenarioOs()
  await mudarSituacao(osId, 'em_diagnostico')
  await mudarSituacao(osId, 'orcamento_enviado')

  await mudarSituacao(osId, 'recusado', { motivo: 'Achou caro' })
  const depoisDaRecusa = await obterOs(osId)
  await mudarSituacao(osId, 'devolvido')

  expect(depoisDaRecusa?.motivoRecusa).toBe('Achou caro')
  expect(depoisDaRecusa?.recusadoEm).toBeInstanceOf(Date)
  expect((await obterOs(osId))?.situacao).toBe('devolvido')
})

test('o caminho completo até a entrega funciona e carimba as datas', async () => {
  const { osId } = await cenarioOs()
  for (const passo of [
    'em_diagnostico',
    'orcamento_enviado',
    'aprovado',
    'em_execucao',
    'pronto',
    'entregue',
  ] as const) {
    const r = await mudarSituacao(osId, passo)
    expect(r.ok).toBe(true)
  }

  const os = await obterOs(osId)
  expect(os?.entregueEm).toBeInstanceOf(Date)
  expect(os?.concluidoEm).toBeInstanceOf(Date)
  expect(os?.historico).toHaveLength(7)
})

test('OS entregue não aceita mais nenhuma transição', async () => {
  const { osId } = await cenarioOs()
  for (const passo of [
    'em_diagnostico',
    'orcamento_enviado',
    'aprovado',
    'em_execucao',
    'pronto',
    'entregue',
  ] as const) {
    await mudarSituacao(osId, passo)
  }

  expect((await mudarSituacao(osId, 'em_execucao')).ok).toBe(false)
  expect((await mudarSituacao(osId, 'cancelado')).ok).toBe(false)
})

test('espera por peça vai e volta sem perder o histórico', async () => {
  const { osId } = await cenarioOs()
  await mudarSituacao(osId, 'em_diagnostico')
  await mudarSituacao(osId, 'orcamento_enviado')
  await mudarSituacao(osId, 'aprovado')
  await mudarSituacao(osId, 'aguardando_peca', { observacao: 'Kit encomendado' })
  await mudarSituacao(osId, 'em_execucao')
  await mudarSituacao(osId, 'aguardando_peca', { observacao: 'Faltou retentor' })
  await mudarSituacao(osId, 'em_execucao')

  const os = await obterOs(osId)
  expect(os?.situacao).toBe('em_execucao')
  expect(os?.historico.map((h) => h.situacaoNova)).toEqual([
    'recebido',
    'em_diagnostico',
    'orcamento_enviado',
    'aprovado',
    'aguardando_peca',
    'em_execucao',
    'aguardando_peca',
    'em_execucao',
  ])
})
