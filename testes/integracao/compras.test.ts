import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { fornecedores, pecas } from '../../src/db/schema'
import { listarCompras, obterCompra } from '../../src/modulos/compras/consultas'
import { registrarCompra } from '../../src/modulos/compras/operacoes'
import { saldoDaPeca } from '../../src/modulos/estoque/consultas'
import { limparBanco } from '../ajuda/banco'
import { cenarioOs } from '../ajuda/os'

beforeEach(limparBanco)

async function cenario() {
  const [fornecedor] = await db
    .insert(fornecedores)
    .values({ nome: 'Peças Rio Claro' })
    .returning()
  const [peca] = await db
    .insert(pecas)
    .values({ nome: 'Kit cilindro 40mm', controlaSaldo: false })
    .returning()
  return { fornecedor, peca }
}

test('cada item da compra entra no estoque', async () => {
  const { fornecedor, peca } = await cenario()

  const r = await registrarCompra({
    fornecedorId: fornecedor.id,
    data: '2026-07-30',
    itens: [{ pecaId: peca.id, quantidade: 3, custoUnitarioCentavos: 23000 }],
  })

  expect(r.ok).toBe(true)
  expect(await saldoDaPeca(peca.id)).toBe(3)
})

test('a compra atualiza o último custo da peça', async () => {
  const { fornecedor, peca } = await cenario()

  await registrarCompra({
    fornecedorId: fornecedor.id,
    data: '2026-07-30',
    itens: [{ pecaId: peca.id, quantidade: 1, custoUnitarioCentavos: 23000 }],
  })
  await registrarCompra({
    fornecedorId: fornecedor.id,
    data: '2026-07-31',
    itens: [{ pecaId: peca.id, quantidade: 1, custoUnitarioCentavos: 25000 }],
  })

  const [atual] = await db.select().from(pecas).where(eq(pecas.id, peca.id))
  expect(atual.ultimoCustoCentavos).toBe(25000)
})

test('compra sem item é recusada', async () => {
  const { fornecedor } = await cenario()

  const r = await registrarCompra({
    fornecedorId: fornecedor.id,
    data: '2026-07-30',
    itens: [],
  })

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Inclua ao menos uma peça na compra.')
})

test('compra com peça inexistente é recusada e nada é gravado', async () => {
  const { fornecedor } = await cenario()

  const r = await registrarCompra({
    fornecedorId: fornecedor.id,
    data: '2026-07-30',
    itens: [
      { pecaId: '00000000-0000-0000-0000-000000000000', quantidade: 1, custoUnitarioCentavos: 100 },
    ],
  })

  expect(r.ok).toBe(false)
  expect(await listarCompras()).toHaveLength(0)
})

test('compra vinculada a uma OS guarda o vínculo', async () => {
  const { osId, numero } = await cenarioOs()
  const { fornecedor, peca } = await cenario()

  await registrarCompra({
    fornecedorId: fornecedor.id,
    osId,
    data: '2026-07-30',
    itens: [{ pecaId: peca.id, quantidade: 1, custoUnitarioCentavos: 23000 }],
  })

  const [linha] = await listarCompras()
  expect(linha.osNumero).toBe(numero)
})

test('o total da compra é a soma dos itens, com quantidade fracionada', async () => {
  const { fornecedor, peca } = await cenario()
  const [oleo] = await db.insert(pecas).values({ nome: 'Óleo 2T', unidade: 'L' }).returning()

  const r = await registrarCompra({
    fornecedorId: fornecedor.id,
    data: '2026-07-30',
    itens: [
      { pecaId: peca.id, quantidade: 2, custoUnitarioCentavos: 23000 },
      { pecaId: oleo.id, quantidade: 0.5, custoUnitarioCentavos: 3000 },
    ],
  })
  if (!r.ok) throw new Error('compra falhou')

  // 2 × 230,00 + 0,5 × 30,00 = 475,00
  expect((await obterCompra(r.dados.id))?.totalCentavos).toBe(47500)
  expect((await listarCompras())[0].totalCentavos).toBe(47500)
})
