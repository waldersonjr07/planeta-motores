import { expect, test } from 'vitest'
import { diasDesde, formatarData, formatarDataHora } from '../../src/lib/datas'

test('formata a data no padrão brasileiro', () => {
  expect(formatarData(new Date('2026-07-29T12:00:00Z'))).toBe('29/07/2026')
})

test('converte o instante para o fuso de São Paulo', () => {
  // 02:00 UTC de 30/07 ainda é 23:00 de 29/07 em São Paulo (UTC-3)
  expect(formatarData(new Date('2026-07-30T02:00:00Z'))).toBe('29/07/2026')
})

test('formata data e hora sem vírgula entre elas', () => {
  expect(formatarDataHora(new Date('2026-07-29T17:32:00Z'))).toBe('29/07/2026 14:32')
})

test('conta dias inteiros entre duas datas', () => {
  const referencia = new Date('2026-07-29T12:00:00Z')
  expect(diasDesde(new Date('2026-07-22T12:00:00Z'), referencia)).toBe(7)
  expect(diasDesde(referencia, referencia)).toBe(0)
})

test('conta o dia virado mesmo com poucas horas de diferença', () => {
  // 23:00 de 28/07 em São Paulo para 01:00 de 29/07: um dia de diferença
  expect(
    diasDesde(new Date('2026-07-29T02:00:00Z'), new Date('2026-07-29T04:00:00Z')),
  ).toBe(1)
})
