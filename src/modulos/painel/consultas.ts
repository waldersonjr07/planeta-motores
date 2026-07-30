import { diasDesde } from '@/lib/datas'
import { mesDe } from '@/lib/periodo'
import { listarContasAReceber, resultadoDoPeriodo } from '@/modulos/financeiro/consultas'
import { listarOs } from '@/modulos/os/consultas'
import type { SituacaoOs } from '@/modulos/os/situacoes'

const NA_OFICINA: SituacaoOs[] = [
  'recebido',
  'em_diagnostico',
  'orcamento_enviado',
  'aprovado',
  'aguardando_peca',
  'em_execucao',
  'pronto',
]

export type Pendencia = {
  osId: string
  numero: string
  clienteNome: string
  motivo: string
  dias: number
}

export type Painel = {
  naOficina: number
  aguardandoAprovacao: number
  prontoParaEntrega: number
  aReceberCentavos: number
  resultadoDoMesCentavos: number
  pendencias: Pendencia[]
  cobrancas: Awaited<ReturnType<typeof listarContasAReceber>>
}

const MOTIVO_POR_SITUACAO: Partial<Record<SituacaoOs, string>> = {
  orcamento_enviado: 'orçamento sem resposta',
  aguardando_peca: 'aguardando peça',
  pronto: 'pronto, aguardando retirada',
}

export async function obterPainel(): Promise<Painel> {
  const mes = mesDe()
  const [ordens, cobrancas, resultado] = await Promise.all([
    listarOs({ situacoes: NA_OFICINA }),
    listarContasAReceber(),
    resultadoDoPeriodo(mes.de, mes.ate),
  ])

  const pendencias = ordens
    .filter((os) => os.situacao in MOTIVO_POR_SITUACAO)
    .map((os) => ({
      osId: os.id,
      numero: os.numero,
      clienteNome: os.clienteNome,
      motivo: MOTIVO_POR_SITUACAO[os.situacao]!,
      dias: diasDesde(os.recebidoEm),
    }))
    // O que está parado há mais tempo aparece primeiro: é o que trava dinheiro.
    .sort((a, b) => b.dias - a.dias)

  return {
    naOficina: ordens.length,
    aguardandoAprovacao: ordens.filter((os) => os.situacao === 'orcamento_enviado').length,
    prontoParaEntrega: ordens.filter((os) => os.situacao === 'pronto').length,
    aReceberCentavos: cobrancas.reduce((soma, conta) => soma + conta.saldoCentavos, 0),
    resultadoDoMesCentavos: resultado.resultadoCentavos,
    pendencias,
    cobrancas,
  }
}
