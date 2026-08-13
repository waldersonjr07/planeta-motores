import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { fornecedores, pecas } from '../../src/db/schema'
import { listarCompras, obterCompra } from '../../src/modulos/compras/consultas'
import { registrarCompra } from '../../src/modulos/compras/operacoes'
import { saldoDaPeca } from '../../src/modulos/estoque/consultas'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

test('peça nova entra no cadastro, no estoque e com o último custo', async () => {
  const r = await registrarCompra({
    fornecedorNome: 'Peças Rio Claro',
    data: '2026-08-11',
    itens: [
      { pecaNome: 'Vela NGK BPMR7A', unidade: 'un', quantidade: 4, custoUnitarioCentavos: 2800 },
    ],
  })

  expect(r.ok).toBe(true)

  const [peca] = await db.select().from(pecas)
  expect(peca.nome).toBe('Vela NGK BPMR7A')
  expect(peca.unidade).toBe('un')
  expect(peca.ultimoCustoCentavos).toBe(2800)
  expect(await saldoDaPeca(peca.id)).toBe(4)

  const [fornecedor] = await db.select().from(fornecedores)
  expect(fornecedor.nome).toBe('Peças Rio Claro')
})

test('a unidade escolhida vale para a peça nova', async () => {
  await registrarCompra({
    data: '2026-08-11',
    itens: [
      { pecaNome: 'Óleo 2T Motul', unidade: 'L', quantidade: 0.5, custoUnitarioCentavos: 4500 },
    ],
  })

  const [peca] = await db.select().from(pecas)
  expect(peca.unidade).toBe('L')
  expect(await saldoDaPeca(peca.id)).toBe(0.5)
})

test('a mesma peça nova em duas linhas é criada uma vez só', async () => {
  const r = await registrarCompra({
    data: '2026-08-11',
    itens: [
      { pecaNome: 'Óleo 2T', unidade: 'L', quantidade: 1, custoUnitarioCentavos: 4500 },
      { pecaNome: 'óleo 2t', unidade: 'L', quantidade: 2, custoUnitarioCentavos: 4500 },
    ],
  })
  if (!r.ok) throw new Error('compra falhou')

  const todas = await db.select().from(pecas)
  expect(todas).toHaveLength(1)
  expect(await saldoDaPeca(todas[0].id)).toBe(3)
  expect((await obterCompra(r.dados.id))?.itens).toHaveLength(2)
})

test('peça existente e peça nova convivem na mesma compra', async () => {
  const [existente] = await db.insert(pecas).values({ nome: 'Kit cilindro' }).returning()

  await registrarCompra({
    data: '2026-08-11',
    itens: [
      { pecaId: existente.id, quantidade: 1, custoUnitarioCentavos: 23000 },
      { pecaNome: 'Retentor', unidade: 'un', quantidade: 2, custoUnitarioCentavos: 1500 },
    ],
  })

  expect(await db.select().from(pecas)).toHaveLength(2)
  expect(await saldoDaPeca(existente.id)).toBe(1)
})

test('fornecedor existente não é duplicado quando vem por id', async () => {
  const [fornecedor] = await db
    .insert(fornecedores)
    .values({ nome: 'Peças Rio Claro' })
    .returning()

  await registrarCompra({
    fornecedorId: fornecedor.id,
    data: '2026-08-11',
    itens: [
      { pecaNome: 'Vela', unidade: 'un', quantidade: 1, custoUnitarioCentavos: 2800 },
    ],
  })

  expect(await db.select().from(fornecedores)).toHaveLength(1)
})

test('falha no meio não deixa peça nem fornecedor órfão', async () => {
  const r = await registrarCompra({
    fornecedorNome: 'Peças Rio Claro',
    data: '2026-08-11',
    itens: [
      { pecaNome: 'Vela', unidade: 'un', quantidade: 1, custoUnitarioCentavos: 2800 },
      {
        pecaId: '00000000-0000-0000-0000-000000000000',
        quantidade: 1,
        custoUnitarioCentavos: 100,
      },
    ],
  })

  expect(r.ok).toBe(false)
  expect(await db.select().from(pecas)).toHaveLength(0)
  expect(await db.select().from(fornecedores)).toHaveLength(0)
  expect(await listarCompras()).toHaveLength(0)
})
