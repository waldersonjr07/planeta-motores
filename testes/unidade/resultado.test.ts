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

test('falhaDeValidacao devolve o que foi digitado quando recebe os valores', () => {
  const esquema = z.object({ nome: z.string().min(1, 'Nome é obrigatório') })
  const analise = esquema.safeParse({ nome: '' })
  if (analise.success) throw new Error('deveria falhar')

  const r = falhaDeValidacao(analise.error, {
    valores: { nome: '', telefone: '11999998888' },
  })

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.campos?.nome).toBe('Nome é obrigatório')
  expect(r.valores?.telefone).toBe('11999998888')
})

test('o eco carrega listas para o formulário que repete campos por linha', () => {
  // A compra manda `quantidade` uma vez por linha. Num objeto simples sobraria
  // só a última; a tela precisa de todas para se remontar igual.
  const r = falha('Informe o custo da linha 2.', {
    valores: { data: '2026-08-11' },
    listas: { quantidade: ['4', '0,5'], custo: ['30,00', ''] },
  })

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.valores?.data).toBe('2026-08-11')
  expect(r.listas?.quantidade).toEqual(['4', '0,5'])
  expect(r.listas?.custo).toEqual(['30,00', ''])
})

test('falhaDeValidacao sem valores não inclui a chave', () => {
  const esquema = z.object({ nome: z.string().min(1, 'Nome é obrigatório') })
  const analise = esquema.safeParse({ nome: '' })
  if (analise.success) throw new Error('deveria falhar')

  const r = falhaDeValidacao(analise.error)

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.valores).toBeUndefined()
})
