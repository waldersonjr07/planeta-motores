import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { clientes } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import type { EntradaCliente } from './esquemas'

const DOCUMENTO_DUPLICADO = 'Já existe cliente cadastrado com esse CPF/CNPJ.'

/**
 * Reconhece a violação do índice único de documento. O Drizzle embrulha o erro
 * do Postgres, então o código e o nome da restrição só aparecem descendo a
 * cadeia de `cause` — casar por texto da mensagem não funciona.
 */
function eDocumentoDuplicado(erro: unknown): boolean {
  const VIOLACAO_DE_UNICIDADE = '23505'
  for (let atual: unknown = erro; atual; atual = (atual as { cause?: unknown }).cause) {
    const candidato = atual as { code?: string; constraint_name?: string }
    if (
      candidato.code === VIOLACAO_DE_UNICIDADE &&
      candidato.constraint_name === 'clientes_documento_unico'
    ) {
      return true
    }
  }
  return false
}

export async function criarCliente(
  entrada: EntradaCliente,
): Promise<Resultado<{ id: string }>> {
  try {
    const [criado] = await db.insert(clientes).values(entrada).returning({ id: clientes.id })
    return sucesso({ id: criado.id })
  } catch (erro) {
    if (eDocumentoDuplicado(erro)) return falha(DOCUMENTO_DUPLICADO)
    throw erro
  }
}

export async function atualizarCliente(
  id: string,
  entrada: EntradaCliente,
): Promise<Resultado<null>> {
  try {
    const alterados = await db
      .update(clientes)
      .set({ ...entrada, atualizadoEm: new Date() })
      .where(eq(clientes.id, id))
      .returning({ id: clientes.id })

    if (alterados.length === 0) return falha('Cliente não encontrado.')
    return sucesso(null)
  } catch (erro) {
    if (eDocumentoDuplicado(erro)) return falha(DOCUMENTO_DUPLICADO)
    throw erro
  }
}

export async function definirAtivoCliente(
  id: string,
  ativo: boolean,
): Promise<Resultado<null>> {
  const alterados = await db
    .update(clientes)
    .set({ ativo, atualizadoEm: new Date() })
    .where(eq(clientes.id, id))
    .returning({ id: clientes.id })

  if (alterados.length === 0) return falha('Cliente não encontrado.')
  return sucesso(null)
}
