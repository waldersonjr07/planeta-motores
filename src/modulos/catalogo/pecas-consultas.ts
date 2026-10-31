import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { pecas } from '@/db/schema'

export async function listarPecas(incluirInativas = false) {
  const lista = incluirInativas
    ? await db.select().from(pecas)
    : await db.select().from(pecas).where(eq(pecas.ativo, true))

  return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
}

export async function obterPeca(id: string) {
  const [linha] = await db.select().from(pecas).where(eq(pecas.id, id)).limit(1)
  return linha ?? null
}
