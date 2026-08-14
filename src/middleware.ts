import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_SESSAO } from '@/modulos/auth/cookie'

/**
 * Porta da rua do sistema.
 *
 * O layout protege a renderização de página, mas não roda na invocação de uma
 * Server Action — que é um POST para o mesmo caminho, com o cabeçalho
 * `Next-Action` (ou, sem JavaScript, um envio de formulário com o id da ação
 * no corpo). O middleware roda em toda requisição, inclusive nessas.
 *
 * Aqui só dá para conferir a *presença* do cookie: o middleware roda no
 * runtime Edge, sem banco. Quem confere o cookie contra o banco é o
 * `exigirUsuario()` dentro de cada ação. São duas camadas de propósito: esta
 * derruba o estranho antes de a aplicação acordar; a de dentro é a que vale.
 */

/** Alcançáveis sem sessão — é por onde se entra. */
const PUBLICOS = ['/entrar']

function ehPublico(caminho: string): boolean {
  return PUBLICOS.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`))
}

export function middleware(requisicao: NextRequest) {
  const { pathname } = requisicao.nextUrl
  if (ehPublico(pathname)) return NextResponse.next()

  const token = requisicao.cookies.get(COOKIE_SESSAO)?.value
  if (token) return NextResponse.next()

  /*
   * Rota de API responde em status, não em página: quem chama é `fetch`, e um
   * redirecionamento viraria um HTML de login no lugar do PDF ou da foto.
   */
  if (pathname.startsWith('/api/')) {
    return new NextResponse('Não autorizado', { status: 401 })
  }

  /*
   * POST sem cookie é invocação de Server Action de quem nunca entrou.
   * Responder 303 para o login faria o navegador buscar a página de entrada e
   * o Next reclamar de resposta inesperada no meio da ação — erro confuso na
   * tela e mensagem nenhuma. 403 é a resposta honesta.
   */
  if (requisicao.method !== 'GET' && requisicao.method !== 'HEAD') {
    return new NextResponse('Não autorizado', { status: 403 })
  }

  return NextResponse.redirect(new URL('/entrar', requisicao.url))
}

export const config = {
  /*
   * Tudo, menos o que o navegador busca para desenhar a própria tela de
   * entrada: os pacotes do Next e os arquivos estáticos. Se o emblema caísse
   * aqui dentro, a tela de login pediria login para mostrar a marca.
   */
  matcher: [
    '/((?!_next/|favicon\\.ico|icon\\.jpeg|.*\\.(?:jpe?g|png|gif|svg|webp|avif|ico|css|js|map|woff2?|ttf|txt|xml|webmanifest)$).*)',
  ],
}
