import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { pecas } from '@/db/schema'

export async function listarPecas(incluirInativas = false) {
  if (incluirInativas) {
    return db.select().from(pecas).orderBy(asc(pecas.nome))
  }
  return db.select().from(pecas).where(eq(pecas.ativo, true)).orderBy(asc(pecas.nome))
}

export async function obterPeca(id: string) {
  const [linha] = await db.select().from(pecas).where(eq(pecas.id, id)).limit(1)
  return linha ?? null
}
