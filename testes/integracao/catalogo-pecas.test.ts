import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { pecas } from '../../src/db/schema'
import { listarPecas, obterPeca } from '../../src/modulos/catalogo/pecas-consultas'
import { entradaPeca } from '../../src/modulos/catalogo/pecas-esquemas'
import {
  atualizarPeca,
  criarPeca,
  criarPecaMinima,
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

test('criarPecaMinima cria com o nome e a unidade, e o resto no padrão', async () => {
  const { id } = await criarPecaMinima('Vela NGK BPMR7A', 'un')

  const [peca] = await db.select().from(pecas).where(eq(pecas.id, id))
  expect(peca.nome).toBe('Vela NGK BPMR7A')
  expect(peca.unidade).toBe('un')
  expect(peca.controlaSaldo).toBe(false)
  expect(peca.ativo).toBe(true)
  expect(peca.ultimoCustoCentavos).toBeNull()
})

test('criarPecaMinima respeita a unidade de volume', async () => {
  const { id } = await criarPecaMinima('Óleo 2T Motul', 'L')

  const [peca] = await db.select().from(pecas).where(eq(pecas.id, id))
  expect(peca.unidade).toBe('L')
})

test('criarPecaMinima apara o nome', async () => {
  const { id } = await criarPecaMinima('  Bujão  ', 'un')

  const [peca] = await db.select().from(pecas).where(eq(pecas.id, id))
  expect(peca.nome).toBe('Bujão')
})

test('criarPecaMinima dentro de transacao com rollback não grava nada', async () => {
  await db
    .transaction(async (tx) => {
      await criarPecaMinima('Peça fantasma', 'un', tx)
      throw new Error('força o rollback')
    })
    .catch(() => {})

  expect(await db.select().from(pecas)).toHaveLength(0)
})

test('criarPecaMinima dentro de transacao com commit grava corretamente', async () => {
  let idCriado: string
  await db.transaction(async (tx) => {
    const resultado = await criarPecaMinima('Peça real', 'L', tx)
    idCriado = resultado.id
  })

  const [peca] = await db.select().from(pecas).where(eq(pecas.id, idCriado!))
  expect(peca.nome).toBe('Peça real')
  expect(peca.unidade).toBe('L')
})
