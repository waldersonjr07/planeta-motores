import { headers } from 'next/headers'

/** Quando não dá para saber o endereço, todo mundo cai no mesmo balde. */
export const ORIGEM_DESCONHECIDA = 'sem-endereco'

/**
 * De onde veio a requisição, para o freio de tentativas de login.
 *
 * Em produção quem responde é o Caddy, e ele **acrescenta** ao fim do
 * `X-Forwarded-For` o endereço que enxergou na conexão. O começo da lista é o
 * que o cliente mandou — e o cliente escolhe o que manda. Por isso vale o
 * último item, e não o primeiro: fosse o primeiro, bastaria inventar um
 * `X-Forwarded-For` diferente a cada tentativa para o freio nunca pegar.
 *
 * Fora de uma requisição (teste de unidade, script) não há cabeçalho nenhum;
 * aí o `headers()` estoura e a resposta é o balde comum.
 */
export async function origemDaRequisicao(): Promise<string> {
  try {
    const cabecalhos = await headers()

    const encaminhado = cabecalhos.get('x-forwarded-for')
    const cadeia = (encaminhado ?? '')
      .split(',')
      .map((parte) => parte.trim())
      .filter(Boolean)
    const ultimo = cadeia.at(-1)
    if (ultimo) return ultimo

    return cabecalhos.get('x-real-ip')?.trim() || ORIGEM_DESCONHECIDA
  } catch {
    return ORIGEM_DESCONHECIDA
  }
}
