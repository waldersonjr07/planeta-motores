import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { fornecedores } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import type { EntradaFornecedor } from './fornecedores-esquemas'

export async function criarFornecedor(
  entrada: EntradaFornecedor,
): Promise<Resultado<{ id: string }>> {
  const [criado] = await db
    .insert(fornecedores)
    .values(entrada)
    .returning({ id: fornecedores.id })
  return sucesso({ id: criado.id })
}

export async function atualizarFornecedor(
  id: string,
  entrada: EntradaFornecedor,
): Promise<Resultado<null>> {
  const alterados = await db
    .update(fornecedores)
    .set(entrada)
    .where(eq(fornecedores.id, id))
    .returning({ id: fornecedores.id })

  if (alterados.length === 0) return falha('Fornecedor não encontrado.')
  return sucesso(null)
}

export async function definirAtivoFornecedor(
  id: string,
  ativo: boolean,
): Promise<Resultado<null>> {
  const alterados = await db
    .update(fornecedores)
    .set({ ativo })
    .where(eq(fornecedores.id, id))
    .returning({ id: fornecedores.id })

  if (alterados.length === 0) return falha('Fornecedor não encontrado.')
  return sucesso(null)
}
