import { expect, test } from 'vitest'
import { formatarQuantidade, parsearQuantidade } from '../../src/lib/quantidade'

test('formata quantidade inteira sem casas decimais', () => {
  expect(formatarQuantidade('2.000')).toBe('2')
  expect(formatarQuantidade(4)).toBe('4')
})

test('formata fração com vírgula e sem zeros à direita', () => {
  expect(formatarQuantidade('0.500')).toBe('0,5')
  expect(formatarQuantidade('1.250')).toBe('1,25')
})

test('lê quantidade com vírgula ou ponto', () => {
  expect(parsearQuantidade('0,5')).toBe(0.5)
  expect(parsearQuantidade('0.5')).toBe(0.5)
  expect(parsearQuantidade('3')).toBe(3)
})

test('recusa quantidade inválida ou negativa', () => {
  expect(parsearQuantidade('muito')).toBeNull()
  expect(parsearQuantidade('-1')).toBeNull()
  expect(parsearQuantidade('')).toBeNull()
})
