import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { compraItens, compras, fornecedores, ordensServico, pecas } from '@/db/schema'

export type CompraResumo = {
  id: string
  data: string
  fornecedorNome: string | null
  osNumero: string | null
  numeroDocumento: string | null
  totalCentavos: number
  quantidadeItens: number
}

const SOMA_ITENS = sql<string>`coalesce((
  select sum(${compraItens.quantidade} * ${compraItens.custoUnitarioCentavos})
  from ${compraItens}
  where ${compraItens.compraId} = ${compras.id}
), 0)`

export async function listarCompras(
  filtro: { de?: string; ate?: string } = {},
): Promise<CompraResumo[]> {
  const condicoes = []
  if (filtro.de) condicoes.push(sql`${compras.data} >= ${filtro.de}`)
  if (filtro.ate) condicoes.push(sql`${compras.data} <= ${filtro.ate}`)

  const linhas = await db
    .select({
      id: compras.id,
      data: compras.data,
      fornecedorNome: fornecedores.nome,
      osNumero: ordensServico.numero,
      numeroDocumento: compras.numeroDocumento,
      total: SOMA_ITENS,
      quantidadeItens: sql<number>`(
        select count(*)::int from ${compraItens}
        where ${compraItens.compraId} = ${compras.id}
      )`,
    })
    .from(compras)
    .leftJoin(fornecedores, eq(fornecedores.id, compras.fornecedorId))
    .leftJoin(ordensServico, eq(ordensServico.id, compras.osId))
    .where(condicoes.length ? sql.join(condicoes, sql` and `) : undefined)
    .orderBy(desc(compras.data), desc(compras.criadoEm))

  return linhas.map((linha) => ({
    id: linha.id,
    data: linha.data,
    fornecedorNome: linha.fornecedorNome,
    osNumero: linha.osNumero,
    numeroDocumento: linha.numeroDocumento,
    totalCentavos: Math.round(Number(linha.total)),
    quantidadeItens: linha.quantidadeItens,
  }))
}

export async function obterCompra(id: string) {
  const [compra] = await db.select().from(compras).where(eq(compras.id, id)).limit(1)
  if (!compra) return null

  const itens = await db
    .select({
      id: compraItens.id,
      pecaId: compraItens.pecaId,
      pecaNome: pecas.nome,
      quantidade: compraItens.quantidade,
      custoUnitarioCentavos: compraItens.custoUnitarioCentavos,
    })
    .from(compraItens)
    .innerJoin(pecas, eq(pecas.id, compraItens.pecaId))
    .where(eq(compraItens.compraId, id))

  const totalCentavos = itens.reduce(
    (soma, item) => soma + Math.round(Number(item.quantidade) * item.custoUnitarioCentavos),
    0,
  )

  return { ...compra, itens, totalCentavos }
}
