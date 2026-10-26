import { beforeEach, expect, test } from 'vitest'
import {
  verificarLimiteDeRotas,
  zerarLimitesDeRotas,
} from '../../src/modulos/auth/limitador-rotas'

beforeEach(() => {
  zerarLimitesDeRotas()
})

test('permite requisições dentro do limite', () => {
  const chave = 'usuario-1'
  const limite = 3
  const janelaMs = 1000

  expect(verificarLimiteDeRotas(chave, limite, janelaMs)).toBe(true)
  expect(verificarLimiteDeRotas(chave, limite, janelaMs)).toBe(true)
  expect(verificarLimiteDeRotas(chave, limite, janelaMs)).toBe(true)
})

test('bloqueia requisição que excede o limite na mesma janela', () => {
  const chave = 'usuario-2'
  const limite = 2
  const janelaMs = 60_000

  expect(verificarLimiteDeRotas(chave, limite, janelaMs)).toBe(true)
  expect(verificarLimiteDeRotas(chave, limite, janelaMs)).toBe(true)
  expect(verificarLimiteDeRotas(chave, limite, janelaMs)).toBe(false)
  expect(verificarLimiteDeRotas(chave, limite, janelaMs)).toBe(false)
})

test('chaves diferentes possuem contadores independentes', () => {
  const limite = 1
  const janelaMs = 60_000

  expect(verificarLimiteDeRotas('usuario-a', limite, janelaMs)).toBe(true)
  expect(verificarLimiteDeRotas('usuario-b', limite, janelaMs)).toBe(true)

  // usuario-a estourou, mas não afeta usuario-c
  expect(verificarLimiteDeRotas('usuario-a', limite, janelaMs)).toBe(false)
  expect(verificarLimiteDeRotas('usuario-c', limite, janelaMs)).toBe(true)
})

test('zerarLimitesDeRotas reseta todos os contadores', () => {
  const chave = 'usuario-reset'
  expect(verificarLimiteDeRotas(chave, 1, 60_000)).toBe(true)
  expect(verificarLimiteDeRotas(chave, 1, 60_000)).toBe(false)

  zerarLimitesDeRotas()

  expect(verificarLimiteDeRotas(chave, 1, 60_000)).toBe(true)
})
