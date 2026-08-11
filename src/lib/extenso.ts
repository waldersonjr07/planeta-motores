const UNIDADES = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
]
const DEZ_A_DEZENOVE = [
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis',
  'dezessete', 'dezoito', 'dezenove',
]
const DEZENAS = [
  '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta',
  'oitenta', 'noventa',
]
const CENTENAS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
]

function ateNovecentos(n: number): string {
  // "cem" é exato; 101 em diante vira "cento e …".
  if (n === 100) return 'cem'

  const partes: string[] = []
  const centena = Math.floor(n / 100)
  const resto = n % 100
  if (centena > 0) partes.push(CENTENAS[centena])

  if (resto >= 10 && resto <= 19) {
    partes.push(DEZ_A_DEZENOVE[resto - 10])
  } else {
    const dezena = Math.floor(resto / 10)
    const unidade = resto % 10
    const sub: string[] = []
    if (dezena > 0) sub.push(DEZENAS[dezena])
    if (unidade > 0) sub.push(UNIDADES[unidade])
    if (sub.length > 0) partes.push(sub.join(' e '))
  }

  return partes.join(' e ')
}

/**
 * O "e" antes do último grupo só entra quando o resto é menor que cem ou é
 * centena redonda: "mil e quinhentos", mas "dois mil trezentos e cinquenta".
 */
function ligar(resto: number): string {
  return resto < 100 || resto % 100 === 0 ? ' e ' : ' '
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return 'zero'
  if (n < 1000) return ateNovecentos(n)

  if (n < 1_000_000) {
    const milhares = Math.floor(n / 1000)
    const resto = n % 1000
    // "mil", não "um mil".
    const cabeca = milhares === 1 ? 'mil' : `${ateNovecentos(milhares)} mil`
    return resto === 0 ? cabeca : cabeca + ligar(resto) + ateNovecentos(resto)
  }

  const milhoes = Math.floor(n / 1_000_000)
  const resto = n % 1_000_000
  const cabeca =
    milhoes === 1 ? 'um milhão' : `${ateNovecentos(milhoes)} milhões`
  return resto === 0 ? cabeca : cabeca + ligar(resto) + inteiroPorExtenso(resto)
}

/**
 * O valor por extenso do recibo, como manda o costume brasileiro. Recebe
 * centavos inteiros, como todo dinheiro no sistema.
 */
export function valorPorExtenso(centavos: number): string {
  const absoluto = Math.abs(Math.trunc(centavos))
  const inteiro = Math.floor(absoluto / 100)
  const fracao = absoluto % 100

  if (inteiro === 0 && fracao === 0) return 'zero real'

  const parteCentavos =
    fracao === 1 ? 'um centavo' : `${inteiroPorExtenso(fracao)} centavos`
  if (inteiro === 0) return parteCentavos

  // Milhão redondo pede "de reais": "um milhão de reais".
  const conector =
    inteiro >= 1_000_000 && inteiro % 1_000_000 === 0 ? ' de reais' : ' reais'
  const parteReais =
    inteiro === 1 ? 'um real' : inteiroPorExtenso(inteiro) + conector

  return fracao === 0 ? parteReais : `${parteReais} e ${parteCentavos}`
}
