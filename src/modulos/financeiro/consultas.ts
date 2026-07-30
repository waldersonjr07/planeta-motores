import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  clientes,
  compraItens,
  despesas,
  ordensServico,
  osItens,
  pagamentos,
} from '@/db/schema'
import { diasDesde } from '@/lib/datas'
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
const TOTAL_DA_OS = sql<string>`greatest(0, coalesce((
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

export type ContaAReceber = {
  osId: string
  numero: string
  clienteNome: string
  totalCentavos: number
  pagoCentavos: number
  saldoCentavos: number
  entregueEm: Date | null
  diasEmAberto: number
}

/**
 * Não é campo, é consulta: assim a lista de cobrança nunca fica desatualizada
 * em relação aos pagamentos lançados.
 */
export async function listarContasAReceber(): Promise<ContaAReceber[]> {
  const linhas = await db
    .select({
      osId: ordensServico.id,
      numero: ordensServico.numero,
      clienteNome: clientes.nome,
      entregueEm: ordensServico.entregueEm,
      recebidoEm: ordensServico.recebidoEm,
      total: TOTAL_DA_OS,
      pago: PAGO_DA_OS,
    })
    .from(ordensServico)
    .innerJoin(clientes, eq(clientes.id, ordensServico.clienteId))
    .orderBy(asc(ordensServico.entregueEm), asc(ordensServico.recebidoEm))

  return linhas
    .map((linha) => {
      const totalCentavos = Math.round(Number(linha.total))
      const pagoCentavos = Math.round(Number(linha.pago))
      const referencia = linha.entregueEm ?? linha.recebidoEm
      return {
        osId: linha.osId,
        numero: linha.numero,
        clienteNome: linha.clienteNome,
        totalCentavos,
        pagoCentavos,
        saldoCentavos: saldoDevedor(totalCentavos, pagoCentavos),
        entregueEm: linha.entregueEm,
        diasEmAberto: diasDesde(referencia),
      }
    })
    .filter((conta) => conta.saldoCentavos > 0)
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

  const [compras] = await db.execute<{ soma: string }>(sql`
    select coalesce(sum(ci.quantidade * ci.custo_unitario_centavos), 0) as soma
    from compra_itens ci
    join compras c on c.id = ci.compra_id
    where c.data >= ${de} and c.data <= ${ate}
  `)

  const [gastos] = await db
    .select({ soma: sql<string>`coalesce(sum(${despesas.valorCentavos}), 0)` })
    .from(despesas)
    .where(and(gte(despesas.data, de), lte(despesas.data, ate)))

  const entradasCentavos = Math.round(Number(entradas?.soma ?? 0))
  const comprasCentavos = Math.round(Number(compras?.soma ?? 0))
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
