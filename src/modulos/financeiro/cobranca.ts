/**
 * Cobrança não é situação da OS. O fluxo termina em "entregue"; se isto fosse
 * uma etapa, uma OS entregue com saldo devedor ficaria presa num limbo.
 */
export type CondicaoCobranca = 'sem_valor' | 'em_aberto' | 'parcial' | 'quitada'

export const CONDICOES: Record<CondicaoCobranca, string> = {
  sem_valor: 'Sem valor',
  em_aberto: 'Em aberto',
  parcial: 'Parcial',
  quitada: 'Quitada',
}

export function condicaoDeCobranca(
  totalCentavos: number,
  pagoCentavos: number,
): CondicaoCobranca {
  if (totalCentavos <= 0) return 'sem_valor'
  if (pagoCentavos <= 0) return 'em_aberto'
  if (pagoCentavos >= totalCentavos) return 'quitada'
  return 'parcial'
}

export function saldoDevedor(totalCentavos: number, pagoCentavos: number): number {
  return Math.max(0, totalCentavos - pagoCentavos)
}
