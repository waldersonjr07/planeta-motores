export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

/**
 * Comprimento do texto já pontuado. Serve de `maxLength` no input, para o
 * navegador barrar o dígito excedente antes de a máscara ver.
 */
export const COMPRIMENTOS = { documento: 18, telefone: 15, cep: 9 } as const

/*
 * Regra comum às três: o separador entra assim que o grupo anterior fecha, e
 * não quando o próximo dígito chega. É o que faz o próximo dígito já cair
 * depois do ponto em vez de empurrá-lo.
 */

function mascararCpf(d: string): string {
  let saida = d.slice(0, 3)
  if (d.length >= 3) saida += '.'
  if (d.length > 3) saida += d.slice(3, 6)
  if (d.length >= 6) saida += '.'
  if (d.length > 6) saida += d.slice(6, 9)
  if (d.length >= 9) saida += '-'
  if (d.length > 9) saida += d.slice(9, 11)
  return saida
}

function mascararCnpj(d: string): string {
  let saida = d.slice(0, 2)
  if (d.length >= 2) saida += '.'
  if (d.length > 2) saida += d.slice(2, 5)
  if (d.length >= 5) saida += '.'
  if (d.length > 5) saida += d.slice(5, 8)
  if (d.length >= 8) saida += '/'
  if (d.length > 8) saida += d.slice(8, 12)
  if (d.length >= 12) saida += '-'
  if (d.length > 12) saida += d.slice(12, 14)
  return saida
}

/** CPF até 11 dígitos; do 12º em diante se reorganiza como CNPJ. */
export function mascararDocumento(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 14)
  return d.length <= 11 ? mascararCpf(d) : mascararCnpj(d)
}

/**
 * Celular tem 9 dígitos fora o DDD; fixo tem 8. Como só o comprimento
 * distingue os dois, o traço fica na posição de fixo até o 11º dígito chegar.
 */
export function mascararTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11)
  if (d.length === 0) return ''

  let saida = `(${d.slice(0, 2)}`
  if (d.length >= 2) saida += ') '
  if (d.length > 2) {
    const corte = d.length > 10 ? 7 : 6
    saida += d.slice(2, corte)
    if (d.length > corte) saida += `-${d.slice(corte)}`
  }
  return saida
}

export function mascararCep(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8)
  let saida = d.slice(0, 5)
  if (d.length >= 5) saida += '-'
  if (d.length > 5) saida += d.slice(5, 8)
  return saida
}
