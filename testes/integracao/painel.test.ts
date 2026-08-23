import { beforeEach, expect, test } from 'vitest'
import { obterPainel } from '../../src/modulos/painel/consultas'
import { limparBanco } from '../ajuda/banco'
import { levarAte, osComValor } from '../ajuda/os'

beforeEach(limparBanco)

/**
 * O painel é tela de pendência. Ele deriva da consulta de cobrança, então o
 * que estes testes guardam é a escolha do bloco: dívida sim, previsão não.
 */
test('o valor a receber conta só o serviço já executado', async () => {
  const pronta = await osComValor()
  await levarAte(pronta.osId, 'pronto')
  const emCurso = await osComValor()
  await levarAte(emCurso.osId, 'em_execucao')

  const painel = await obterPainel()

  expect(painel.aReceberCentavos).toBe(21000)
  expect(painel.cobrancas.map((conta) => conta.osId)).toEqual([pronta.osId])
})

/** O defeito relatado: serviço recusado não é dívida do cliente. */
test('OS cancelada não soma no a receber nem entra na lista de cobranças', async () => {
  const { osId } = await osComValor()
  await levarAte(osId, 'cancelado')

  const painel = await obterPainel()

  expect(painel.aReceberCentavos).toBe(0)
  expect(painel.cobrancas).toHaveLength(0)
})

/** Ninguém prometeu pagar um orçamento que ainda não foi respondido. */
test('orçamento enviado e sem resposta não engorda o a receber', async () => {
  const { osId } = await osComValor()
  await levarAte(osId, 'orcamento_enviado')

  const painel = await obterPainel()

  expect(painel.aReceberCentavos).toBe(0)
  expect(painel.cobrancas).toHaveLength(0)
  // Continua sendo pendência: é orçamento esperando resposta há dias.
  expect(painel.pendencias.map((p) => p.osId)).toEqual([osId])
})
