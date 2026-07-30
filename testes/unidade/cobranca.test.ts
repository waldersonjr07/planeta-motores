import { expect, test } from 'vitest'
import { condicaoDeCobranca, saldoDevedor } from '../../src/modulos/financeiro/cobranca'

test('OS sem valor fica sem_valor, mesmo se houver pagamento lançado', () => {
  expect(condicaoDeCobranca(0, 0)).toBe('sem_valor')
  expect(condicaoDeCobranca(0, 5000)).toBe('sem_valor')
})

test('nada pago é em_aberto', () => {
  expect(condicaoDeCobranca(52000, 0)).toBe('em_aberto')
})

test('pago menos que o total é parcial', () => {
  expect(condicaoDeCobranca(52000, 20000)).toBe('parcial')
})

test('pago igual ao total é quitada', () => {
  expect(condicaoDeCobranca(52000, 52000)).toBe('quitada')
})

test('o saldo devedor nunca é negativo', () => {
  expect(saldoDevedor(52000, 20000)).toBe(32000)
  expect(saldoDevedor(52000, 52000)).toBe(0)
  expect(saldoDevedor(52000, 60000)).toBe(0)
})
