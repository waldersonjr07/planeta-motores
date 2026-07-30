import { beforeEach, expect, test } from 'vitest'
import {
  listarServicos,
  obterServico,
} from '../../src/modulos/catalogo/servicos-consultas'
import { entradaServico } from '../../src/modulos/catalogo/servicos-esquemas'
import {
  atualizarServico,
  criarServico,
  definirAtivoServico,
} from '../../src/modulos/catalogo/servicos-operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

function entrada(extra: Record<string, unknown> = {}) {
  return entradaServico.parse({
    nome: 'Limpeza de carburador',
    descricao: '',
    precoPadrao: '62,00',
    ...extra,
  })
}

test('o preço digitado é guardado em centavos', async () => {
  const r = await criarServico(entrada({ precoPadrao: '1.250,50' }))

  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect((await obterServico(r.dados.id))?.precoPadraoCentavos).toBe(125050)
})

test('preço em branco vale zero', async () => {
  const r = await criarServico(entrada({ precoPadrao: '' }))

  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect((await obterServico(r.dados.id))?.precoPadraoCentavos).toBe(0)
})

test('preço com texto inválido é recusado na validação', () => {
  expect(() => entrada({ precoPadrao: 'caro' })).toThrow()
})

test('lista em ordem alfabética e esconde inativos', async () => {
  await criarServico(entrada({ nome: 'Retífica de cilindro' }))
  const limpeza = await criarServico(entrada({ nome: 'Limpeza de carburador' }))
  if (!limpeza.ok) throw new Error('criação falhou')

  expect((await listarServicos()).map((s) => s.nome)).toEqual([
    'Limpeza de carburador',
    'Retífica de cilindro',
  ])

  await definirAtivoServico(limpeza.dados.id, false)

  expect((await listarServicos()).map((s) => s.nome)).toEqual(['Retífica de cilindro'])
  expect(await listarServicos(true)).toHaveLength(2)
})

test('atualiza nome e preço', async () => {
  const criado = await criarServico(entrada())
  if (!criado.ok) throw new Error('criação falhou')

  const r = await atualizarServico(
    criado.dados.id,
    entrada({ nome: 'Limpeza completa', precoPadrao: '80,00' }),
  )

  expect(r.ok).toBe(true)
  const servico = await obterServico(criado.dados.id)
  expect(servico?.nome).toBe('Limpeza completa')
  expect(servico?.precoPadraoCentavos).toBe(8000)
})

test('atualizar serviço inexistente falha sem estourar', async () => {
  const r = await atualizarServico('00000000-0000-0000-0000-000000000000', entrada())

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Serviço não encontrado.')
})
