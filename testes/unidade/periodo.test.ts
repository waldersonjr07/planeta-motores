import { expect, test } from 'vitest'
import { mesDe, rotuloDoMes } from '../../src/lib/periodo'

test('o mês vai do primeiro ao último dia', () => {
  expect(mesDe('2026-07-15')).toEqual({ de: '2026-07-01', ate: '2026-07-31' })
})

test('acerta meses de 30 dias e fevereiro', () => {
  expect(mesDe('2026-04-10').ate).toBe('2026-04-30')
  expect(mesDe('2026-02-10').ate).toBe('2026-02-28')
  // 2028 é bissexto
  expect(mesDe('2028-02-10').ate).toBe('2028-02-29')
})

test('o rótulo sai por extenso em português', () => {
  expect(rotuloDoMes(mesDe('2026-07-15'))).toBe('julho de 2026')
})
