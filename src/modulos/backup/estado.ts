/**
 * Leitura do carimbo que `scripts/backup.sh` deixa quando termina bem.
 *
 * Puro de propósito: quem lê o disco é `consultas.ts`. Todo o julgamento — o
 * que conta como atrasado, o que conta como ilegível — mora aqui e se testa
 * sem arquivo nenhum.
 */

/**
 * O backup roda de madrugada, todo dia. Trinta e seis horas dão folga para uma
 * madrugada perdida e ainda assim acusam no mesmo dia: falhou às 3h de terça,
 * a tela avisa às 15h de terça. Vinte e quatro horas acusariam qualquer atraso
 * de alguns minutos no cron; quarenta e oito só mostrariam o problema na manhã
 * de quinta.
 */
export const HORAS_ATE_AVISAR = 36

export type EstadoDoBackup =
  | { situacao: 'em-dia'; feitoEm: Date }
  | { situacao: 'atrasado'; feitoEm: Date }
  | { situacao: 'falha-externa'; feitoEm: Date; motivo?: string }
  | { situacao: 'sem-noticia' }

/**
 * Exatamente o que o `date '+%Y-%m-%dT%H:%M:%S%:z'` do script escreve, com o
 * fuso obrigatório. Opcionalmente seguido de "cópia externa: <status>".
 */
const CARIMBO =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:\d{2}|Z))(?:\s+cópia externa:\s*(.+))?/i

export function interpretarMarcador(
  conteudo: string | null,
  agora: Date = new Date(),
): EstadoDoBackup {
  const encontrado = conteudo?.trim().match(CARIMBO)
  if (!encontrado) return { situacao: 'sem-noticia' }

  const feitoEm = new Date(encontrado[1])
  // A expressão acima aceita 2026-13-45; o `Date` é quem sabe que esse dia não
  // existe.
  if (Number.isNaN(feitoEm.getTime())) return { situacao: 'sem-noticia' }

  const horas = (agora.getTime() - feitoEm.getTime()) / 3_600_000
  if (horas > HORAS_ATE_AVISAR) {
    return { situacao: 'atrasado', feitoEm }
  }

  const copiaExterna = encontrado[2]?.trim()
  if (copiaExterna && !copiaExterna.toLowerCase().startsWith('enviada')) {
    return { situacao: 'falha-externa', feitoEm, motivo: copiaExterna }
  }

  return { situacao: 'em-dia', feitoEm }
}

/**
 * "Atrasado", "falha-externa" e "sem notícia" viram aviso na tela.
 */
export function precisaAvisar(estado: EstadoDoBackup): boolean {
  return estado.situacao !== 'em-dia'
}
