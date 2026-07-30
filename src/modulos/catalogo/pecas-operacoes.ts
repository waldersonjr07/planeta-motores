import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { pecas } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import {
  paraEntradaPeca,
  type EntradaPeca,
  type EntradaPecaFormulario,
} from './pecas-esquemas'

function normalizar(entrada: EntradaPeca | EntradaPecaFormulario): EntradaPeca {
  return 'precoVenda' in entrada ? paraEntradaPeca(entrada) : entrada
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
