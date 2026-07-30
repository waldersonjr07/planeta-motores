export const APLICACOES = {
  rocadeira: 'Roçadeira',
  motosserra: 'Motosserra',
  motobomba: 'Motobomba',
  gerador: 'Gerador',
  soprador: 'Soprador',
  outro: 'Outro',
} as const

export type Aplicacao = keyof typeof APLICACOES

export type TipoMotor = '2T' | '4T'

/** Uma linha para identificar o equipamento em lista, PDF e mensagem. */
export function descreverEquipamento(equipamento: {
  aplicacao: Aplicacao
  marca: string | null
  modelo: string | null
  tipoMotor: TipoMotor
}): string {
  const partes = [
    APLICACOES[equipamento.aplicacao],
    equipamento.marca,
    equipamento.modelo,
  ].filter((parte): parte is string => Boolean(parte))

  return `${partes.join(' ')} (${equipamento.tipoMotor})`
}
