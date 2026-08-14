/**
 * Freio das tentativas de login.
 *
 * Existe uma conta só neste sistema e o e-mail dela está escrito no README do
 * repositório. Sem freio, o formulário de entrada é um oráculo de senha
 * aberto à internet: dá para tentar sem parar até acertar.
 *
 * Mora na memória do processo de propósito. A aplicação roda numa instância
 * só (docker compose), então um `Map` já vale por todo o sistema — tabela no
 * banco ou dependência nova custariam mais do que resolvem, e o efeito de o
 * contador zerar quando o contêiner reinicia é o atacante ganhar mais cinco
 * tentativas de cada vez que a dona reinicia o sistema.
 *
 * Duas chaves, e é aqui que mora a decisão:
 *
 * - `conta|origem`: quem tenta ESTA conta a partir DESTE endereço. É o freio
 *   apertado, e é ele que pega o ataque dirigido.
 * - `origem`: tudo que sai de um endereço, com qualquer e-mail. Freio mais
 *   folgado, para quem varre e-mails em vez de insistir num só.
 *
 * O que NÃO existe é chave só de e-mail: ela travaria a conta da Lucilene
 * para o mundo inteiro assim que alguém resolvesse martelar o e-mail dela —
 * o atacante nem precisaria acertar a senha para deixá-la de fora do próprio
 * sistema. Com o endereço dentro das duas chaves, o bloqueio cai em quem
 * martela, e ela continua entrando da oficina.
 */

/** Erros seguidos na mesma conta, do mesmo endereço, antes de o freio pegar. */
export const LIMITE_POR_CONTA = 5

/**
 * Idem, para tudo que sai de um endereço. Mais folgado que o de conta porque
 * é o freio de fora: quem erra a senha da própria conta cai antes no outro.
 */
export const LIMITE_POR_ORIGEM = 10

/**
 * Cinco erros é generoso para quem digita a própria senha — cabe maiúscula
 * presa, acento e teclado trocado, com sobra. Para quem adivinha, é nada:
 * depois do quinto, a espera cresce e o número de tentativas por hora despenca
 * para menos de dez, contra um hash Argon2id. Ataque em linha morre aí.
 */
const ESPERAS_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]

/** Sem erro novo por um dia, o registro é esquecido e tudo recomeça do zero. */
const ESQUECIMENTO_MS = 24 * 60 * 60 * 1000

type Registro = { falhas: number; bloqueadoAte: number; ultimaFalha: number }

/** Chave e o limite que vale para ela. */
export type Alvo = { chave: string; limite: number }

const registros = new Map<string, Registro>()

/** As duas chaves de uma tentativa. O e-mail entra normalizado, como no banco. */
export function chavesDaTentativa(email: string, origem: string): Alvo[] {
  const conta = email.trim().toLowerCase()
  return [
    { chave: `conta:${conta}|origem:${origem}`, limite: LIMITE_POR_CONTA },
    { chave: `origem:${origem}`, limite: LIMITE_POR_ORIGEM },
  ]
}

/** Impede que o mapa cresça sem fim com endereço que passou uma vez e sumiu. */
function esquecerAntigos(agora: number): void {
  for (const [chave, registro] of registros) {
    const parado = agora - registro.ultimaFalha > ESQUECIMENTO_MS
    if (parado && registro.bloqueadoAte <= agora) registros.delete(chave)
  }
}

/** Quanto falta do bloqueio, em milissegundos. Zero quando pode tentar. */
export function esperaRestanteMs(alvos: Alvo[], agora: number = Date.now()): number {
  let maior = 0
  for (const { chave } of alvos) {
    const registro = registros.get(chave)
    if (registro && registro.bloqueadoAte > agora) {
      maior = Math.max(maior, registro.bloqueadoAte - agora)
    }
  }
  return maior
}

/**
 * Conta mais um erro. Cada erro depois do limite empurra a espera um degrau
 * acima — quem insiste espera mais, até o teto de uma hora.
 */
export function registrarFalha(alvos: Alvo[], agora: number = Date.now()): void {
  esquecerAntigos(agora)

  for (const { chave, limite } of alvos) {
    const registro = registros.get(chave) ?? { falhas: 0, bloqueadoAte: 0, ultimaFalha: agora }
    registro.falhas += 1
    registro.ultimaFalha = agora

    if (registro.falhas >= limite) {
      const degrau = Math.min(registro.falhas - limite, ESPERAS_MS.length - 1)
      registro.bloqueadoAte = agora + ESPERAS_MS[degrau]
    }

    registros.set(chave, registro)
  }
}

/** Entrou: o histórico de erro daquela conta e daquele endereço não serve mais. */
export function esquecerTentativas(alvos: Alvo[]): void {
  for (const { chave } of alvos) registros.delete(chave)
}

/**
 * Mensagem do bloqueio. Não diz nada sobre a conta — nem que ela existe, nem
 * que não existe: o contador sobe igual para e-mail cadastrado e para e-mail
 * inventado, então o bloqueio chega no mesmo lugar nos dois casos.
 */
export function mensagemDeEspera(restanteMs: number): string {
  const minutos = Math.max(1, Math.ceil(restanteMs / 60_000))
  return `Muitas tentativas seguidas. Tente de novo em ${minutos} ${
    minutos === 1 ? 'minuto' : 'minutos'
  }.`
}

/** Só para teste: o estado mora entre chamadas, e um caso não pode sujar o outro. */
export function reiniciarLimitador(): void {
  registros.clear()
}
