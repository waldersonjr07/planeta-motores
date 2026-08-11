import { expect, test } from 'vitest'
import { normalizarTexto } from '../../src/lib/texto'

test('normalizarTexto tira acento, caixa e bordas', () => {
  expect(normalizarTexto('  Óleo 2T  ')).toBe('oleo 2t')
  expect(normalizarTexto('VELA NGK')).toBe('vela ngk')
  expect(normalizarTexto('Bujão')).toBe('bujao')
})

test('normalizarTexto deixa vazio quem só tem espaço', () => {
  expect(normalizarTexto('   ')).toBe('')
})
