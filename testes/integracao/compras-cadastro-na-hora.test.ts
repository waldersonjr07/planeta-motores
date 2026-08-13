import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { fornecedores, pecas } from '../../src/db/schema'
import { criarFornecedorMinimo } from '../../src/modulos/catalogo/fornecedores-operacoes'
import { criarPecaMinima } from '../../src/modulos/catalogo/pecas-operacoes'
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

test('peça já cadastrada não é duplicada quando o nome é digitado', async () => {
  // Acento e caixa diferentes, e o texto da opção na tela ainda traz marca e
  // unidade — quem digita escreve o nome, e é por ele que tem de casar.
  const [existente] = await db
    .insert(pecas)
    .values({ nome: 'Óleo 2 Tempos', unidade: 'L' })
    .returning()

  await registrarCompra({
    data: '2026-08-11',
    itens: [
      { pecaNome: 'oleo 2 tempos', unidade: 'un', quantidade: 2, custoUnitarioCentavos: 4500 },
    ],
  })

  const todas = await db.select().from(pecas)
  expect(todas).toHaveLength(1)
  expect(todas[0].id).toBe(existente.id)
  // A unidade cadastrada continua valendo: a peça não nasceu agora.
  expect(todas[0].unidade).toBe('L')
  // O saldo fica inteiro numa peça só, que é o que estava em risco.
  expect(await saldoDaPeca(existente.id)).toBe(2)
  expect(todas[0].ultimoCustoCentavos).toBe(4500)
})

test('fornecedor já cadastrado não é duplicado quando o nome é digitado', async () => {
  const [existente] = await db
    .insert(fornecedores)
    .values({ nome: 'Peças Rio Claro' })
    .returning()

  const r = await registrarCompra({
    fornecedorNome: 'pecas rio claro',
    data: '2026-08-11',
    itens: [
      { pecaNome: 'Vela', unidade: 'un', quantidade: 1, custoUnitarioCentavos: 2800 },
    ],
  })
  if (!r.ok) throw new Error('compra falhou')

  expect(await db.select().from(fornecedores)).toHaveLength(1)
  expect((await obterCompra(r.dados.id))?.fornecedorId).toBe(existente.id)
})

test('criarPecaMinima e criarFornecedorMinimo devolvem o cadastro que já existe', async () => {
  const [peca] = await db.insert(pecas).values({ nome: 'Retentor Traseiro' }).returning()
  const [fornecedor] = await db
    .insert(fornecedores)
    .values({ nome: 'Distribuidora São José' })
    .returning()

  expect((await criarPecaMinima('  retentor traseiro ', 'L')).id).toBe(peca.id)
  expect((await criarFornecedorMinimo('DISTRIBUIDORA SAO JOSE')).id).toBe(fornecedor.id)

  expect(await db.select().from(pecas)).toHaveLength(1)
  expect(await db.select().from(fornecedores)).toHaveLength(1)
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

test('peça inexistente é recusada antes de abrir a transação, sem gravar nada', async () => {
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

test('falha dentro da transação não deixa peça, fornecedor nem compra órfãos', async () => {
  // Ao contrário do teste acima, aqui as duas peças e o fornecedor já foram
  // gravados (sem commit) dentro da mesma transação quando o segundo item
  // estoura a coluna `integer` de custo — é o rollback de verdade que este
  // teste prova, não a rejeição adiantada do pré-check de `pecaId`.
  await expect(
    registrarCompra({
      fornecedorNome: 'Peças Rio Claro',
      data: '2026-08-11',
      itens: [
        { pecaNome: 'Vela', unidade: 'un', quantidade: 1, custoUnitarioCentavos: 2800 },
        {
          pecaNome: 'Retentor',
          unidade: 'un',
          quantidade: 1,
          custoUnitarioCentavos: 99_999_999_999,
        },
      ],
    }),
  ).rejects.toThrow()

  expect(await db.select().from(pecas)).toHaveLength(0)
  expect(await db.select().from(fornecedores)).toHaveLength(0)
  expect(await listarCompras()).toHaveLength(0)
})
