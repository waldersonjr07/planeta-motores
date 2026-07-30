import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { buscarUsuarioPorToken, type UsuarioSessao } from './sessao'

export const COOKIE_SESSAO = 'pm_sessao'

export async function usuarioAtual(): Promise<UsuarioSessao | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value
  if (!token) return null
  return buscarUsuarioPorToken(token)
}

/** Para uso em layout e página protegida: garante sessão ou manda para o login. */
export async function exigirUsuario(): Promise<UsuarioSessao> {
  const usuario = await usuarioAtual()
  if (!usuario) redirect('/entrar')
  return usuario
}
