import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  clientes,
  compras,
  compraItens,
  despesas,
  fornecedores,
  ordensServico,
  osItens,
  pagamentos,
} from '@/db/schema'
import { diasDesde } from '@/lib/datas'
import type { SituacaoOs } from '@/modulos/os/situacoes'
import { condicaoDeCobranca, saldoDevedor, type CondicaoCobranca } from './cobranca'

/**
 * Total da OS somado no banco: itens × quantidade, menos o desconto.
 *
 * Os identificadores são escritos à mão, com apelido na tabela interna, porque
 * o Drizzle renderiza `${tabela.coluna}` sem qualificação dentro de um template
 * `sql`. Num subselect correlacionado isso vira `where "os_id" = "id"`, e o
 * `"id"` passa a resolver para a tabela de dentro — a correlação nunca casa e
 * o total volta zerado, silenciosamente.
 */
const TOTAL_DA_OS = sql<string>`max(0, coalesce((
  select sum(i.quantidade * i.preco_unitario_centavos)
  from os_itens i where i.os_id = ordens_servico.id
), 0) - ordens_servico.desconto_centavos)`

const PAGO_DA_OS = sql<string>`coalesce((
  select sum(p.valor_centavos)
  from pagamentos p where p.os_id = ordens_servico.id
), 0)`

export type ResumoCobranca = {
  totalCentavos: number
  pagoCentavos: number
  saldoCentavos: number
  condicao: CondicaoCobranca
}

export async function resumoDeCobrancaDaOs(osId: string): Promise<ResumoCobranca> {
  const [linha] = await db
    .select({ total: TOTAL_DA_OS, pago: PAGO_DA_OS })
    .from(ordensServico)
    .where(eq(ordensServico.id, osId))
    .limit(1)

  const totalCentavos = Math.round(Number(linha?.total ?? 0))
  const pagoCentavos = Math.round(Number(linha?.pago ?? 0))

  return {
    totalCentavos,
    pagoCentavos,
    saldoCentavos: saldoDevedor(totalCentavos, pagoCentavos),
    condicao: condicaoDeCobranca(totalCentavos, pagoCentavos),
  }
}

export async function listarPagamentosDaOs(osId: string) {
  return db
    .select()
    .from(pagamentos)
    .where(eq(pagamentos.osId, osId))
    .orderBy(asc(pagamentos.data), asc(pagamentos.criadoEm))
}

/**
 * Dívida de verdade: o serviço foi executado e não foi pago. É o único bloco
 * que soma no total em aberto.
 */
const AGUARDANDO_PAGAMENTO: SituacaoOs[] = ['pronto', 'entregue']

/**
 * Previsão de receita: o cliente aprovou e o trabalho ainda acontece. Nada
 * está atrasado aqui, então não soma no total em aberto e não tem coluna DIAS.
 */
const EM_ANDAMENTO: SituacaoOs[] = ['aprovado', 'aguardando_peca', 'em_execucao']

export type LinhaDeCobranca = {
  osId: string
  numero: string
  clienteNome: string
  totalCentavos: number
  pagoCentavos: number
  saldoCentavos: number
  /** Vazio quando a OS não tem conclusão nem entrega carimbadas. */
  diasEmAberto: number | null
}

export type Cobrancas = {
  aguardandoPagamento: LinhaDeCobranca[]
  emAndamento: LinhaDeCobranca[]
}

/**
 * Da mais antiga para a mais recente. `coalesce` na ordenação e não `nulls
 * last`: no bloco em andamento nenhuma das duas datas existe, e aí a chegada
 * do equipamento é a única antiguidade que há.
 */
const MAIS_ANTIGA_PRIMEIRO = sql`coalesce(
  ordens_servico.concluido_em, ordens_servico.entregue_em, ordens_servico.recebido_em
) asc`

