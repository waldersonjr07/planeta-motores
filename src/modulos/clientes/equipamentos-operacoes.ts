import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { clientes, equipamentos } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import type { EntradaEquipamento } from './equipamentos-esquemas'

async function clienteExiste(id: string): Promise<boolean> {
  const [linha] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.id, id))
    .limit(1)
  return Boolean(linha)
}

export async function criarEquipamento(
  entrada: EntradaEquipamento,
): Promise<Resultado<{ id: string }>> {
  // Checagem explícita em vez de deixar a chave estrangeira estourar: a tela
  // precisa da mensagem, não do erro do Postgres.
  if (!(await clienteExiste(entrada.clienteId))) return falha('Cliente não encontrado.')

  const [criado] = await db
    .insert(equipamentos)
    .values(entrada)
    .returning({ id: equipamentos.id })

  return sucesso({ id: criado.id })
}

export async function atualizarEquipamento(
  id: string,
  entrada: EntradaEquipamento,
): Promise<Resultado<null>> {
  if (!(await clienteExiste(entrada.clienteId))) return falha('Cliente não encontrado.')

  const alterados = await db
    .update(equipamentos)
    .set(entrada)
    .where(eq(equipamentos.id, id))
    .returning({ id: equipamentos.id })

  if (alterados.length === 0) return falha('Equipamento não encontrado.')
  return sucesso(null)
}

export async function definirAtivoEquipamento(
  id: string,
  ativo: boolean,
): Promise<Resultado<null>> {
  const alterados = await db
    .update(equipamentos)
    .set({ ativo })
    .where(eq(equipamentos.id, id))
    .returning({ id: equipamentos.id })

  if (alterados.length === 0) return falha('Equipamento não encontrado.')
  return sucesso(null)
}
