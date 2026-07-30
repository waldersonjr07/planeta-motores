import { expect, test } from 'vitest'
import {
  SITUACOES,
  TRANSICOES,
  aceitaAlteracaoDeItem,
  eTerminal,
  proximaAcao,
  transicaoPermitida,
  type SituacaoOs,
} from '../../src/modulos/os/situacoes'

test('o caminho feliz inteiro é permitido', () => {
  const caminho: SituacaoOs[] = [
    'recebido',
    'em_diagnostico',
    'orcamento_enviado',
    'aprovado',
    'em_execucao',
    'pronto',
    'entregue',
  ]
  for (let i = 0; i < caminho.length - 1; i++) {
    expect(transicaoPermitida(caminho[i], caminho[i + 1])).toBe(true)
  }
})

test('espera por peça vai e volta da execução', () => {
  expect(transicaoPermitida('aguardando_peca', 'em_execucao')).toBe(true)
  expect(transicaoPermitida('em_execucao', 'aguardando_peca')).toBe(true)
})

test('revisão de orçamento é permitida depois da aprovação', () => {
  expect(transicaoPermitida('aprovado', 'orcamento_enviado')).toBe(true)
  expect(transicaoPermitida('aguardando_peca', 'orcamento_enviado')).toBe(true)
  expect(transicaoPermitida('em_execucao', 'orcamento_enviado')).toBe(true)
})

test('OS pronta pode ser reaberta para execução', () => {
  expect(transicaoPermitida('pronto', 'em_execucao')).toBe(true)
})

test('recusa leva a devolução', () => {
  expect(transicaoPermitida('orcamento_enviado', 'recusado')).toBe(true)
  expect(transicaoPermitida('recusado', 'devolvido')).toBe(true)
})

test('pular etapa é recusado', () => {
  expect(transicaoPermitida('recebido', 'pronto')).toBe(false)
  expect(transicaoPermitida('recebido', 'entregue')).toBe(false)
  expect(transicaoPermitida('em_diagnostico', 'aprovado')).toBe(false)
  expect(transicaoPermitida('orcamento_enviado', 'em_execucao')).toBe(false)
})

test('situação terminal não vai a lugar nenhum', () => {
  for (const terminal of ['entregue', 'devolvido', 'cancelado'] as SituacaoOs[]) {
    expect(eTerminal(terminal)).toBe(true)
    expect(TRANSICOES[terminal]).toEqual([])
  }
})

test('cancelamento só antes da execução', () => {
  expect(transicaoPermitida('recebido', 'cancelado')).toBe(true)
  expect(transicaoPermitida('em_diagnostico', 'cancelado')).toBe(true)
  expect(transicaoPermitida('aprovado', 'cancelado')).toBe(true)
  expect(transicaoPermitida('pronto', 'cancelado')).toBe(false)
  expect(transicaoPermitida('entregue', 'cancelado')).toBe(false)
})

test('OS encerrada não aceita alteração de item', () => {
  expect(aceitaAlteracaoDeItem('em_diagnostico')).toBe(true)
  expect(aceitaAlteracaoDeItem('em_execucao')).toBe(true)
  expect(aceitaAlteracaoDeItem('recusado')).toBe(true)
  expect(aceitaAlteracaoDeItem('entregue')).toBe(false)
  expect(aceitaAlteracaoDeItem('devolvido')).toBe(false)
  expect(aceitaAlteracaoDeItem('cancelado')).toBe(false)
})

test('a próxima ação acompanha a situação', () => {
  expect(proximaAcao('recebido')).toEqual({
    rotulo: 'Iniciar diagnóstico',
    para: 'em_diagnostico',
  })
  expect(proximaAcao('orcamento_enviado')).toEqual({
    rotulo: 'Registrar aprovação',
    para: 'aprovado',
  })
  expect(proximaAcao('pronto')).toEqual({ rotulo: 'Entregar', para: 'entregue' })
  expect(proximaAcao('entregue')).toBeNull()
})

test('toda situação tem rótulo legível', () => {
  for (const situacao of Object.keys(TRANSICOES) as SituacaoOs[]) {
    expect(SITUACOES[situacao]).toBeTruthy()
  }
})
