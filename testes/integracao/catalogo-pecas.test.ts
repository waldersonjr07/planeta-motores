import { beforeEach, expect, test } from 'vitest'
import { listarPecas, obterPeca } from '../../src/modulos/catalogo/pecas-consultas'
import { entradaPeca } from '../../src/modulos/catalogo/pecas-esquemas'
import {
  atualizarPeca,
  criarPeca,
  definirAtivoPeca,
} from '../../src/modulos/catalogo/pecas-operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

function entrada(extra: Record<string, unknown> = {}) {
  return entradaPeca.parse({
    nome: 'Óleo 2 tempos',
    marca: 'Ipiranga',
    unidade: 'L',
    controlaSaldo: 'on',
    quantidadeMinima: '0,5',
    ...extra,
  })
}

test('grava unidade, controle de saldo e mínimo fracionado', async () => {
  const r = await criarPeca(entrada())

  expect(r.ok).toBe(true)
  if (!r.ok) return
  const peca = await obterPeca(r.dados.id)
  expect(peca?.unidade).toBe('L')
  expect(peca?.controlaSaldo).toBe(true)
  expect(Number(peca?.quantidadeMinima)).toBe(0.5)
})

test('o cadastro não guarda preço: peça não tem tabela', async () => {
  // O esquema ignora o campo, mesmo que alguém o envie pelo formulário.
  const analise = entradaPeca.safeParse({
    nome: 'Vela NGK',
    unidade: 'un',
    quantidadeMinima: '0',
    precoVenda: '18,00',
  })

  expect(analise.success).toBe(true)
  if (!analise.success) return
  expect(analise.data).not.toHaveProperty('precoVenda')
})

test('caixa de seleção desmarcada desliga o controle de saldo', async () => {
  const r = await criarPeca(entrada({ controlaSaldo: undefined }))

  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect((await obterPeca(r.dados.id))?.controlaSaldo).toBe(false)
})

test('quantidade mínima inválida é recusada na validação', () => {
  expect(() => entrada({ quantidadeMinima: 'meio litro' })).toThrow()
})

test('lista em ordem alfabética e esconde inativas', async () => {
  await criarPeca(entrada({ nome: 'Vela NGK' }))
  const oleo = await criarPeca(entrada({ nome: 'Óleo 2 tempos' }))
  if (!oleo.ok) throw new Error('criação falhou')

  expect((await listarPecas()).map((p) => p.nome)).toEqual(['Óleo 2 tempos', 'Vela NGK'])

  await definirAtivoPeca(oleo.dados.id, false)

  expect((await listarPecas()).map((p) => p.nome)).toEqual(['Vela NGK'])
  expect(await listarPecas(true)).toHaveLength(2)
})

test('atualizar peça inexistente falha sem estourar', async () => {
  const r = await atualizarPeca('00000000-0000-0000-0000-000000000000', entrada())

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Peça não encontrada.')
})
