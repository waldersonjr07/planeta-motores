import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { pecas } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import { normalizarTexto } from '@/lib/texto'
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
 *
 * Nome que já existe devolve a peça existente em vez de cadastrar outra. É a
 * última defesa: o saldo de estoque é a soma dos movimentos de uma peça, e
 * duas linhas quase homônimas repartem esse saldo sem que a aplicação ofereça
 * jeito de fundi-las depois.
 *
 * A comparação corre em JavaScript sobre os candidatos trazidos do banco, e
 * não em SQL: comparar sem acento no Postgres pediria a extensão `unaccent`,
 * que este projeto não instala. O catálogo de uma oficina cabe em memória.
 */
export async function criarPecaMinima(
  nome: string,
  unidade: 'un' | 'L' | 'mL',
  tx?: Transacao,
): Promise<{ id: string }> {
  // `executor`, não `db`: dentro da transação a peça criada logo antes ainda
  // não foi confirmada, e uma conexão de fora não a enxergaria.
  const executor = tx ?? db

  const alvo = normalizarTexto(nome)
  const cadastradas = await executor.select({ id: pecas.id, nome: pecas.nome }).from(pecas)
  const existente = cadastradas.find((peca) => normalizarTexto(peca.nome) === alvo)
  if (existente) return { id: existente.id }

  const [criada] = await executor
    .insert(pecas)
    .values({ nome: nome.trim(), unidade })
    .returning({ id: pecas.id })
  return { id: criada.id }
}