async function cobrancasDe(situacoes: SituacaoOs[]): Promise<LinhaDeCobranca[]> {
  const linhas = await db
    .select({
      osId: ordensServico.id,
      numero: ordensServico.numero,
      clienteNome: clientes.nome,
      concluidoEm: ordensServico.concluidoEm,
      entregueEm: ordensServico.entregueEm,
      total: TOTAL_DA_OS,
      pago: PAGO_DA_OS,
    })
    .from(ordensServico)
    .innerJoin(clientes, eq(clientes.id, ordensServico.clienteId))
    .where(inArray(ordensServico.situacao, situacoes))
    .orderBy(MAIS_ANTIGA_PRIMEIRO)

  return linhas
    .map((linha) => {
      const totalCentavos = Math.round(Number(linha.total))
      const pagoCentavos = Math.round(Number(linha.pago))
      // Nunca `recebidoEm`: é a data de chegada do equipamento, e inflaria o
      // envelhecimento justamente na coluna que decide quem cobrar primeiro.
      const referencia = linha.concluidoEm ?? linha.entregueEm
      return {
        osId: linha.osId,
        numero: linha.numero,
        clienteNome: linha.clienteNome,
        totalCentavos,
        pagoCentavos,
        saldoCentavos: saldoDevedor(totalCentavos, pagoCentavos),
        diasEmAberto: referencia ? diasDesde(referencia) : null,
      }
    })
    .filter((conta) => conta.saldoCentavos > 0)
}

/**
 * Não é campo, é consulta: assim a lista de cobrança nunca fica desatualizada
 * em relação aos pagamentos lançados.
 *
 * Os dois blocos são separados de propósito. Misturar dívida com previsão numa
 * lista só era o erro do desenho anterior — e OS cancelada, recusada ou com
 * orçamento ainda sem resposta não é nem uma coisa nem outra: fica fora.
 */
export async function listarCobrancas(): Promise<Cobrancas> {
  const [aguardandoPagamento, emAndamento] = await Promise.all([
    cobrancasDe(AGUARDANDO_PAGAMENTO),
    cobrancasDe(EM_ANDAMENTO),
  ])

  return { aguardandoPagamento, emAndamento }
}

export function somarSaldo(contas: LinhaDeCobranca[]): number {
  return contas.reduce((soma, conta) => soma + conta.saldoCentavos, 0)
}

export async function listarDespesas(periodo: { de?: string; ate?: string } = {}) {
  const condicoes = []
  if (periodo.de) condicoes.push(gte(despesas.data, periodo.de))
  if (periodo.ate) condicoes.push(lte(despesas.data, periodo.ate))

  return db
    .select()
    .from(despesas)
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(despesas.data), desc(despesas.criadoEm))
}

export type ResultadoPeriodo = {
  entradasCentavos: number
  comprasCentavos: number
  despesasCentavos: number
  saidasCentavos: number
  resultadoCentavos: number
}

/**
 * Regime de caixa, sem pretensão contábil: responde "sobrou dinheiro esse
 * mês?", que é a pergunta que a Lucilene faz.
 */
export async function resultadoDoPeriodo(
  de: string,
  ate: string,
): Promise<ResultadoPeriodo> {
  const [entradas] = await db
    .select({ soma: sql<string>`coalesce(sum(${pagamentos.valorCentavos}), 0)` })
    .from(pagamentos)
    .where(and(gte(pagamentos.data, de), lte(pagamentos.data, ate)))

  const [totalCompras] = await db
    .select({
      soma: sql<string>`coalesce(sum(${compraItens.quantidade} * ${compraItens.custoUnitarioCentavos}), 0)`,
    })
    .from(compraItens)
    .innerJoin(compras, eq(compras.id, compraItens.compraId))
    .where(and(gte(compras.data, de), lte(compras.data, ate)))

  const [gastos] = await db
    .select({ soma: sql<string>`coalesce(sum(${despesas.valorCentavos}), 0)` })
    .from(despesas)
    .where(and(gte(despesas.data, de), lte(despesas.data, ate)))

  const entradasCentavos = Math.round(Number(entradas?.soma ?? 0))
  const comprasCentavos = Math.round(Number(totalCompras?.soma ?? 0))
  const despesasCentavos = Math.round(Number(gastos?.soma ?? 0))
  const saidasCentavos = comprasCentavos + despesasCentavos

  return {
    entradasCentavos,
    comprasCentavos,
    despesasCentavos,
    saidasCentavos,
    resultadoCentavos: entradasCentavos - saidasCentavos,
  }
}

export type LinhaPagamentoPeriodo = {
  id: string
  osId: string
  osNumero: string
  clienteNome: string
  valorCentavos: number
  forma: string
  data: string
  observacao: string | null
  criadoEm: Date
}

