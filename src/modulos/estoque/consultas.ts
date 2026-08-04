import { asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { estoqueMovimentos, pecas } from '@/db/schema'

export type SaldoPeca = {
  id: string
  nome: string
  marca: string | null
  unidade: string
  controlaSaldo: boolean
  quantidadeMinima: number
  precoVendaCentavos: number
  saldo: number
  abaixoDoMinimo: boolean
}

const SOMA_SALDO = sql<string>`coalesce(sum(${estoqueMovimentos.quantidade}), 0)`

export async function saldoDaPeca(pecaId: string): Promise<number> {
  const [linha] = await db
    .select({ saldo: SOMA_SALDO })
    .from(estoqueMovimentos)
    .where(eq(estoqueMovimentos.pecaId, pecaId))
  return Number(linha?.saldo ?? 0)
}

export async function listarSaldos(): Promise<SaldoPeca[]> {
  const linhas = await db
    .select({
      id: pecas.id,
      nome: pecas.nome,
      marca: pecas.marca,
      unidade: pecas.unidade,
      controlaSaldo: pecas.controlaSaldo,
      quantidadeMinima: pecas.quantidadeMinima,
      precoVendaCentavos: pecas.precoVendaCentavos,
      saldo: SOMA_SALDO,
    })
    .from(pecas)
    .leftJoin(estoqueMovimentos, eq(estoqueMovimentos.pecaId, pecas.id))
    .where(eq(pecas.ativo, true))
    .groupBy(pecas.id)
    .orderBy(asc(pecas.nome))

  return linhas.map((linha) => {
    const saldo = Number(linha.saldo)
    const minimo = Number(linha.quantidadeMinima)
    return {
      ...linha,
      quantidadeMinima: minimo,
      saldo,
      abaixoDoMinimo: linha.controlaSaldo && saldo <= minimo,
    }
  })
}

/** Peça que controla saldo e chegou ao mínimo. Consulta, não notificação. */
export async function listarReposicao(): Promise<SaldoPeca[]> {
  return (await listarSaldos()).filter((peca) => peca.abaixoDoMinimo)
}

export async function listarMovimentosDaPeca(pecaId: string) {
  return db
    .select()
    .from(estoqueMovimentos)
    .where(eq(estoqueMovimentos.pecaId, pecaId))
    .orderBy(desc(estoqueMovimentos.criadoEm))
}
