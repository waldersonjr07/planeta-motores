import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { sessoes, usuarios } from '../../src/db/schema'
import {
  buscarUsuarioPorToken,
  criarSessao,
  encerrarSessao,
} from '../../src/modulos/auth/sessao'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function criarUsuario(ativo = true) {
  const [usuario] = await db
    .insert(usuarios)
    .values({
      nome: 'Lucilene',
      email: 'lucilene@planetamotores.com.br',
      senhaHash: 'x',
      ativo,
    })
    .returning()
  return usuario
}

test('a sessão criada resolve para o usuário', async () => {
  const usuario = await criarUsuario()
  const token = await criarSessao(usuario.id)

  const encontrado = await buscarUsuarioPorToken(token)
  expect(encontrado).toEqual({
    id: usuario.id,
    nome: 'Lucilene',
    email: 'lucilene@planetamotores.com.br',
  })
})

test('o token não é gravado em claro no banco', async () => {
  const usuario = await criarUsuario()
  const token = await criarSessao(usuario.id)

  const [linha] = await db.select().from(sessoes)
  expect(linha.id).not.toBe(token)
  expect(linha.id).toHaveLength(64)
})

test('token desconhecido não resolve', async () => {
  expect(await buscarUsuarioPorToken('inventado')).toBeNull()
})

test('sessão expirada não resolve', async () => {
  const usuario = await criarUsuario()
  const token = await criarSessao(usuario.id)
  await db
    .update(sessoes)
    .set({ expiraEm: new Date(Date.now() - 1000) })
    .where(eq(sessoes.usuarioId, usuario.id))

  expect(await buscarUsuarioPorToken(token)).toBeNull()
})

test('usuário inativo não resolve, mesmo com sessão válida', async () => {
  const usuario = await criarUsuario(false)
  const token = await criarSessao(usuario.id)

  expect(await buscarUsuarioPorToken(token)).toBeNull()
})

test('encerrar a sessão invalida o token', async () => {
  const usuario = await criarUsuario()
  const token = await criarSessao(usuario.id)

  await encerrarSessao(token)

  expect(await buscarUsuarioPorToken(token)).toBeNull()
  expect(await db.select().from(sessoes)).toHaveLength(0)
})
