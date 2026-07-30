import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { servicos } from '@/db/schema'

export async function listarServicos(incluirInativos = false) {
  if (incluirInativos) {
    return db.select().from(servicos).orderBy(asc(servicos.nome))
  }
  return db.select().from(servicos).where(eq(servicos.ativo, true)).orderBy(asc(servicos.nome))
}

export async function obterServico(id: string) {
  const [linha] = await db.select().from(servicos).where(eq(servicos.id, id)).limit(1)
  return linha ?? null
}
