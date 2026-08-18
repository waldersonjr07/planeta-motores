import { expect, test } from 'vitest'
import { paraCsv } from '../../src/modulos/exportacao/csv'

test('escreve o cabeçalho na primeira linha', () => {
  const csv = paraCsv([{ nome: 'Ivan', cidade: 'Osasco' }])

  expect(csv.split('\r\n')[0]).toBe('nome,cidade')
})

test('campo com vírgula sai entre aspas', () => {
  expect(paraCsv([{ nome: 'Andrade, Marcos' }])).toContain('"Andrade, Marcos"')
})

test('aspas internas são duplicadas', () => {
  expect(paraCsv([{ nome: 'Oficina "do Ivan"' }])).toContain('"Oficina ""do Ivan"""')
})

test('quebra de linha dentro do campo é preservada entre aspas', () => {
  const csv = paraCsv([{ obs: 'linha 1\nlinha 2' }])

  expect(csv).toContain('"linha 1\nlinha 2"')
})

test('nulo e indefinido viram campo vazio', () => {
  expect(paraCsv([{ a: null, b: undefined, c: 'x' }], ['a', 'b', 'c'])).toBe('a,b,c\r\n,,x')
})

test('data sai em ISO com o fuso de São Paulo, não em UTC', () => {
  // Quem abre este arquivo é o dono da oficina, no Brasil, numa planilha.
  // `12:00Z` para um evento das 09:00 está tecnicamente certo e convida ao
  // erro de leitura; com o deslocamento escrito, não há o que interpretar.
  const csv = paraCsv([{ quando: new Date('2026-07-30T12:00:00Z') }])

  expect(csv).toContain('2026-07-30T09:00:00-03:00')
  expect(csv).not.toContain('12:00:00.000Z')
})

test('lista vazia devolve texto vazio', () => {
  expect(paraCsv([])).toBe('')
})

test('as colunas informadas mandam na ordem', () => {
  expect(paraCsv([{ b: 2, a: 1 }], ['a', 'b'])).toBe('a,b\r\n1,2')
})