export async function listarPagamentosDoPeriodo(
  periodo: { de?: string; ate?: string } = {},
): Promise<LinhaPagamentoPeriodo[]> {
  const condicoes = []
  if (periodo.de) condicoes.push(gte(pagamentos.data, periodo.de))
  if (periodo.ate) condicoes.push(lte(pagamentos.data, periodo.ate))

  const linhas = await db
    .select({
      id: pagamentos.id,
      osId: pagamentos.osId,
      osNumero: ordensServico.numero,
      clienteNome: clientes.nome,
      valorCentavos: pagamentos.valorCentavos,
      forma: pagamentos.forma,
      data: pagamentos.data,
      observacao: pagamentos.observacao,
      criadoEm: pagamentos.criadoEm,
    })
    .from(pagamentos)
    .innerJoin(ordensServico, eq(ordensServico.id, pagamentos.osId))
    .innerJoin(clientes, eq(clientes.id, ordensServico.clienteId))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(pagamentos.data), desc(pagamentos.criadoEm))

  return linhas
}

export type LinhaCompraPeriodo = {
  id: string
  data: string
  totalCentavos: number
  fornecedorNome: string | null
  numeroDocumento: string | null
}

export async function listarComprasDoPeriodo(
  periodo: { de?: string; ate?: string } = {},
): Promise<LinhaCompraPeriodo[]> {
  const condicoes = []
  if (periodo.de) condicoes.push(gte(compras.data, periodo.de))
  if (periodo.ate) condicoes.push(lte(compras.data, periodo.ate))

  const linhas = await db
    .select({
      id: compras.id,
      data: compras.data,
      numeroDocumento: compras.numeroDocumento,
      fornecedorNome: fornecedores.nome,
      total: sql<string>`coalesce((
        select sum(ci.quantidade * ci.custo_unitario_centavos)
        from compra_itens ci where ci.compra_id = compras.id
      ), 0)`,
    })
    .from(compras)
    .leftJoin(fornecedores, eq(fornecedores.id, compras.fornecedorId))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(compras.data), desc(compras.criadoEm))

  return linhas.map((linha) => ({
    id: linha.id,
    data: linha.data,
    numeroDocumento: linha.numeroDocumento,
    fornecedorNome: linha.fornecedorNome,
    totalCentavos: Math.round(Number(linha.total)),
  }))
}

export type ItemFluxoCaixa = {
  id: string
  tipo: 'entrada' | 'saida'
  origem: 'pagamento' | 'despesa' | 'compra'
  data: string
  categoria: string
  descricao: string
  detalhe?: string
  valorCentavos: number
  link?: string
  removivel?: boolean
}

export async function listarFluxoDeCaixa(
  periodo: { de?: string; ate?: string } = {},
): Promise<ItemFluxoCaixa[]> {
  const [pagamentosLista, despesasLista, comprasLista] = await Promise.all([
    listarPagamentosDoPeriodo(periodo),
    listarDespesas(periodo),
    listarComprasDoPeriodo(periodo),
  ])

  const itens: ItemFluxoCaixa[] = []

  for (const pag of pagamentosLista) {
    itens.push({
      id: pag.id,
      tipo: 'entrada',
      origem: 'pagamento',
      data: pag.data,
      categoria: 'Recebimento de OS',
      descricao: `OS ${pag.osNumero} · ${pag.clienteNome}`,
      detalhe: pag.forma ? pag.forma.replace('_', ' ').toUpperCase() : undefined,
      valorCentavos: pag.valorCentavos,
      link: `/ordens-servico/${pag.osId}?aba=pagamentos`,
    })
  }

  for (const desp of despesasLista) {
    itens.push({
      id: desp.id,
      tipo: 'saida',
      origem: 'despesa',
      data: desp.data,
      categoria: desp.categoria,
      descricao: desp.descricao ? desp.descricao : 'Despesa operacional',
      valorCentavos: desp.valorCentavos,
      removivel: true,
    })
  }

  for (const comp of comprasLista) {
    itens.push({
      id: comp.id,
      tipo: 'saida',
      origem: 'compra',
      data: comp.data,
      categoria: 'Compra de peças',
      descricao: comp.fornecedorNome ? `Fornecedor: ${comp.fornecedorNome}` : 'Compra de peças p/ estoque',
      detalhe: comp.numeroDocumento ? `Doc: ${comp.numeroDocumento}` : undefined,
      valorCentavos: comp.totalCentavos,
      link: `/compras`,
    })
  }

  return itens.sort((a, b) => b.data.localeCompare(a.data))
}

