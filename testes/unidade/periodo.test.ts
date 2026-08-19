import { afterEach, expect, test, vi } from 'vitest'
import { anoCorrente, hoje, mesDe, rotuloDoMes } from '../../src/lib/periodo'

afterEach(() => {
  vi.useRealTimers()
})

/**
 * O contêiner da aplicação roda em UTC — a imagem `node:22-alpine` não traz
 * fuso nenhum. Às 23h30 de 31/12 em Cáceres já é dia 1º de janeiro em UTC, e
 * `new Date().getFullYear()` ali devolveria o ano seguinte. É a hora em que a
 * numeração da OS saltaria um ano.
 *
 * O instante é escolhido para separar Cáceres (UTC-4) de Brasília (UTC-3), e
 * não só de UTC: às 03h30 UTC ainda é 31/12 em Cáceres, mas já é 1º de janeiro
 * em Brasília. Fuso quase certo falha nas mesmas horas que fuso errado.
 */
test('a virada do ano segue Cáceres, não o relógio do contêiner', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2027-01-01T03:30:00Z'))

  expect(hoje()).toBe('2026-12-31')
  expect(anoCorrente()).toBe(2026)
  // O que o código fazia antes, para a diferença ficar registrada:
  expect(new Date().getUTCFullYear()).toBe(2027)
})

test('a virada do dia também segue Cáceres', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-18T03:30:00Z'))

  expect(hoje()).toBe('2026-08-17')
  expect(mesDe().ate).toBe('2026-08-31')
})

/**
 * O limite do mês é o que decide o resultado financeiro do período. Às 23h de
 * 31 de agosto em Cáceres já é 1º de setembro tanto em UTC quanto em Brasília:
 * com o fuso errado, o faturamento da última noite do mês cairia no mês
 * seguinte, e os dois meses fechariam com o número errado.
 */
test('a virada do mês segue Cáceres, e o resultado não vaza para o mês seguinte', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-01T03:00:00Z'))

  expect(hoje()).toBe('2026-08-31')
  expect(mesDe()).toEqual({ de: '2026-08-01', ate: '2026-08-31' })
})

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
