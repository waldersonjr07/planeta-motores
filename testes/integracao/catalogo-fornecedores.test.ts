import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { fornecedores } from '../../src/db/schema'
import {
  listarFornecedores,
  obterFornecedor,
} from '../../src/modulos/catalogo/fornecedores-consultas'
import { entradaFornecedor } from '../../src/modulos/catalogo/fornecedores-esquemas'
import {
  atualizarFornecedor,
  criarFornecedor,
  criarFornecedorMinimo,
  definirAtivoFornecedor,
} from '../../src/modulos/catalogo/fornecedores-operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

function entrada(extra: Record<string, unknown> = {}) {
  return entradaFornecedor.parse({
    nome: 'Peças Rio Claro',
    telefone: '(19) 3524-1122',
    email: '',
    observacoes: '',
    ...extra,
  })
}

test('grava o telefone somente com dígitos', async () => {
  const r = await criarFornecedor(entrada())

  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect((await obterFornecedor(r.dados.id))?.telefone).toBe('1935241122')
})

test('telefone sem DDD é recusado', () => {
  expect(() => entrada({ telefone: '35241122' })).toThrow()
})

test('lista em ordem alfabética e esconde inativos', async () => {
  await criarFornecedor(entrada({ nome: 'Zona Sul Motopeças' }))
  const rioClaro = await criarFornecedor(entrada({ nome: 'Peças Rio Claro' }))
  if (!rioClaro.ok) throw new Error('criação falhou')

  expect((await listarFornecedores()).map((f) => f.nome)).toEqual([
    'Peças Rio Claro',
    'Zona Sul Motopeças',
  ])

  await definirAtivoFornecedor(rioClaro.dados.id, false)

  expect((await listarFornecedores()).map((f) => f.nome)).toEqual(['Zona Sul Motopeças'])
  expect(await listarFornecedores(true)).toHaveLength(2)
})

test('atualizar fornecedor inexistente falha sem estourar', async () => {
  const r = await atualizarFornecedor('00000000-0000-0000-0000-000000000000', entrada())

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Fornecedor não encontrado.')
})

test('criarFornecedorMinimo cria só com o nome', async () => {
  const { id } = await criarFornecedorMinimo('Peças Rio Claro')

  const [fornecedor] = await db
    .select()
    .from(fornecedores)
    .where(eq(fornecedores.id, id))
  expect(fornecedor.nome).toBe('Peças Rio Claro')
  expect(fornecedor.ativo).toBe(true)
  expect(fornecedor.telefone).toBeNull()
})

test('criarFornecedorMinimo dentro de transacao com rollback não grava nada', async () => {
  await db
    .transaction(async (tx) => {
      await criarFornecedorMinimo('Fornecedor fantasma', tx)
      throw new Error('força o rollback')
    })
    .catch(() => {})

  expect(await db.select().from(fornecedores)).toHaveLength(0)
})

test('criarFornecedorMinimo dentro de transacao com commit grava corretamente', async () => {
  let idCriado: string
  await db.transaction(async (tx) => {
    const resultado = await criarFornecedorMinimo('Fornecedor real', tx)
    idCriado = resultado.id
  })

  const [fornecedor] = await db
    .select()
    .from(fornecedores)
    .where(eq(fornecedores.id, idCriado!))
  expect(fornecedor.nome).toBe('Fornecedor real')
  expect(fornecedor.ativo).toBe(true)
})
