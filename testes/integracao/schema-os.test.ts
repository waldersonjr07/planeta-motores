import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import {
  clientes,
  compraItens,
  compras,
  equipamentos,
  estoqueMovimentos,
  fornecedores,
  ordensServico,
  osHistorico,
  osItens,
  osNumeracao,
  pecas,
} from '../../src/db/schema'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function baseOs() {
  const [cliente] = await db.insert(clientes).values({ nome: 'Marcos' }).returning()
  const [equipamento] = await db
    .insert(equipamentos)
    .values({ clienteId: cliente.id, tipoMotor: '2T', aplicacao: 'rocadeira' })
    .returning()
  const [os] = await db
    .insert(ordensServico)
    .values({ numero: '2026-0001', clienteId: cliente.id, equipamentoId: equipamento.id })
    .returning()
  return { cliente, equipamento, os }
}

test('a OS nasce recebida, sem orçamento e sem desconto', async () => {
  const { os } = await baseOs()

  expect(os.situacao).toBe('recebido')
  expect(os.versaoOrcamento).toBe(0)
  expect(os.descontoCentavos).toBe(0)
  expect(os.recebidoEm).toBeInstanceOf(Date)
})

test('o número da OS é único', async () => {
  const { cliente, equipamento } = await baseOs()

  await expect(
    db.insert(ordensServico).values({
      numero: '2026-0001',
      clienteId: cliente.id,
      equipamentoId: equipamento.id,
    }),
  ).rejects.toThrow()
})

test('apagar a OS apaga itens e histórico', async () => {
  const { os } = await baseOs()
  await db.insert(osItens).values({
    osId: os.id,
    tipo: 'servico',
    descricao: 'Limpeza',
    quantidade: '1',
    precoUnitarioCentavos: 6200,
  })
  await db.insert(osHistorico).values({ osId: os.id, situacaoNova: 'recebido' })

  await db.delete(ordensServico)

  expect(await db.select().from(osItens)).toHaveLength(0)
  expect(await db.select().from(osHistorico)).toHaveLength(0)
})

test('item da OS guarda quantidade fracionada', async () => {
  const { os } = await baseOs()

  const [item] = await db
    .insert(osItens)
    .values({
      osId: os.id,
      tipo: 'peca',
      descricao: 'Óleo 2T',
      quantidade: '0.500',
      precoUnitarioCentavos: 3800,
    })
    .returning()

  expect(Number(item.quantidade)).toBe(0.5)
})

test('a numeração é única por ano', async () => {
  await db.insert(osNumeracao).values({ ano: 2026, ultimoNumero: 1 })

  await expect(db.insert(osNumeracao).values({ ano: 2026, ultimoNumero: 2 })).rejects.toThrow()
})

test('movimento de estoque aceita quantidade negativa', async () => {
  const [peca] = await db.insert(pecas).values({ nome: 'Vela' }).returning()

  const [movimento] = await db
    .insert(estoqueMovimentos)
    .values({ pecaId: peca.id, tipo: 'saida_os', quantidade: '-2' })
    .returning()

  expect(Number(movimento.quantidade)).toBe(-2)
})

test('apagar a compra apaga seus itens', async () => {
  const [fornecedor] = await db.insert(fornecedores).values({ nome: 'Rio Claro' }).returning()
  const [peca] = await db.insert(pecas).values({ nome: 'Kit cilindro' }).returning()
  const [compra] = await db
    .insert(compras)
    .values({ fornecedorId: fornecedor.id, data: '2026-07-30' })
    .returning()
  await db.insert(compraItens).values({
    compraId: compra.id,
    pecaId: peca.id,
    quantidade: '1',
    custoUnitarioCentavos: 23000,
  })

  await db.delete(compras)

  expect(await db.select().from(compraItens)).toHaveLength(0)
})
