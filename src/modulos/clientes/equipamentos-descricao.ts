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
  aplicacaoOutra?: string | null
  marca: string | null
  modelo: string | null
  tipoMotor: TipoMotor
}): string {
  // "Outro Husqvarna 236" não diz o que é a máquina; o texto digitado diz.
  const nome =
    equipamento.aplicacao === 'outro' && equipamento.aplicacaoOutra
      ? equipamento.aplicacaoOutra
      : APLICACOES[equipamento.aplicacao]

  const partes = [nome, equipamento.marca, equipamento.modelo].filter(
    (parte): parte is string => Boolean(parte),
  )

  return `${partes.join(' ')} (${equipamento.tipoMotor})`
}
