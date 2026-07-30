export const SITUACOES = {
  recebido: 'Recebido',
  em_diagnostico: 'Em diagnóstico',
  orcamento_enviado: 'Orçamento enviado',
  aprovado: 'Aprovado',
  aguardando_peca: 'Aguardando peça',
  em_execucao: 'Em execução',
  pronto: 'Pronto',
  entregue: 'Entregue',
  recusado: 'Recusado',
  devolvido: 'Devolvido',
  cancelado: 'Cancelado',
} as const

export type SituacaoOs = keyof typeof SITUACOES

/** Única fonte de verdade do fluxo. Qualquer salto fora daqui é recusado. */
export const TRANSICOES: Record<SituacaoOs, SituacaoOs[]> = {
  recebido: ['em_diagnostico', 'cancelado'],
  em_diagnostico: ['orcamento_enviado', 'cancelado'],
  orcamento_enviado: ['aprovado', 'recusado', 'orcamento_enviado'],
  aprovado: ['aguardando_peca', 'em_execucao', 'orcamento_enviado', 'cancelado'],
  aguardando_peca: ['em_execucao', 'orcamento_enviado'],
  em_execucao: ['aguardando_peca', 'pronto', 'orcamento_enviado'],
  pronto: ['entregue', 'em_execucao'],
  recusado: ['devolvido'],
  entregue: [],
  devolvido: [],
  cancelado: [],
}

export function transicaoPermitida(de: SituacaoOs, para: SituacaoOs): boolean {
  return TRANSICOES[de].includes(para)
}

export function eTerminal(situacao: SituacaoOs): boolean {
  return TRANSICOES[situacao].length === 0
}

/** OS encerrada não recebe item novo — nem para "acertar" o valor na entrega. */
export function aceitaAlteracaoDeItem(situacao: SituacaoOs): boolean {
  return !eTerminal(situacao)
}

const PROXIMA: Partial<Record<SituacaoOs, { rotulo: string; para: SituacaoOs }>> = {
  recebido: { rotulo: 'Iniciar diagnóstico', para: 'em_diagnostico' },
  em_diagnostico: { rotulo: 'Enviar orçamento', para: 'orcamento_enviado' },
  orcamento_enviado: { rotulo: 'Registrar aprovação', para: 'aprovado' },
  aprovado: { rotulo: 'Iniciar execução', para: 'em_execucao' },
  aguardando_peca: { rotulo: 'Retomar execução', para: 'em_execucao' },
  em_execucao: { rotulo: 'Concluir serviço', para: 'pronto' },
  pronto: { rotulo: 'Entregar', para: 'entregue' },
  recusado: { rotulo: 'Devolver equipamento', para: 'devolvido' },
}

/** O botão de próxima ação da ficha da OS. */
export function proximaAcao(
  situacao: SituacaoOs,
): { rotulo: string; para: SituacaoOs } | null {
  return PROXIMA[situacao] ?? null
}
