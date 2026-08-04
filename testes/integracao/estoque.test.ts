import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { pecas } from '../../src/db/schema'
import {
  listarMovimentosDaPeca,
  listarReposicao,
  listarSaldos,
  saldoDaPeca,
} from '../../src/modulos/estoque/consultas'
import { ajustarEstoque, registrarMovimento } from '../../src/modulos/estoque/operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function novaPeca(extra: Record<string, unknown> = {}) {
  const [peca] = await db
    .insert(pecas)
    .values({ nome: 'Óleo 2T', controlaSaldo: true, quantidadeMinima: '2', ...extra })
    .returning()
  return peca
}

test('peça sem movimento tem saldo zero', async () => {
  const peca = await novaPeca()
  expect(await saldoDaPeca(peca.id)).toBe(0)
})

test('o saldo é a soma dos movimentos', async () => {
  const peca = await novaPeca()
  await registrarMovimento({ pecaId: peca.id, tipo: 'entrada_compra', quantidade: 10 })
  await registrarMovimento({ pecaId: peca.id, tipo: 'saida_os', quantidade: -3 })
  await registrarMovimento({ pecaId: peca.id, tipo: 'saida_os', quantidade: -1.5 })

  expect(await saldoDaPeca(peca.id)).toBe(5.5)
})

test('saldo negativo é permitido, não bloqueado', async () => {
  const peca = await novaPeca()
  await registrarMovimento({ pecaId: peca.id, tipo: 'saida_os', quantidade: -2 })

  expect(await saldoDaPeca(peca.id)).toBe(-2)
})

test('ajuste sem motivo é aceito — a tela confirma no lugar de exigir', async () => {
  const peca = await novaPeca()

  const r = await ajustarEstoque({ pecaId: peca.id, quantidade: 5 })

  expect(r.ok).toBe(true)
  expect(await saldoDaPeca(peca.id)).toBe(5)
})

test('o motivo, quando informado, fica gravado no movimento', async () => {
  const peca = await novaPeca()

  await ajustarEstoque({ pecaId: peca.id, quantidade: 5, motivo: '  Inventário  ' })

  const [movimento] = await listarMovimentosDaPeca(peca.id)
  expect(movimento.motivo).toBe('Inventário')
})

test('ajuste move o saldo nos dois sentidos', async () => {
  const peca = await novaPeca()

  await ajustarEstoque({ pecaId: peca.id, quantidade: 8, motivo: 'Inventário inicial' })
  await ajustarEstoque({ pecaId: peca.id, quantidade: -3, motivo: 'Perda' })

  expect(await saldoDaPeca(peca.id)).toBe(5)
})

test('ajuste de quantidade zero é recusado', async () => {
  const peca = await novaPeca()

  const r = await ajustarEstoque({ pecaId: peca.id, quantidade: 0, motivo: 'Nada' })

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Informe uma quantidade diferente de zero.')
})

test('a reposição traz só quem controla saldo e está no mínimo ou abaixo', async () => {
  const oleo = await novaPeca({ nome: 'Óleo 2T', quantidadeMinima: '2' })
  const vela = await novaPeca({ nome: 'Vela NGK', quantidadeMinima: '5' })
  const kit = await novaPeca({ nome: 'Kit cilindro', controlaSaldo: false })

  await registrarMovimento({ pecaId: oleo.id, tipo: 'entrada_compra', quantidade: 10 })
  await registrarMovimento({ pecaId: vela.id, tipo: 'entrada_compra', quantidade: 5 })
  await registrarMovimento({ pecaId: kit.id, tipo: 'saida_os', quantidade: -4 })

  const reposicao = await listarReposicao()

  // Óleo tem 10 (acima de 2); Vela tem 5 (igual ao mínimo, entra);
  // Kit não controla saldo, mesmo estando negativo.
  expect(reposicao.map((p) => p.nome)).toEqual(['Vela NGK'])
})

test('a lista de saldos marca quem está abaixo do mínimo', async () => {
  const peca = await novaPeca({ quantidadeMinima: '4' })
  await registrarMovimento({ pecaId: peca.id, tipo: 'entrada_compra', quantidade: 1 })

  const [saldo] = await listarSaldos()

  expect(saldo.saldo).toBe(1)
  expect(saldo.abaixoDoMinimo).toBe(true)
})
