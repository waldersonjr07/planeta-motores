import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { equipamentos } from '@/db/schema'
import { descreverEquipamento } from './equipamentos-descricao'

export type EquipamentoComDescricao = typeof equipamentos.$inferSelect & {
  descricao: string
}

export async function listarEquipamentosDoCliente(
  clienteId: string,
  incluirInativos = false,
): Promise<EquipamentoComDescricao[]> {
  const condicoes = [eq(equipamentos.clienteId, clienteId)]
  if (!incluirInativos) condicoes.push(eq(equipamentos.ativo, true))

  const linhas = await db
    .select()
    .from(equipamentos)
    .where(and(...condicoes))
    .orderBy(asc(equipamentos.aplicacao), asc(equipamentos.marca))

  return linhas.map((linha) => ({ ...linha, descricao: descreverEquipamento(linha) }))
}

export async function obterEquipamento(id: string) {
  const [linha] = await db.select().from(equipamentos).where(eq(equipamentos.id, id)).limit(1)
  return linha ?? null
}
