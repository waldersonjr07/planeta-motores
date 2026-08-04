import { beforeEach, expect, test } from 'vitest'
import { gerarDocumento } from '../../src/modulos/documentos/pdf'
import { registrarPagamento } from '../../src/modulos/financeiro/operacoes'
import { adicionarItem, mudarSituacao } from '../../src/modulos/os/operacoes'
import { limparBanco } from '../ajuda/banco'
import { cenarioOs } from '../ajuda/os'

beforeEach(limparBanco)

async function osOrcada() {
  const cenario = await cenarioOs()
  await adicionarItem(cenario.osId, {
    tipo: 'servico',
    referenciaId: cenario.servico.id,
    quantidade: 1,
  })
  await adicionarItem(cenario.osId, {
    tipo: 'peca',
    referenciaId: cenario.peca.id,
    quantidade: 2,
    precoUnitarioCentavos: 3800,
  })
  await mudarSituacao(cenario.osId, 'em_diagnostico')
  await mudarSituacao(cenario.osId, 'orcamento_enviado')
  return cenario
}

test('gera o comprovante de recebimento como PDF de verdade', async () => {
  const { osId, numero } = await cenarioOs()

  const documento = await gerarDocumento('comprovante', osId)

  expect(documento).not.toBeNull()
  expect(documento!.conteudo.subarray(0, 5).toString()).toBe('%PDF-')
  expect(documento!.nomeArquivo).toBe(`comprovante-${numero}.pdf`)
})

test('gera o orçamento com conteúdo proporcional aos itens', async () => {
  const { osId } = await osOrcada()

  const orcamento = await gerarDocumento('orcamento', osId)
  const comprovante = await gerarDocumento('comprovante', osId)

  expect(orcamento!.conteudo.subarray(0, 5).toString()).toBe('%PDF-')
  // O orçamento tem duas tabelas e o bloco de totais; é maior que o comprovante.
  expect(orcamento!.conteudo.length).toBeGreaterThan(comprovante!.conteudo.length)
})

test('gera o recibo depois do pagamento', async () => {
  const { osId } = await osOrcada()
  await registrarPagamento({
    osId,
    valorCentavos: 5000,
    forma: 'pix',
    data: '2026-07-30',
    observacao: null,
  })

  const recibo = await gerarDocumento('recibo', osId)

  expect(recibo!.conteudo.subarray(0, 5).toString()).toBe('%PDF-')
  expect(recibo!.nomeArquivo).toMatch(/^recibo-\d{4}-\d{4}\.pdf$/)
})

test('OS inexistente não gera documento', async () => {
  expect(await gerarDocumento('orcamento', '00000000-0000-0000-0000-000000000000')).toBeNull()
})
