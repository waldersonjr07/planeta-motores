import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { pecas } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import type { Transacao } from '@/modulos/estoque/operacoes'
import {
  paraEntradaPeca,
  type EntradaPeca,
  type EntradaPecaFormulario,
} from './pecas-esquemas'

/**
 * Distingue o que veio do formulário do que já está normalizado pela forma da
 * quantidade mínima: número no formulário, texto pronto para o `numeric`.
 * Precisa ser type guard: o TypeScript não estreita a união só pelo `typeof`
 * de uma propriedade.
 */
function ehDoFormulario(
  entrada: EntradaPeca | EntradaPecaFormulario,
): entrada is EntradaPecaFormulario {
  return typeof entrada.quantidadeMinima === 'number'
}

function normalizar(entrada: EntradaPeca | EntradaPecaFormulario): EntradaPeca {
  return ehDoFormulario(entrada) ? paraEntradaPeca(entrada) : entrada
}

export async function criarPeca(
  entrada: EntradaPeca | EntradaPecaFormulario,
): Promise<Resultado<{ id: string }>> {
  const [criada] = await db.insert(pecas).values(normalizar(entrada)).returning({ id: pecas.id })
  return sucesso({ id: criada.id })
}

export async function atualizarPeca(
  id: string,
  entrada: EntradaPeca | EntradaPecaFormulario,
): Promise<Resultado<null>> {
  const alteradas = await db
    .update(pecas)
    .set(normalizar(entrada))
    .where(eq(pecas.id, id))
    .returning({ id: pecas.id })

  if (alteradas.length === 0) return falha('Peça não encontrada.')
  return sucesso(null)
}

export async function definirAtivoPeca(id: string, ativo: boolean): Promise<Resultado<null>> {
  const alteradas = await db
    .update(pecas)
    .set({ ativo })
    .where(eq(pecas.id, id))
    .returning({ id: pecas.id })

  if (alteradas.length === 0) return falha('Peça não encontrada.')
  return sucesso(null)
}

/**
 * Cadastro na hora, feito de dentro da compra. Só o nome e a unidade — o resto
 * tem valor padrão na tabela, e a Lucilene completa depois em Estoque se a
 * peça passar a controlar saldo. Aceita transação para que a peça e a compra
 * entrem juntas ou não entrem.
 */
export async function criarPecaMinima(
  nome: string,
  unidade: 'un' | 'L' | 'mL',
  tx?: Transacao,
): Promise<{ id: string }> {
  const executor = tx ?? db
  const [criada] = await executor
    .insert(pecas)
    .values({ nome: nome.trim(), unidade })
    .returning({ id: pecas.id })
  return { id: criada.id }
}
