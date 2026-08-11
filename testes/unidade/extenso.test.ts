import { expect, test } from 'vitest'
import { valorPorExtenso } from '../../src/lib/extenso'

test('zero e singular', () => {
  expect(valorPorExtenso(0)).toBe('zero real')
  expect(valorPorExtenso(100)).toBe('um real')
  expect(valorPorExtenso(200)).toBe('dois reais')
})

test('centavos sozinhos', () => {
  expect(valorPorExtenso(1)).toBe('um centavo')
  expect(valorPorExtenso(50)).toBe('cinquenta centavos')
})

test('reais e centavos juntos', () => {
  expect(valorPorExtenso(22050)).toBe('duzentos e vinte reais e cinquenta centavos')
  expect(valorPorExtenso(10101)).toBe('cento e um reais e um centavo')
})

test('cem contra cento', () => {
  expect(valorPorExtenso(10000)).toBe('cem reais')
  expect(valorPorExtenso(12000)).toBe('cento e vinte reais')
})

test('mil não leva "um" na frente', () => {
  expect(valorPorExtenso(100000)).toBe('mil reais')
  expect(valorPorExtenso(200000)).toBe('dois mil reais')
})

test('o "e" só entra antes de resto menor que cem ou centena redonda', () => {
  expect(valorPorExtenso(150000)).toBe('mil e quinhentos reais')
  expect(valorPorExtenso(101000)).toBe('mil e dez reais')
  expect(valorPorExtenso(235000)).toBe('dois mil trezentos e cinquenta reais')
})

test('milhão no singular e no plural', () => {
  expect(valorPorExtenso(100000000)).toBe('um milhão de reais')
  expect(valorPorExtenso(200000000)).toBe('dois milhões de reais')
})

test('dezena de onze a dezenove', () => {
  expect(valorPorExtenso(1500)).toBe('quinze reais')
  expect(valorPorExtenso(1700)).toBe('dezessete reais')
})
