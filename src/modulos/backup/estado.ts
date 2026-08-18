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
  | { situacao: 'sem-noticia' }

/**
 * Exatamente o que o `date '+%Y-%m-%dT%H:%M:%S%:z'` do script escreve, com o
 * fuso obrigatório. A VPS pode estar em UTC e quem lê está em São Paulo; data
 * sem fuso seria interpretada como local e daria três horas de erro.
 *
 * O rigor é a intenção: qualquer coisa que não seja este formato é tratada
 * como "não sei", que avisa. Um `Date.parse` solto aceitaria `2026` como uma
 * data válida de primeiro de janeiro e calaria a tela.
 */
const CARIMBO = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:\d{2}|Z))/

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
  return horas > HORAS_ATE_AVISAR
    ? { situacao: 'atrasado', feitoEm }
    : { situacao: 'em-dia', feitoEm }
}

/**
 * "Atrasado" e "sem notícia" viram o mesmo aviso na tela de propósito. Quem vê
 * o painel não administra a VPS, e a diferença entre "parou de rodar" e "não
 * consegui ler o carimbo" não muda o que ela tem a fazer.
 */
export function precisaAvisar(estado: EstadoDoBackup): boolean {
  return estado.situacao !== 'em-dia'
}
