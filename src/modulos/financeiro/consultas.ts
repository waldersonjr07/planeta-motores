import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
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
