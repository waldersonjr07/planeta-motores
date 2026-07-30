import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { configuracoes, sessoes, usuarios } from '../../src/db/schema'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

test('grava um usuário com valores padrão', async () => {
  const [criado] = await db
    .insert(usuarios)
    .values({ nome: 'Lucilene', email: 'lucilene@planetamotores.com.br', senhaHash: 'x' })
    .returning()

  expect(criado.id).toMatch(/^[0-9a-f-]{36}$/)
  expect(criado.ativo).toBe(true)
  expect(criado.criadoEm).toBeInstanceOf(Date)
})

test('o e-mail do usuário é único', async () => {
  const dados = { nome: 'Lucilene', email: 'lucilene@planetamotores.com.br', senhaHash: 'x' }
  await db.insert(usuarios).values(dados)
  await expect(db.insert(usuarios).values(dados)).rejects.toThrow()
})

test('apagar o usuário apaga suas sessões', async () => {
  const [usuario] = await db
    .insert(usuarios)
    .values({ nome: 'Lucilene', email: 'l@p.com', senhaHash: 'x' })
    .returning()
  await db.insert(sessoes).values({
    id: 'hash-de-token',
    usuarioId: usuario.id,
    expiraEm: new Date(Date.now() + 3_600_000),
  })

  await db.delete(usuarios).where(eq(usuarios.id, usuario.id))

  expect(await db.select().from(sessoes)).toHaveLength(0)
})

test('configuracoes aceita uma linha e traz padrões preenchidos', async () => {
  const [linha] = await db.insert(configuracoes).values({ id: 1 }).returning()

  expect(linha.empresaNome).toBe('Planeta Motores')
  expect(linha.orcamentoValidadeDias).toBe(15)
  expect(linha.modeloMsgPronto).toContain('{{cliente}}')
})
