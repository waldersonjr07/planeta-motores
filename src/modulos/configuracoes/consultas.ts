import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { configuracoes } from '@/db/schema'

export const LINHA_UNICA = 1

/**
 * Cria a linha na primeira leitura. Deixar a tabela vazia obrigaria toda tela
 * consumidora a tratar o caso "não configurado", que não existe de fato.
 */
export async function obterConfiguracoes() {
  const [existente] = await db
    .select()
    .from(configuracoes)
    .where(eq(configuracoes.id, LINHA_UNICA))
    .limit(1)
  if (existente) return existente

  const [criada] = await db
    .insert(configuracoes)
    .values({ id: LINHA_UNICA })
    .onConflictDoNothing()
    .returning()
  if (criada) return criada

  // Outra requisição criou a linha entre o select e o insert.
  const [linha] = await db
    .select()
    .from(configuracoes)
    .where(eq(configuracoes.id, LINHA_UNICA))
    .limit(1)
  return linha
}
