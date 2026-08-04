import { eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { clientes, equipamentos } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import type { EntradaEquipamento } from './equipamentos-esquemas'
import type { EntradaCliente, EntradaClienteRapido } from './esquemas'

const DOCUMENTO_DUPLICADO = 'Já existe cliente cadastrado com esse CPF/CNPJ.'

/**
 * Data vinda do relógio do banco, não do Node. `criadoEm` já usa `defaultNow()`;
 * se a atualização usasse `new Date()`, os dois relógios poderiam divergir por
 * alguns milissegundos e a data de atualização sairia anterior à de criação.
 */
const AGORA = sql`now()`

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

/**
 * Cria cliente e equipamento numa transação só, para o cadastro rápido da
 * abertura de OS. Ou entram os dois, ou não entra nenhum — cliente sem motor
 * nenhum, criado por uma OS que falhou, seria lixo no cadastro.
 */
export async function criarClienteComEquipamento(entrada: {
  cliente: EntradaClienteRapido
  equipamento: Omit<EntradaEquipamento, 'clienteId'>
}): Promise<Resultado<{ clienteId: string; equipamentoId: string }>> {
  try {
    return await db.transaction(async (tx) => {
      const [cliente] = await tx
        .insert(clientes)
        .values(entrada.cliente)
        .returning({ id: clientes.id })

      const [equipamento] = await tx
        .insert(equipamentos)
        .values({ ...entrada.equipamento, clienteId: cliente.id })
        .returning({ id: equipamentos.id })

      return sucesso({ clienteId: cliente.id, equipamentoId: equipamento.id })
    })
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
      .set({ ...entrada, atualizadoEm: AGORA })
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
    .set({ ativo, atualizadoEm: AGORA })
    .where(eq(clientes.id, id))
    .returning({ id: clientes.id })

  if (alterados.length === 0) return falha('Cliente não encontrado.')
  return sucesso(null)
}
