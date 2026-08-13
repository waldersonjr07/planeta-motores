import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { fornecedores } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import type { Transacao } from '@/modulos/estoque/operacoes'
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

/** Cadastro na hora, feito de dentro da compra. Ver `criarPecaMinima`. */
export async function criarFornecedorMinimo(
  nome: string,
  tx?: Transacao,
): Promise<{ id: string }> {
  const executor = tx ?? db
  const [criado] = await executor
    .insert(fornecedores)
    .values({ nome: nome.trim() })
    .returning({ id: fornecedores.id })
  return { id: criado.id }
}
