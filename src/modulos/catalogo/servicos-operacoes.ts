import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { servicos } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import {
  paraEntradaServico,
  type EntradaServico,
  type EntradaServicoFormulario,
} from './servicos-esquemas'

function normalizar(entrada: EntradaServico | EntradaServicoFormulario): EntradaServico {
  return 'precoPadrao' in entrada ? paraEntradaServico(entrada) : entrada
}

export async function criarServico(
  entrada: EntradaServico | EntradaServicoFormulario,
): Promise<Resultado<{ id: string }>> {
  const [criado] = await db
    .insert(servicos)
    .values(normalizar(entrada))
    .returning({ id: servicos.id })
  return sucesso({ id: criado.id })
}

export async function atualizarServico(
  id: string,
  entrada: EntradaServico | EntradaServicoFormulario,
): Promise<Resultado<null>> {
  const alterados = await db
    .update(servicos)
    .set(normalizar(entrada))
    .where(eq(servicos.id, id))
    .returning({ id: servicos.id })

  if (alterados.length === 0) return falha('Serviço não encontrado.')
  return sucesso(null)
}

export async function definirAtivoServico(
  id: string,
  ativo: boolean,
): Promise<Resultado<null>> {
  const alterados = await db
    .update(servicos)
    .set({ ativo })
    .where(eq(servicos.id, id))
    .returning({ id: servicos.id })

  if (alterados.length === 0) return falha('Serviço não encontrado.')
  return sucesso(null)
}
