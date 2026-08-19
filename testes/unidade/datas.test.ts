import { expect, test } from 'vitest'
import {
  diasDesde,
  formatarData,
  formatarDataHora,
  formatarDataHoraIso,
} from '../../src/lib/datas'

test('formata em ISO com o deslocamento de Cáceres', () => {
  // 12:00 UTC são 08:00 em Cáceres. O deslocamento vai escrito para que a
  // planilha de quem abre o CSV não precise adivinhar nada.
  expect(formatarDataHoraIso(new Date('2026-07-30T12:00:00Z'))).toBe(
    '2026-07-30T08:00:00-04:00',
  )
})

test('o deslocamento acompanha o horário de verão que já existiu', () => {
  // Mato Grosso teve horário de verão até 2019: no verão o estado ia para
  // UTC-3. Exportação de dado anterior a isso sai com o deslocamento que valia
  // na data, e não com o de hoje.
  expect(formatarDataHoraIso(new Date('2018-01-15T12:00:00Z'))).toBe(
    '2018-01-15T09:00:00-03:00',
  )
})

test('meia-noite sai como 00, não como 24', () => {
  expect(formatarDataHoraIso(new Date('2026-07-30T04:00:00Z'))).toBe(
    '2026-07-30T00:00:00-04:00',
  )
})

test('formata a data no padrão brasileiro', () => {
  expect(formatarData(new Date('2026-07-29T12:00:00Z'))).toBe('29/07/2026')
})

test('converte o instante para o fuso de Cáceres', () => {
  // 02:00 UTC de 30/07 ainda é 22:00 de 29/07 em Cáceres (UTC-4)
  expect(formatarData(new Date('2026-07-30T02:00:00Z'))).toBe('29/07/2026')
})

test('formata data e hora sem vírgula entre elas', () => {
  expect(formatarDataHora(new Date('2026-07-29T17:32:00Z'))).toBe('29/07/2026 13:32')
})

test('conta dias inteiros entre duas datas', () => {
  const referencia = new Date('2026-07-29T12:00:00Z')
  expect(diasDesde(new Date('2026-07-22T12:00:00Z'), referencia)).toBe(7)
  expect(diasDesde(referencia, referencia)).toBe(0)
})

test('conta o dia virado mesmo com poucas horas de diferença', () => {
  // 22:00 de 28/07 em Cáceres para 00:00 de 29/07: um dia de diferença
  expect(
    diasDesde(new Date('2026-07-29T02:00:00Z'), new Date('2026-07-29T04:00:00Z')),
  ).toBe(1)
})

/**
 * O dia civil é o de Cáceres, não o do relógio do contêiner — que roda em UTC.
 * Entre 20h e meia-noite, lá já é o dia seguinte, e é a faixa em que a oficina
 * fecha: uma OS concluída às 23h30 cairia no dia errado, e com ela a coluna
 * DIAS que decide quem cobrar primeiro.
 */
test('OS concluída às 23h30 conta no dia dela, não no seguinte', () => {
  const concluida = new Date('2026-08-18T03:30:00Z')

  expect(formatarData(concluida)).toBe('17/08/2026')
  // Na manhã do dia 18, essa OS tem um dia — não dois, nem zero.
  expect(diasDesde(concluida, new Date('2026-08-18T14:00:00Z'))).toBe(1)
})
