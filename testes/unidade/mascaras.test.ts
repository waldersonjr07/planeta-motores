import { expect, test } from 'vitest'
import {
  apenasDigitos,
  mascararCep,
  mascararDocumento,
  mascararTelefone,
} from '../../src/lib/mascaras'

test('apenasDigitos remove pontuação', () => {
  expect(apenasDigitos('123.456.789-00')).toBe('12345678900')
})

test('o documento pontua o CPF conforme se digita', () => {
  expect(mascararDocumento('')).toBe('')
  expect(mascararDocumento('12')).toBe('12')
  expect(mascararDocumento('123')).toBe('123.')
  expect(mascararDocumento('1234')).toBe('123.4')
  expect(mascararDocumento('123456')).toBe('123.456.')
  expect(mascararDocumento('123456789')).toBe('123.456.789-')
  expect(mascararDocumento('12345678901')).toBe('123.456.789-01')
})

test('o documento vira CNPJ ao passar do 11º dígito', () => {
  expect(mascararDocumento('123456789012')).toBe('12.345.678/9012-')
  expect(mascararDocumento('12345678000190')).toBe('12.345.678/0001-90')
})

test('o documento trunca em 14 dígitos', () => {
  expect(mascararDocumento('123456780001901234')).toBe('12.345.678/0001-90')
})

test('o telefone abre o parêntese e fecha no segundo dígito', () => {
  expect(mascararTelefone('')).toBe('')
  expect(mascararTelefone('1')).toBe('(1')
  expect(mascararTelefone('12')).toBe('(12) ')
  expect(mascararTelefone('123')).toBe('(12) 3')
})

test('o celular de 9 dígitos põe o traço depois do quinto', () => {
  expect(mascararTelefone('12345678910')).toBe('(12) 34567-8910')
})

test('o fixo de 8 dígitos põe o traço depois do quarto', () => {
  expect(mascararTelefone('1234567890')).toBe('(12) 3456-7890')
})

test('o telefone acomoda o traço enquanto se digita', () => {
  expect(mascararTelefone('123456')).toBe('(12) 3456')
  expect(mascararTelefone('1234567')).toBe('(12) 3456-7')
  expect(mascararTelefone('123456789')).toBe('(12) 3456-789')
})

test('o telefone trunca em 11 dígitos', () => {
  expect(mascararTelefone('123456789012345')).toBe('(12) 34567-8901')
})

test('a máscara aceita texto já pontuado, sem duplicar', () => {
  expect(mascararTelefone('(12) 34567-8910')).toBe('(12) 34567-8910')
  expect(mascararDocumento('123.456.789-01')).toBe('123.456.789-01')
})

test('o CEP pontua depois do quinto dígito', () => {
  expect(mascararCep('12345')).toBe('12345-')
  expect(mascararCep('12345678')).toBe('12345-678')
})
