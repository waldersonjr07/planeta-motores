import { beforeEach, expect, test } from 'vitest'
import { saldoDaPeca } from '../../src/modulos/estoque/consultas'
import { registrarMovimento } from '../../src/modulos/estoque/operacoes'
import { obterOs } from '../../src/modulos/os/consultas'
import { adicionarItem, mudarSituacao, removerItem } from '../../src/modulos/os/operacoes'
import { limparBanco } from '../ajuda/banco'
import { cenarioOs } from '../ajuda/os'

beforeEach(limparBanco)

async function ateExecucao(osId: string) {
  await mudarSituacao(osId, 'em_diagnostico')
  await mudarSituacao(osId, 'orcamento_enviado')
  await mudarSituacao(osId, 'aprovado')
  await mudarSituacao(osId, 'em_execucao')
}

test('concluir baixa do estoque exatamente as peças lançadas', async () => {
  const { osId, peca, servico } = await cenarioOs()
  await registrarMovimento({ pecaId: peca.id, tipo: 'entrada_compra', quantidade: 10 })
  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 2, precoUnitarioCentavos: 3800 })
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  await ateExecucao(osId)

  await mudarSituacao(osId, 'pronto')

  expect(await saldoDaPeca(peca.id)).toBe(8)
})

test('item de serviço não movimenta estoque', async () => {
  const { osId, servico, peca } = await cenarioOs()
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  await ateExecucao(osId)

  await mudarSituacao(osId, 'pronto')

  expect(await saldoDaPeca(peca.id)).toBe(0)
})

test('reabrir a OS estorna os movimentos dela', async () => {
  const { osId, peca } = await cenarioOs()
  await registrarMovimento({ pecaId: peca.id, tipo: 'entrada_compra', quantidade: 10 })
  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 3, precoUnitarioCentavos: 3800 })
  await ateExecucao(osId)
  await mudarSituacao(osId, 'pronto')

  await mudarSituacao(osId, 'em_execucao', { observacao: 'Voltou com defeito' })

  expect(await saldoDaPeca(peca.id)).toBe(10)
})

test('concluir de novo baixa a lista corrente, não a antiga', async () => {
  const { osId, peca } = await cenarioOs()
  await registrarMovimento({ pecaId: peca.id, tipo: 'entrada_compra', quantidade: 10 })
  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 3, precoUnitarioCentavos: 3800 })
  await ateExecucao(osId)
  await mudarSituacao(osId, 'pronto')
  await mudarSituacao(osId, 'em_execucao')

  // Troca a quantidade e conclui outra vez.
  const os = await obterOs(osId)
  await removerItem(os!.itens[0].id)
  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 1, precoUnitarioCentavos: 3800 })
  await mudarSituacao(osId, 'pronto')

  expect(await saldoDaPeca(peca.id)).toBe(9)
})

test('a baixa deixa o saldo negativo em vez de bloquear', async () => {
  const { osId, peca } = await cenarioOs()
  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 2, precoUnitarioCentavos: 3800 })
  await ateExecucao(osId)

  const r = await mudarSituacao(osId, 'pronto')

  expect(r.ok).toBe(true)
  expect(await saldoDaPeca(peca.id)).toBe(-2)
})

test('reabrir duas vezes não estorna em dobro', async () => {
  const { osId, peca } = await cenarioOs()
  await registrarMovimento({ pecaId: peca.id, tipo: 'entrada_compra', quantidade: 10 })
  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 2, precoUnitarioCentavos: 3800 })
  await ateExecucao(osId)

  await mudarSituacao(osId, 'pronto')
  await mudarSituacao(osId, 'em_execucao')
  await mudarSituacao(osId, 'pronto')
  await mudarSituacao(osId, 'em_execucao')

  expect(await saldoDaPeca(peca.id)).toBe(10)
})
