/**
 * A oficina fica em Cáceres, Mato Grosso. `America/Cuiaba` é a zona IANA que
 * cobre o estado inteiro — não existe `America/Caceres` —, e são quatro horas
 * atrás de UTC, não três: Mato Grosso não é Brasília.
 *
 * Toda formatação e toda conta de dia civil deste sistema passa por aqui. O
 * contêiner da aplicação roda em UTC, então nada pode depender do relógio
 * local dele.
 */
export const FUSO = 'America/Cuiaba'

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

const partesIso = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  // `hourCycle` em vez de `hour12: false`: sem ele, meia-noite sai como "24".
  hourCycle: 'h23',
  timeZoneName: 'longOffset',
})

/**
 * ISO-8601 no fuso da oficina, com o deslocamento escrito:
 * `2026-07-30T08:00:00-04:00`.
 *
 * É o formato da exportação em CSV. `toISOString()` sairia em UTC, que é exato
 * e não perde informação nenhuma — e mesmo assim está errado para o uso: quem
 * abre o arquivo é o dono da oficina, no Brasil, numa planilha, e ler `12:00Z`
 * como meio-dia num evento das nove da manhã é o erro que o `Z` não impede.
 *
 * O deslocamento sai do próprio `Intl`, e não de uma constante `-04:00`: Mato
 * Grosso teve horário de verão até 2019 — no verão o estado ia para UTC-3 —, e
 * dado exportado de antes disso tem de levar o deslocamento que valia na data.
 */
export function formatarDataHoraIso(valor: Date): string {
  const partes = new Map(partesIso.formatToParts(valor).map((p) => [p.type, p.value]))
  const data = `${partes.get('year')}-${partes.get('month')}-${partes.get('day')}`
  const hora = `${partes.get('hour')}:${partes.get('minute')}:${partes.get('second')}`
  // `longOffset` devolve "GMT-04:00"; no deslocamento zero devolve só "GMT".
  const deslocamento = (partes.get('timeZoneName') ?? '').replace('GMT', '') || '+00:00'
  return `${data}T${hora}${deslocamento}`
}

/** Meia-noite do dia civil de Cáceres, expressa em milissegundos UTC. */
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

/**
 * Início do dia civil de Cáceres (00:00:00.000 no fuso de Cuiabá / UTC-4).
 * Garante que filtros de data em strings "AAAA-MM-DD" não sofram com o desvio
 * de "new Date(string)" em UTC, o que puxaria registros da noite do dia anterior.
 */
export function inicioDoDia(dataOuIso: string | Date): Date {
  if (dataOuIso instanceof Date) {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dataOuIso)
    return new Date(`${partes}T00:00:00-04:00`)
  }
  const texto = dataOuIso.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return new Date(`${texto}T00:00:00-04:00`)
  }
  return new Date(texto)
}

/**
 * Fim do dia civil de Cáceres (23:59:59.999 no fuso de Cuiabá / UTC-4).
 */
export function fimDoDia(dataOuIso: string | Date): Date {
  if (dataOuIso instanceof Date) {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dataOuIso)
    return new Date(`${partes}T23:59:59.999-04:00`)
  }
  const texto = dataOuIso.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return new Date(`${texto}T23:59:59.999-04:00`)
  }
  const d = new Date(texto)
  d.setHours(23, 59, 59, 999)
  return d
}
