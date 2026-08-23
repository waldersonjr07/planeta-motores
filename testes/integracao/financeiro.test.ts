import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { fornecedores, ordensServico, pecas } from '../../src/db/schema'
import { registrarCompra } from '../../src/modulos/compras/operacoes'
import {
  listarCobrancas,
  listarDespesas,
  listarPagamentosDaOs,
  resultadoDoPeriodo,
  resumoDeCobrancaDaOs,
} from '../../src/modulos/financeiro/consultas'
import { entradaDespesa } from '../../src/modulos/financeiro/esquemas'
import {
  registrarDespesa,
  registrarPagamento,
  removerPagamento,
} from '../../src/modulos/financeiro/operacoes'
import { limparBanco } from '../ajuda/banco'
import { cenarioOs, levarAte, osComValor } from '../ajuda/os'

beforeEach(limparBanco)

/** Dias atrás em milissegundos, para carimbar data no passado. */
function diasAtras(dias: number): Date {
  return new Date(Date.now() - dias * 86_400_000)
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

test('serviço entregue e não pago é dívida, e some quando quita', async () => {
  const { osId } = await osComValor()
  await levarAte(osId, 'entregue')

  const antes = await listarCobrancas()
  expect(antes.aguardandoPagamento).toHaveLength(1)
  expect(antes.aguardandoPagamento[0].saldoCentavos).toBe(21000)
  expect(antes.aguardandoPagamento[0].diasEmAberto).toBe(0)
  expect(antes.emAndamento).toHaveLength(0)

  await registrarPagamento({
    osId,
    valorCentavos: 21000,
    forma: 'dinheiro',
    data: '2026-07-30',
    observacao: null,
  })

  expect((await listarCobrancas()).aguardandoPagamento).toHaveLength(0)
})

test('serviço concluído e ainda não retirado também é dívida', async () => {
  const { osId } = await osComValor()
  await levarAte(osId, 'pronto')

  const cobrancas = await listarCobrancas()

  expect(cobrancas.aguardandoPagamento).toHaveLength(1)
  expect(cobrancas.emAndamento).toHaveLength(0)
})

test('OS sem valor nenhum não aparece em cobrança', async () => {
  const { osId } = await cenarioOs()
  await levarAte(osId, 'pronto')

  const cobrancas = await listarCobrancas()

  expect(cobrancas.aguardandoPagamento).toHaveLength(0)
  expect(cobrancas.emAndamento).toHaveLength(0)
})

/** O defeito relatado: serviço recusado não é dívida do cliente. */
test('OS cancelada sai da cobrança, mesmo com valor lançado', async () => {
  const { osId } = await osComValor()
  await levarAte(osId, 'cancelado')

  const cobrancas = await listarCobrancas()

  expect(cobrancas.aguardandoPagamento).toHaveLength(0)
  expect(cobrancas.emAndamento).toHaveLength(0)
})

test('serviço aprovado e em curso é previsão, não dívida', async () => {
  for (const situacao of ['aprovado', 'aguardando_peca', 'em_execucao'] as const) {
    await limparBanco()
    const { osId } = await osComValor()
    await levarAte(osId, situacao)

    const cobrancas = await listarCobrancas()

    expect(cobrancas.emAndamento).toHaveLength(1)
    expect(cobrancas.emAndamento[0].saldoCentavos).toBe(21000)
    expect(cobrancas.aguardandoPagamento).toHaveLength(0)
  }
})

/**
 * Nada foi combinado ainda. Orçamento enviado e sem resposta engordava o total
 * em aberto com dinheiro que ninguém prometeu pagar.
 */
test('o que ainda não foi combinado fica fora dos dois blocos', async () => {
  for (const situacao of ['recebido', 'em_diagnostico', 'orcamento_enviado'] as const) {
    await limparBanco()
    const { osId } = await osComValor()
    await levarAte(osId, situacao)

    const cobrancas = await listarCobrancas()

    expect(cobrancas.aguardandoPagamento).toHaveLength(0)
    expect(cobrancas.emAndamento).toHaveLength(0)
  }
})

test('o que não vai acontecer fica fora dos dois blocos', async () => {
  for (const situacao of ['recusado', 'devolvido'] as const) {
    await limparBanco()
    const { osId } = await osComValor()
    await levarAte(osId, situacao)

    const cobrancas = await listarCobrancas()

    expect(cobrancas.aguardandoPagamento).toHaveLength(0)
    expect(cobrancas.emAndamento).toHaveLength(0)
  }
})

/**
 * `recebidoEm` é a data de chegada do equipamento. Usá-la como referência
 * inflaria o envelhecimento justamente na coluna que decide quem cobrar
 * primeiro.
 */
test('DIAS conta da conclusão, não da chegada do equipamento', async () => {
  const { osId } = await osComValor()
  await levarAte(osId, 'pronto')
  await db
    .update(ordensServico)
    .set({ recebidoEm: diasAtras(10), concluidoEm: diasAtras(2) })
    .where(eq(ordensServico.id, osId))

  const [conta] = (await listarCobrancas()).aguardandoPagamento

  expect(conta.diasEmAberto).toBe(2)
})

test('OS entregue sem carimbo de conclusão cai na data de entrega', async () => {
  const { osId } = await osComValor()
  await levarAte(osId, 'entregue')
  await db
    .update(ordensServico)
    .set({ concluidoEm: null, entregueEm: diasAtras(5) })
    .where(eq(ordensServico.id, osId))

  const [conta] = (await listarCobrancas()).aguardandoPagamento

  expect(conta.diasEmAberto).toBe(5)
})

/** Vazio é honesto; número errado não. */
test('sem conclusão nem entrega, DIAS fica vazio', async () => {
  const { osId } = await osComValor()
  await levarAte(osId, 'pronto')
  await db
    .update(ordensServico)
    .set({ concluidoEm: null, entregueEm: null })
    .where(eq(ordensServico.id, osId))

  const [conta] = (await listarCobrancas()).aguardandoPagamento

  expect(conta.diasEmAberto).toBeNull()
})

test('a lista de dívida vem da mais antiga para a mais recente', async () => {
  const antiga = await osComValor()
  await levarAte(antiga.osId, 'pronto')
  await db
    .update(ordensServico)
    .set({ concluidoEm: diasAtras(9) })
    .where(eq(ordensServico.id, antiga.osId))

  const recente = await osComValor()
  await levarAte(recente.osId, 'pronto')

  const { aguardandoPagamento } = await listarCobrancas()

  expect(aguardandoPagamento.map((conta) => conta.osId)).toEqual([
    antiga.osId,
    recente.osId,
  ])
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

test('despesa "outros" sem descrição é aceita e grava nulo', async () => {
  const r = await registrarDespesa({
    data: '2026-08-11',
    categoria: 'outros',
    descricao: null,
    valorCentavos: 18000,
    fornecedorId: null,
  })

  expect(r.ok).toBe(true)
  const [lancada] = await listarDespesas({ de: '2026-08-01', ate: '2026-08-31' })
  expect(lancada.descricao).toBeNull()
  expect(lancada.valorCentavos).toBe(18000)
})

test('despesa de categoria conhecida também dispensa descrição', async () => {
  const r = await registrarDespesa({
    data: '2026-08-11',
    categoria: 'energia',
    descricao: null,
    valorCentavos: 34000,
    fornecedorId: null,
  })

  expect(r.ok).toBe(true)
})

test('descrição em branco vira nulo, não string vazia', () => {
  const analise = entradaDespesa.safeParse({
    data: '2026-08-11',
    categoria: 'outros',
    descricao: '   ',
    valorCentavos: 1000,
  })

  expect(analise.success).toBe(true)
  if (!analise.success) return
  expect(analise.data.descricao).toBeNull()
})
