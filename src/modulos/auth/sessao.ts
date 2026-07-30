import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { db } from '@/db'
import { sessoes, usuarios } from '@/db/schema'

export type UsuarioSessao = { id: string; nome: string; email: string }

export const DURACAO_SESSAO_MS = 30 * 24 * 60 * 60 * 1000

function hashDoToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Cria a sessão e devolve o token em claro — que só existe aqui e no cookie. */
export async function criarSessao(usuarioId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await db.insert(sessoes).values({
    id: hashDoToken(token),
    usuarioId,
    expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS),
  })
  return token
}

export async function buscarUsuarioPorToken(token: string): Promise<UsuarioSessao | null> {
  const [linha] = await db
    .select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email })
    .from(sessoes)
    .innerJoin(usuarios, eq(usuarios.id, sessoes.usuarioId))
    .where(
      and(
        eq(sessoes.id, hashDoToken(token)),
        gt(sessoes.expiraEm, new Date()),
        eq(usuarios.ativo, true),
      ),
    )
    .limit(1)

  return linha ?? null
}

export async function encerrarSessao(token: string): Promise<void> {
  await db.delete(sessoes).where(eq(sessoes.id, hashDoToken(token)))
}
