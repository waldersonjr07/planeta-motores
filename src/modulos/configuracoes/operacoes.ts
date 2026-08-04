import { eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { configuracoes } from '@/db/schema'
import { sucesso, type Resultado } from '@/lib/resultado'
import { LINHA_UNICA, obterConfiguracoes } from './consultas'
import type { EntradaConfiguracoes } from './esquemas'

export async function salvarConfiguracoes(
  entrada: EntradaConfiguracoes,
): Promise<Resultado<null>> {
  await obterConfiguracoes() // garante a existência da linha
  await db
    .update(configuracoes)
    // Relógio do banco, o mesmo do `defaultNow()` da criação.
    .set({ ...entrada, atualizadoEm: sql`now()` })
    .where(eq(configuracoes.id, LINHA_UNICA))
  return sucesso(null)
}
