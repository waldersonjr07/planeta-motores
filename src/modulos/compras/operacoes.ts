import { eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { compraItens, compras, pecas } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import { normalizarTexto } from '@/lib/texto'
import { criarFornecedorMinimo } from '@/modulos/catalogo/fornecedores-operacoes'
import { criarPecaMinima } from '@/modulos/catalogo/pecas-operacoes'
import { registrarMovimento } from '@/modulos/estoque/operacoes'
import type { EntradaCompra } from './esquemas'

export async function registrarCompra(
  entrada: EntradaCompra,
): Promise<Resultado<{ id: string }>> {
  if (entrada.itens.length === 0) return falha('Inclua ao menos uma peça na compra.')

  // Só os que vieram por id precisam existir; os digitados nascem aqui.
  const idsDePeca = [
    ...new Set(
      entrada.itens
        .map((item) => item.pecaId)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  if (idsDePeca.length > 0) {
    const encontradas = await db
      .select({ id: pecas.id })
      .from(pecas)
      .where(inArray(pecas.id, idsDePeca))
    if (encontradas.length !== idsDePeca.length) return falha('Peça não encontrada.')
  }

  return db.transaction(async (tx) => {
    const fornecedorId = entrada.fornecedorNome
      ? (await criarFornecedorMinimo(entrada.fornecedorNome, tx)).id
      : (entrada.fornecedorId ?? null)

    /*
     * A mesma peça digitada em duas linhas da compra é uma peça só. Sem esta
     * memória sairiam dois cadastros iguais e o saldo ficaria repartido.
     */
    const criadasPorNome = new Map<string, string>()
    const resolvidos: {
      pecaId: string
      quantidade: number
      custoUnitarioCentavos: number
    }[] = []

    for (const item of entrada.itens) {
      let pecaId = item.pecaId ?? null

      if (!pecaId && item.pecaNome) {
        const chave = normalizarTexto(item.pecaNome)
        pecaId = criadasPorNome.get(chave) ?? null
        if (!pecaId) {
          pecaId = (await criarPecaMinima(item.pecaNome, item.unidade ?? 'un', tx)).id
          criadasPorNome.set(chave, pecaId)
        }
      }

      if (!pecaId) throw new Error('Item de compra sem peça resolvida.')

      resolvidos.push({
        pecaId,
        quantidade: item.quantidade,
        custoUnitarioCentavos: item.custoUnitarioCentavos,
      })
    }

    const [compra] = await tx
      .insert(compras)
      .values({
        fornecedorId,
        osId: entrada.osId ?? null,
        data: entrada.data,
        numeroDocumento: entrada.numeroDocumento ?? null,
        observacoes: entrada.observacoes ?? null,
      })
      .returning({ id: compras.id })

    for (const item of resolvidos) {
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
