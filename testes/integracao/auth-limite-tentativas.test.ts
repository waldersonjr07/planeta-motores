import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { db } from '../../src/db'
import { usuarios } from '../../src/db/schema'
import { autenticar } from '../../src/modulos/auth/autenticacao'
import { LIMITE_POR_CONTA, reiniciarLimitador } from '../../src/modulos/auth/limitador'
import { gerarHash } from '../../src/modulos/auth/senha'
import { limparBanco } from '../ajuda/banco'

/**
 * O freio visto de fora, pelo caminho que o login usa de verdade.
 *
 * Aqui não há requisição HTTP, então todas as tentativas caem no mesmo balde
 * de origem desconhecida — que é exatamente o cenário do atacante insistindo
 * de um lugar só.
 */

const EMAIL = 'lucilene@planetamotores.com.br'
const SENHA = 'motor2tempos'

beforeEach(async () => {
  await limparBanco()
  reiniciarLimitador()
  /*
   * Só `Date`, e não o pacote inteiro de timers. O padrão do Vitest troca
   * também setTimeout/setInterval/setImmediate, e o driver do Postgres depende
   * deles para andar com a consulta: com o relógio todo falso, o primeiro
   * `db.insert` fica esperando para sempre e o hook morre por tempo. O freio lê
   * as horas só por `Date.now()`, então falsear `Date` basta para controlá-lo.
   */
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-08-14T10:00:00Z'))
  await db.insert(usuarios).values({
    nome: 'Lucilene',
    email: EMAIL,
    senhaHash: await gerarHash(SENHA),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

async function errarSenha(vezes: number) {
  for (let i = 0; i < vezes; i++) await autenticar(EMAIL, 'chute')
}

test('bloqueia depois do limite, mesmo com a senha certa', async () => {
  await errarSenha(LIMITE_POR_CONTA)

  const r = await autenticar(EMAIL, SENHA)

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toMatch(/^Muitas tentativas seguidas\./)
})

test('libera depois de passada a espera', async () => {
  await errarSenha(LIMITE_POR_CONTA)
  expect((await autenticar(EMAIL, SENHA)).ok).toBe(false)

  vi.advanceTimersByTime(60_000)

  expect((await autenticar(EMAIL, SENHA)).ok).toBe(true)
})

test('sucesso zera o contador', async () => {
  await errarSenha(LIMITE_POR_CONTA - 1)
  expect((await autenticar(EMAIL, SENHA)).ok).toBe(true)

  // Se o acerto não tivesse zerado, a próxima falha já bateria no limite.
  await errarSenha(LIMITE_POR_CONTA - 1)

  expect((await autenticar(EMAIL, SENHA)).ok).toBe(true)
})

test('o bloqueio não conta quem existe: e-mail inventado responde igual', async () => {
  const inventado = 'ninguem@planetamotores.com.br'

  for (let i = 0; i < LIMITE_POR_CONTA; i++) await autenticar(inventado, 'chute')
  const doInventado = await autenticar(inventado, 'chute')

  reiniciarLimitador()
  await errarSenha(LIMITE_POR_CONTA)
  const daConta = await autenticar(EMAIL, 'chute')

  expect(doInventado.ok).toBe(false)
  expect(daConta.ok).toBe(false)
  if (doInventado.ok || daConta.ok) return
  // Mesma mensagem, palavra por palavra: quem tenta adivinhar não descobre
  // pelo freio qual e-mail está cadastrado.
  expect(doInventado.erro).toBe(daConta.erro)
})

test('antes do limite, a resposta continua sendo a de credencial inválida', async () => {
  const r = await autenticar(EMAIL, 'chute')

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('E-mail ou senha inválidos.')
})
