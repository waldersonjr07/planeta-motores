import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { fornecedores, ordensServico, pecas } from '../../src/db/schema'
import { registrarCompra } from '../../src/modulos/compras/operacoes'
import {
  listarContasAReceber,
  listarPagamentosDaOs,
  resultadoDoPeriodo,
  resumoDeCobrancaDaOs,
} from '../../src/modulos/financeiro/consultas'
import {
  registrarDespesa,
  registrarPagamento,
  removerPagamento,
} from '../../src/modulos/financeiro/operacoes'
import { adicionarItem, mudarSituacao } from '../../src/modulos/os/operacoes'
import { limparBanco } from '../ajuda/banco'
import { cenarioOs } from '../ajuda/os'

beforeEach(limparBanco)

/** OS com um serviço de R$ 210,00 lançado, pronta para receber pagamento. */
async function osComValor() {
  const cenario = await cenarioOs()
  await adicionarItem(cenario.osId, {
    tipo: 'servico',
    referenciaId: cenario.servico.id,
    quantidade: 1,
  })
  return cenario
}

async function entregar(osId: string) {
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
}

test('OS com itens e sem pagamento fica em aberto', async () => {
  const { osId } = await osComValor()

  const resumo = await resumoDeCobrancaDaOs(osId)

  expect(resumo.totalCentavos).toBe(21000)
  expect(resumo.pagoCentavos).toBe(0)
  expect(resumo.saldoCentavos).toBe(21000)
  expect(resumo.condicao).toBe('em_aberto')
})

test('sinal deixa a cobrança parcial e reduz o saldo', async () => {
  const { osId } = await osComValor()

  await registrarPagamento({
    osId,
    valorCentavos: 5000,
    forma: 'pix',
    data: '2026-07-30',
    observacao: 'Sinal para comprar peça',
  })

  const resumo = await resumoDeCobrancaDaOs(osId)
  expect(resumo.pagoCentavos).toBe(5000)
  expect(resumo.saldoCentavos).toBe(16000)
  expect(resumo.condicao).toBe('parcial')
})

test('vários pagamentos somam e quitam a OS', async () => {
  const { osId } = await osComValor()

  await registrarPagamento({ osId, valorCentavos: 5000, forma: 'pix', data: '2026-07-30', observacao: null })
  await registrarPagamento({
    osId,
    valorCentavos: 16000,
    forma: 'dinheiro',
    data: '2026-08-05',
    observacao: null,
  })

  const resumo = await resumoDeCobrancaDaOs(osId)
  expect(resumo.saldoCentavos).toBe(0)
  expect(resumo.condicao).toBe('quitada')
  expect(await listarPagamentosDaOs(osId)).toHaveLength(2)
})

test('pagamento acima do saldo é recusado com o saldo na mensagem', async () => {
  const { osId } = await osComValor()
  await registrarPagamento({ osId, valorCentavos: 5000, forma: 'pix', data: '2026-07-30', observacao: null })

  const r = await registrarPagamento({
    osId,
    valorCentavos: 20000,
    forma: 'pix',
    data: '2026-07-30',
    observacao: null,
  })

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('O pagamento passa do saldo devedor, que é de R$ 160,00.')
  expect((await resumoDeCobrancaDaOs(osId)).pagoCentavos).toBe(5000)
})

test('pagamento em OS sem valor lançado é recusado', async () => {
  const { osId } = await cenarioOs()

  const r = await registrarPagamento({
    osId,
    valorCentavos: 1000,
    forma: 'pix',
    data: '2026-07-30',
    observacao: null,
  })

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Esta ordem de serviço ainda não tem valor lançado.')
})

test('remover pagamento devolve o saldo', async () => {
  const { osId } = await osComValor()
  const r = await registrarPagamento({
    osId,
    valorCentavos: 21000,
    forma: 'pix',
    data: '2026-07-30',
    observacao: null,
  })
  if (!r.ok) throw new Error('pagamento falhou')

  await removerPagamento(r.dados.id)

  expect((await resumoDeCobrancaDaOs(osId)).condicao).toBe('em_aberto')
})

test('contas a receber traz só OS com saldo, e some quando quita', async () => {
  const { osId } = await osComValor()
  await entregar(osId)

  const antes = await listarContasAReceber()
  expect(antes).toHaveLength(1)
  expect(antes[0].saldoCentavos).toBe(21000)
  expect(antes[0].diasEmAberto).toBe(0)

  await registrarPagamento({
    osId,
    valorCentavos: 21000,
    forma: 'dinheiro',
    data: '2026-07-30',
    observacao: null,
  })

  expect(await listarContasAReceber()).toHaveLength(0)
})

test('OS sem valor nenhum não aparece em contas a receber', async () => {
  const { osId } = await cenarioOs()
  await mudarSituacao(osId, 'em_diagnostico')

  expect(await listarContasAReceber()).toHaveLength(0)
})

test('o resultado do período soma pagamentos contra compras e despesas', async () => {
  const { osId } = await osComValor()
  const [fornecedor] = await db.insert(fornecedores).values({ nome: 'Rio Claro' }).returning()
  const [peca] = await db.insert(pecas).values({ nome: 'Kit' }).returning()

  await registrarPagamento({
    osId,
    valorCentavos: 21000,
    forma: 'pix',
    data: '2026-07-15',
    observacao: null,
  })
  await registrarCompra({
    fornecedorId: fornecedor.id,
    data: '2026-07-10',
    itens: [{ pecaId: peca.id, quantidade: 2, custoUnitarioCentavos: 3000 }],
  })
  await registrarDespesa({
    data: '2026-07-20',
    categoria: 'energia',
    descricao: 'Conta de luz',
    valorCentavos: 4000,
  })

  const resultado = await resultadoDoPeriodo('2026-07-01', '2026-07-31')

  expect(resultado.entradasCentavos).toBe(21000)
  expect(resultado.comprasCentavos).toBe(6000)
  expect(resultado.despesasCentavos).toBe(4000)
  expect(resultado.saidasCentavos).toBe(10000)
  expect(resultado.resultadoCentavos).toBe(11000)
})

test('lançamento fora do período fica de fora', async () => {
  const { osId } = await osComValor()
  await registrarPagamento({
    osId,
    valorCentavos: 21000,
    forma: 'pix',
    data: '2026-08-02',
    observacao: null,
  })
  await registrarDespesa({
    data: '2026-06-30',
    categoria: 'outros',
    descricao: 'Fora do mês',
    valorCentavos: 5000,
  })

  const resultado = await resultadoDoPeriodo('2026-07-01', '2026-07-31')

  expect(resultado.entradasCentavos).toBe(0)
  expect(resultado.despesasCentavos).toBe(0)
  expect(resultado.resultadoCentavos).toBe(0)
})

test('o resultado pode ser negativo', async () => {
  await registrarDespesa({
    data: '2026-07-05',
    categoria: 'ferramenta',
    descricao: 'Torquímetro',
    valorCentavos: 45000,
  })

  const resultado = await resultadoDoPeriodo('2026-07-01', '2026-07-31')

  expect(resultado.resultadoCentavos).toBe(-45000)
})

test('desconto na OS reduz o total cobrado', async () => {
  const { osId } = await osComValor()
  await db
    .update(ordensServico)
    .set({ descontoCentavos: 1000 })
    .where(eq(ordensServico.id, osId))

  expect((await resumoDeCobrancaDaOs(osId)).totalCentavos).toBe(20000)
})
