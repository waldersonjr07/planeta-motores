import { FUSO } from './datas'

const formatador = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Hoje no fuso de São Paulo, no formato ISO que `input[type=date]` espera. */
export function hoje(): string {
  return formatador.format(new Date())
}

/**
 * Ano civil corrente em São Paulo.
 *
 * Existe para que ninguém precise de `new Date().getFullYear()`: o contêiner
 * da aplicação roda em UTC, e às 21h de 31 de dezembro lá já é o ano seguinte.
 * A numeração da OS depende disto.
 */
export function anoCorrente(referencia = hoje()): number {
  return Number(referencia.slice(0, 4))
}

export type Periodo = { de: string; ate: string }

/** Primeiro e último dia do mês corrente, ou do mês informado como `AAAA-MM`. */
export function mesDe(referencia = hoje()): Periodo {
  const [ano, mes] = referencia.split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  const doisDigitos = String(mes).padStart(2, '0')
  return {
    de: `${ano}-${doisDigitos}-01`,
    ate: `${ano}-${doisDigitos}-${String(ultimoDia).padStart(2, '0')}`,
  }
}

export function rotuloDoMes(periodo: Periodo): string {
  const [ano, mes] = periodo.de.split('-').map(Number)
  const nome = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(ano, mes - 1, 1)),
  )
  return `${nome} de ${ano}`
}
