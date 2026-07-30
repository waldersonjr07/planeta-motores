import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { fornecedores, pecas, servicos } from '../../src/db/schema'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

test('serviço nasce ativo com preço zero', async () => {
  const [servico] = await db
    .insert(servicos)
    .values({ nome: 'Limpeza de carburador' })
    .returning()

  expect(servico.precoPadraoCentavos).toBe(0)
  expect(servico.ativo).toBe(true)
})

test('peça nasce sem controle de saldo e com mínimo zero', async () => {
  const [peca] = await db.insert(pecas).values({ nome: 'Kit cilindro 40mm' }).returning()

  expect(peca.controlaSaldo).toBe(false)
  expect(peca.unidade).toBe('un')
  // numeric volta como texto do driver; a conversão é responsabilidade da aplicação.
  expect(Number(peca.quantidadeMinima)).toBe(0)
})

test('peça guarda quantidade fracionada', async () => {
  const [peca] = await db
    .insert(pecas)
    .values({ nome: 'Óleo 2T', unidade: 'L', controlaSaldo: true, quantidadeMinima: '0.500' })
    .returning()

  expect(Number(peca.quantidadeMinima)).toBe(0.5)
})

test('fornecedor nasce ativo', async () => {
  const [fornecedor] = await db
    .insert(fornecedores)
    .values({ nome: 'Peças Rio Claro' })
    .returning()

  expect(fornecedor.ativo).toBe(true)
})
