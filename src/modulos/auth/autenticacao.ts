import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { usuarios } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import { verificarSenha } from './senha'
import { criarSessao } from './sessao'

const CREDENCIAL_INVALIDA = 'E-mail ou senha inválidos.'

/** Confere credenciais e abre a sessão. Devolve o token da sessão criada. */
export async function autenticar(
  email: string,
  senha: string,
): Promise<Resultado<string>> {
  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(and(eq(usuarios.email, email.trim().toLowerCase()), eq(usuarios.ativo, true)))
    .limit(1)

  if (!usuario) return falha(CREDENCIAL_INVALIDA)
  if (!(await verificarSenha(senha, usuario.senhaHash))) return falha(CREDENCIAL_INVALIDA)

  return sucesso(await criarSessao(usuario.id))
}
