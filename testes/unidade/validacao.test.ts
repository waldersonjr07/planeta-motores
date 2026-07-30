import { expect, test } from 'vitest'
import {
  apenasDigitos,
  cepOpcional,
  documentoOpcional,
  telefoneOpcional,
  textoObrigatorio,
} from '../../src/lib/validacao'

test('apenasDigitos remove pontuação', () => {
  expect(apenasDigitos('123.456.789-00')).toBe('12345678900')
})

test('documento aceita CPF e CNPJ, guardando só os dígitos', () => {
  expect(documentoOpcional.parse('123.456.789-00')).toBe('12345678900')
  expect(documentoOpcional.parse('12.345.678/0001-95')).toBe('12345678000195')
})

test('documento vazio virá nulo', () => {
  expect(documentoOpcional.parse('')).toBeNull()
})

test('documento com quantidade errada de dígitos é recusado', () => {
  expect(() => documentoOpcional.parse('123')).toThrow()
})

test('telefone aceita 10 e 11 dígitos', () => {
  expect(telefoneOpcional.parse('(11) 98765-4321')).toBe('11987654321')
  expect(telefoneOpcional.parse('1132654321')).toBe('1132654321')
  expect(() => telefoneOpcional.parse('987654321')).toThrow()
})

test('CEP exige 8 dígitos', () => {
  expect(cepOpcional.parse('04567-000')).toBe('04567000')
  expect(() => cepOpcional.parse('4567')).toThrow()
})

test('textoObrigatorio recusa espaço em branco e apara as bordas', () => {
  expect(textoObrigatorio('Nome').parse('  Ivan  ')).toBe('Ivan')
  expect(() => textoObrigatorio('Nome').parse('   ')).toThrow('Nome é obrigatório')
})
