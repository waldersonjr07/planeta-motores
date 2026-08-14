import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_SESSAO } from './cookie'
import { buscarUsuarioPorToken, type UsuarioSessao } from './sessao'

// Reexportado para não quebrar quem já importava a constante daqui. A
// definição mora em `cookie.ts` porque o middleware (Edge) também precisa dela.
export { COOKIE_SESSAO }

export async function usuarioAtual(): Promise<UsuarioSessao | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value
  if (!token) return null
  return buscarUsuarioPorToken(token)
}

/**
 * Garante sessão ou manda para o login.
 *
 * Vai no layout, na página protegida e — obrigatoriamente — na primeira linha
 * de toda Server Action. Layout não roda quando o navegador invoca uma Server
 * Action: a invocação é um POST para o mesmo caminho com o cabeçalho
 * `Next-Action`, que entra direto na função. Sem esta chamada lá dentro, a
 * ação escreve no banco para quem nunca entrou. O middleware barra quem não
 * tem cookie nenhum; é aqui que o cookie é conferido contra o banco.
 */
export async function exigirUsuario(): Promise<UsuarioSessao> {
  const usuario = await usuarioAtual()
  if (!usuario) redirect('/entrar')
  return usuario
}
