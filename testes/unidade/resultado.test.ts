import { expect, test } from 'vitest'
import { z } from 'zod'
import { falha, falhaDeValidacao, sucesso } from '../../src/lib/resultado'

test('sucesso carrega os dados', () => {
  const r = sucesso({ id: 'abc' })
  expect(r).toEqual({ ok: true, dados: { id: 'abc' } })
})

test('falha carrega a mensagem', () => {
  expect(falha('Cliente não encontrado.')).toEqual({
    ok: false,
    erro: 'Cliente não encontrado.',
  })
})

test('falhaDeValidacao mapeia cada campo para a primeira mensagem', () => {
  const esquema = z.object({ nome: z.string().min(1, 'Nome é obrigatório') })
  const analise = esquema.safeParse({ nome: '' })
  if (analise.success) throw new Error('o esquema deveria ter recusado')

  const r = falhaDeValidacao(analise.error)
  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.campos).toEqual({ nome: 'Nome é obrigatório' })
  expect(r.erro).toBe('Confira os campos destacados.')
})
