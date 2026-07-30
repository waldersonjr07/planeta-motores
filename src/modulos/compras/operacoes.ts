import { eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { compraItens, compras, pecas } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import { registrarMovimento } from '@/modulos/estoque/operacoes'
import type { EntradaCompra } from './esquemas'

export async function registrarCompra(
  entrada: EntradaCompra,
): Promise<Resultado<{ id: string }>> {
  if (entrada.itens.length === 0) return falha('Inclua ao menos uma peça na compra.')

  const idsDePeca = [...new Set(entrada.itens.map((item) => item.pecaId))]
  const encontradas = await db
    .select({ id: pecas.id })
    .from(pecas)
    .where(inArray(pecas.id, idsDePeca))
  if (encontradas.length !== idsDePeca.length) return falha('Peça não encontrada.')

  return db.transaction(async (tx) => {
    const [compra] = await tx
      .insert(compras)
      .values({
        fornecedorId: entrada.fornecedorId ?? null,
        osId: entrada.osId ?? null,
        data: entrada.data,
        numeroDocumento: entrada.numeroDocumento ?? null,
        observacoes: entrada.observacoes ?? null,
      })
      .returning({ id: compras.id })

    for (const item of entrada.itens) {
      await tx.insert(compraItens).values({
        compraId: compra.id,
        pecaId: item.pecaId,
        quantidade: item.quantidade.toFixed(3),
        custoUnitarioCentavos: item.custoUnitarioCentavos,
      })

      await registrarMovimento(
        {
          pecaId: item.pecaId,
          tipo: 'entrada_compra',
          quantidade: item.quantidade,
          referenciaTipo: 'compra',
          referenciaId: compra.id,
        },
        tx,
      )

      // Último custo conhecido: responde "quanto essa peça me custa hoje" sem
      // a complicação de custo médio ponderado, que este volume não justifica.
      await tx
        .update(pecas)
        .set({ ultimoCustoCentavos: item.custoUnitarioCentavos })
        .where(eq(pecas.id, item.pecaId))
    }

    return sucesso({ id: compra.id })
  })
}
