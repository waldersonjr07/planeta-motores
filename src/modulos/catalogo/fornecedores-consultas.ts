import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { fornecedores } from '@/db/schema'

export async function listarFornecedores(incluirInativos = false) {
  if (incluirInativos) {
    return db.select().from(fornecedores).orderBy(asc(fornecedores.nome))
  }
  return db
    .select()
    .from(fornecedores)
    .where(eq(fornecedores.ativo, true))
    .orderBy(asc(fornecedores.nome))
}

export async function obterFornecedor(id: string) {
  const [linha] = await db
    .select()
    .from(fornecedores)
    .where(eq(fornecedores.id, id))
    .limit(1)
  return linha ?? null
}
