import { expect, test, type Page } from '@playwright/test'
import { db } from '../../src/db'
import { despesas } from '../../src/db/schema'
import { prepararSessao } from './ajuda'

/**
 * A prova de que Server Action não é rota privada por acidente.
 *
 * O ataque reproduzido aqui é o envio que um navegador sem JavaScript faria:
 * um POST comum para o caminho da página, com o id da ação nos campos
 * escondidos do formulário. Não precisa de token, nem de sessão, nem de nada
 * que só o navegador da Lucilene tenha — o id da ação vem do código e é
 * estável por build.
 *
 * Antes da correção este mesmo envio gravava a despesa no banco. O primeiro
 * teste dispara munição de verdade (com sessão, grava) justamente para que os
 * outros dois não possam passar por engano: se o envio deixasse de funcionar,
 * o teste do envio autorizado quebraria antes.
 */

const DESCRICAO = 'INVASAO SEM SESSAO'

/** Campos que o navegador mandaria: os escondidos do formulário + o que foi digitado. */
type Campos = Record<string, string>

function desescapar(texto: string): string {
  return texto
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

/**
 * Lê a tela de despesas com a sessão da Lucilene e monta o envio do formulário
 * de despesa — inclusive os campos escondidos em que o React põe o id da ação.
 */
async function envioDaDespesa(pagina: Page): Promise<Campos> {
  const html = await (await pagina.request.get('/financeiro')).text()

  const formularios = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)].map((m) => m[0])
  const alvo = formularios.find((f) => f.includes('name="valor"'))
  expect(alvo, 'formulário de despesa na tela de financeiro').toBeTruthy()

  const campos: Campos = {}
  for (const escondido of (alvo as string).matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const nome = /name="([^"]+)"/.exec(escondido[0])?.[1]
    if (!nome) continue
    campos[nome] = desescapar(/value="([^"]*)"/.exec(escondido[0])?.[1] ?? '')
  }
  // Sem nenhum campo escondido não há id de ação, e o envio abaixo não seria
  // um ataque de verdade — seria um POST qualquer.
  expect(Object.keys(campos).length).toBeGreaterThan(0)

  return {
    ...campos,
    data: '2026-08-14',
    categoria: 'outros',
    descricao: DESCRICAO,
    valor: '1,00',
  }
}

async function despesasGravadas(): Promise<number> {
  return (await db.select().from(despesas)).length
}

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)
})

test('o envio da despesa é munição de verdade: com sessão, grava', async ({
  page,
  baseURL,
}) => {
  const campos = await envioDaDespesa(page)

  const resposta = await page.request.post('/financeiro', {
    multipart: campos,
    headers: { origin: baseURL! },
    // Sem seguir redirecionamento: o que interessa é a primeira resposta, e um
    // 307 reenviaria o POST inteiro para o destino.
    maxRedirects: 0,
  })

  expect(resposta.status()).toBeLessThan(400)
  expect(await despesasGravadas()).toBe(1)
})

test('o mesmo envio sem cookie de sessão é recusado e não grava nada', async ({
  page,
  request,
  baseURL,
}) => {
  const campos = await envioDaDespesa(page)

  /*
   * `request` é um contexto próprio, sem os cookies do navegador: é o estranho
   * na internet, que nunca entrou. O `origin` vai casado com o host de
   * propósito — quem ataca escolhe os próprios cabeçalhos, e a conferência de
   * origem que o Next faz sozinho não é a defesa que se está medindo aqui.
   */
  const resposta = await request.post('/financeiro', {
    multipart: campos,
    headers: { origin: baseURL! },
    maxRedirects: 0,
  })

  // O que importa primeiro: o banco não mexeu.
  expect(await despesasGravadas()).toBe(0)
  // 403 vem do middleware, antes de a aplicação acordar.
  expect(resposta.status()).toBe(403)
})

test('com cookie forjado, passa pelo middleware e a ação recusa mesmo assim', async ({
  page,
  request,
  baseURL,
}) => {
  const campos = await envioDaDespesa(page)

  /*
   * O middleware só sabe se existe cookie — um valor inventado passa por ele.
   * Quem confere o token contra o banco é o `exigirUsuario()` na primeira
   * linha da ação. É esta camada que este caso mede.
   */
  const resposta = await request.post('/financeiro', {
    multipart: campos,
    headers: {
      origin: baseURL!,
      cookie: 'pm_sessao=token-inventado-por-quem-nunca-entrou',
    },
    maxRedirects: 0,
  })

  expect(await despesasGravadas()).toBe(0)
  // A ação não roda: cai no `redirect('/entrar')` da guarda.
  const paraOLogin =
    resposta.status() === 403 ||
    (resposta.headers().location ?? '').includes('/entrar') ||
    (await resposta.text()).includes('/entrar')
  expect(paraOLogin, `resposta ${resposta.status()} deveria mandar para o login`).toBe(true)
})
