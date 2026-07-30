import { describe, expect, test } from 'vitest'
import { formatarReais, parsearReais } from '../../src/lib/dinheiro'

describe('formatarReais', () => {
  test('formata milhar com ponto e centavo com vírgula', () => {
    expect(formatarReais(152340)).toBe('R$ 1.523,40')
  })

  test('usa espaço comum, não espaço inquebrável', () => {
    expect(formatarReais(500)).toBe('R$ 5,00')
    expect(formatarReais(500)).not.toContain(' ')
  })

  test('formata zero', () => {
    expect(formatarReais(0)).toBe('R$ 0,00')
  })
})

describe('parsearReais', () => {
  test('aceita valor com separador de milhar', () => {
    expect(parsearReais('1.523,40')).toBe(152340)
  })

  test('aceita valor sem centavo', () => {
    expect(parsearReais('230')).toBe(23000)
  })

  test('aceita prefixo de moeda', () => {
    expect(parsearReais('R$ 62,00')).toBe(6200)
  })

  test('arredonda o centavo em vez de truncar', () => {
    expect(parsearReais('0,1')).toBe(10)
  })

  test('recusa texto que não é valor', () => {
    expect(parsearReais('abc')).toBeNull()
    expect(parsearReais('')).toBeNull()
    expect(parsearReais('1,234')).toBeNull()
  })
})
