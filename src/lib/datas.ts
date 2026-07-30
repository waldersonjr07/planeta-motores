export const FUSO = 'America/Sao_Paulo'

const somenteData = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dataComHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatarData(valor: Date): string {
  return somenteData.format(valor)
}

export function formatarDataHora(valor: Date): string {
  return dataComHora.format(valor).replace(', ', ' ')
}

/** Meia-noite do dia civil de São Paulo, expressa em milissegundos UTC. */
function diaCivil(valor: Date): number {
  const [dia, mes, ano] = somenteData.format(valor).split('/').map(Number)
  return Date.UTC(ano, mes - 1, dia)
}

/**
 * Dias inteiros decorridos, comparando dias civis e não intervalos de 24 h —
 * é assim que a Lucilene conta "quatro dias sem resposta".
 */
export function diasDesde(valor: Date, referencia = new Date()): number {
  const umDia = 86_400_000
  return Math.round((diaCivil(referencia) - diaCivil(valor)) / umDia)
}
