import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { ordensServico, servicos } from '../../src/db/schema'
import { listarOs, obterOs } from '../../src/modulos/os/consultas'
import {
  adicionarItem,
  definirDesconto,
  removerItem,
} from '../../src/modulos/os/operacoes'
import { limparBanco } from '../ajuda/banco'
import { cenarioOs } from '../ajuda/os'

beforeEach(limparBanco)

test('o item copia nome e preço do catálogo no lançamento', async () => {
  const { osId, servico } = await cenarioOs()

  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })

  const os = await obterOs(osId)
  expect(os?.itens[0].descricao).toBe('Retífica de cilindro')
  expect(os?.itens[0].precoUnitarioCentavos).toBe(21000)
})

test('renomear no catálogo não altera item já lançado', async () => {
  const { osId, servico } = await cenarioOs()
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })

  await db
    .update(servicos)
    .set({ nome: 'Retífica completa', precoPadraoCentavos: 30000 })
    .where(eq(servicos.id, servico.id))

  const os = await obterOs(osId)
  expect(os?.itens[0].descricao).toBe('Retífica de cilindro')
  expect(os?.itens[0].precoUnitarioCentavos).toBe(21000)
})

test('preço informado tem precedência sobre o do catálogo', async () => {
  const { osId, servico } = await cenarioOs()

  await adicionarItem(osId, {
    tipo: 'servico',
    referenciaId: servico.id,
    quantidade: 1,
    precoUnitarioCentavos: 18000,
  })

  expect((await obterOs(osId))?.itens[0].precoUnitarioCentavos).toBe(18000)
})

test('os totais separam peça de serviço e aplicam desconto', async () => {
  const { osId, servico, peca } = await cenarioOs()
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 0.5 })

  await definirDesconto(osId, 1000)

  const os = await obterOs(osId)
  expect(os?.totais.servicosCentavos).toBe(21000)
  expect(os?.totais.pecasCentavos).toBe(1900)
  expect(os?.totais.totalCentavos).toBe(21900)
})

test('remover item recalcula o total', async () => {
  const { osId, servico } = await cenarioOs()
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  const os = await obterOs(osId)

  await removerItem(os!.itens[0].id)

  expect((await obterOs(osId))?.totais.totalCentavos).toBe(0)
})

test('OS entregue não aceita item novo', async () => {
  const { osId, servico } = await cenarioOs()
  await db.update(ordensServico).set({ situacao: 'entregue' }).where(eq(ordensServico.id, osId))

  const r = await adicionarItem(osId, {
    tipo: 'servico',
    referenciaId: servico.id,
    quantidade: 1,
  })

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Esta ordem de serviço está encerrada e não aceita alteração de itens.')
})

test('quantidade zero ou negativa é recusada', async () => {
  const { osId, servico } = await cenarioOs()

  const zero = await adicionarItem(osId, {
    tipo: 'servico',
    referenciaId: servico.id,
    quantidade: 0,
  })
  const negativa = await adicionarItem(osId, {
    tipo: 'servico',
    referenciaId: servico.id,
    quantidade: -1,
  })

  expect(zero.ok).toBe(false)
  expect(negativa.ok).toBe(false)
})

test('a lista de OS traz o total somado no banco, com desconto', async () => {
  const { osId, servico, peca } = await cenarioOs()
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  await adicionarItem(osId, { tipo: 'peca', referenciaId: peca.id, quantidade: 2 })
  await definirDesconto(osId, 1000)

  // 21.000 + 2 × 3.800 − 1.000 = 27.600. O total da lista vem de um subselect
  // correlacionado; sem a correlação certa ele volta zerado em silêncio.
  const [linha] = await listarOs({})
  expect(linha.totalCentavos).toBe(27600)
})

test('desconto negativo é recusado', async () => {
  const { osId } = await cenarioOs()

  expect((await definirDesconto(osId, -100)).ok).toBe(false)
})
