import { expect, test } from 'vitest'
import { gerarHash, verificarSenha } from '../../src/modulos/auth/senha'

test('o hash não contém a senha em claro', async () => {
  const hash = await gerarHash('motor2tempos')
  expect(hash).not.toContain('motor2tempos')
  expect(hash.startsWith('$argon2id$')).toBe(true)
})

test('duas chamadas geram hashes diferentes para a mesma senha', async () => {
  expect(await gerarHash('motor2tempos')).not.toBe(await gerarHash('motor2tempos'))
})

test('confere a senha correta e recusa a errada', async () => {
  const hash = await gerarHash('motor2tempos')
  expect(await verificarSenha('motor2tempos', hash)).toBe(true)
  expect(await verificarSenha('motor4tempos', hash)).toBe(false)
})

test('hash corrompido devolve falso em vez de estourar', async () => {
  expect(await verificarSenha('motor2tempos', 'não é um hash')).toBe(false)
})
