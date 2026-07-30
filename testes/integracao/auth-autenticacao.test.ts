import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { usuarios } from '../../src/db/schema'
import { autenticar } from '../../src/modulos/auth/autenticacao'
import { gerarHash } from '../../src/modulos/auth/senha'
import { buscarUsuarioPorToken } from '../../src/modulos/auth/sessao'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function criarLucilene(ativo = true) {
  await db.insert(usuarios).values({
    nome: 'Lucilene',
    email: 'lucilene@planetamotores.com.br',
    senhaHash: await gerarHash('motor2tempos'),
    ativo,
  })
}

test('autentica com credenciais corretas e abre sessão', async () => {
  await criarLucilene()

  const r = await autenticar('lucilene@planetamotores.com.br', 'motor2tempos')

  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect(await buscarUsuarioPorToken(r.dados)).not.toBeNull()
})

test('aceita e-mail com maiúsculas e espaços em volta', async () => {
  await criarLucilene()

  const r = await autenticar('  LUCILENE@planetamotores.com.br ', 'motor2tempos')

  expect(r.ok).toBe(true)
})

test('senha errada devolve a mesma mensagem que e-mail inexistente', async () => {
  await criarLucilene()

  const senhaErrada = await autenticar('lucilene@planetamotores.com.br', 'errada')
  const semUsuario = await autenticar('ninguem@planetamotores.com.br', 'motor2tempos')

  expect(senhaErrada.ok).toBe(false)
  expect(semUsuario.ok).toBe(false)
  if (senhaErrada.ok || semUsuario.ok) return
  // Mensagem única de propósito: distinguir os dois casos entrega quais
  // e-mails existem a quem estiver tentando adivinhar.
  expect(senhaErrada.erro).toBe('E-mail ou senha inválidos.')
  expect(semUsuario.erro).toBe(senhaErrada.erro)
})

test('usuário inativo não autentica', async () => {
  await criarLucilene(false)

  const r = await autenticar('lucilene@planetamotores.com.br', 'motor2tempos')

  expect(r.ok).toBe(false)
})
