import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { ordensServico, pecas, servicos } from '../../src/db/schema'
import { saldoDaPeca } from '../../src/modulos/estoque/consultas'
import { listarOs, obterOs } from '../../src/modulos/os/consultas'
import {
  adicionarItem,
  definirDesconto,
  mudarSituacao,
  removerItem,
} from '../../src/modulos/os/operacoes'
import { registrarPagamento } from '../../src/modulos/financeiro/operacoes'
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

test('o item de peça carrega a unidade do cadastro; o resto fica em un', async () => {
  const { osId, servico } = await cenarioOs()
  const [oleo] = await db
    .insert(pecas)
    .values({ nome: 'Óleo 2 tempos', unidade: 'L' })
    .returning()

  await adicionarItem(osId, {
    tipo: 'peca',
    referenciaId: oleo.id,
    quantidade: 0.5,
    precoUnitarioCentavos: 4500,
  })
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  await adicionarItem(osId, {
    tipo: 'peca',
    descricao: 'Parafuso avulso',
    quantidade: 4,
    precoUnitarioCentavos: 250,
  })

  const os = await obterOs(osId)
  const unidadePor = new Map(os!.itens.map((item) => [item.descricao, item.unidade]))

  // É o que a coluna UN do orçamento imprime. Meio litro de óleo saindo como
  // "0,500 un" é papel errado entregue na mão do cliente.
  expect(unidadePor.get('Óleo 2 tempos')).toBe('L')
  expect(unidadePor.get('Retífica de cilindro')).toBe('un')
  expect(unidadePor.get('Parafuso avulso')).toBe('un')
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
  await adicionarItem(osId, {
    tipo: 'peca',
    referenciaId: peca.id,
    quantidade: 0.5,
    precoUnitarioCentavos: 3800,
  })

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

test('item digitado entra sem catálogo, com descrição e valor informados', async () => {
  const { osId } = await cenarioOs()

  const r = await adicionarItem(osId, {
    tipo: 'servico',
    descricao: 'Mão de obra de desmontagem',
    quantidade: 1,
    precoUnitarioCentavos: 15000,
  })

  expect(r.ok).toBe(true)
  const os = await obterOs(osId)
  expect(os?.itens[0].descricao).toBe('Mão de obra de desmontagem')
  expect(os?.itens[0].precoUnitarioCentavos).toBe(15000)
  expect(os?.itens[0].servicoId).toBeNull()
  expect(os?.totais.servicosCentavos).toBe(15000)
})

test('item digitado como peça não referencia peça do catálogo', async () => {
  const { osId } = await cenarioOs()

  await adicionarItem(osId, {
    tipo: 'peca',
    descricao: 'Parafuso avulso',
    quantidade: 4,
    precoUnitarioCentavos: 250,
  })

  const os = await obterOs(osId)
  expect(os?.itens[0].pecaId).toBeNull()
  expect(os?.totais.pecasCentavos).toBe(1000)
})

test('peça do catálogo sem valor é recusada', async () => {
  const { osId, peca } = await cenarioOs()

  // Peça não tem preço de tabela: sem valor informado ela entraria zerada, e o
  // cliente não veria o que está pagando.
  const r = await adicionarItem(osId, {
    tipo: 'peca',
    referenciaId: peca.id,
    quantidade: 1,
  })

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Informe o valor da peça.')
})

test('serviço do catálogo continua herdando o preço padrão', async () => {
  const { osId, servico } = await cenarioOs()

  const r = await adicionarItem(osId, {
    tipo: 'servico',
    referenciaId: servico.id,
    quantidade: 1,
  })

  expect(r.ok).toBe(true)
  expect((await obterOs(osId))?.itens[0].precoUnitarioCentavos).toBe(21000)
})

test('item digitado sem valor é recusado', async () => {
  const { osId } = await cenarioOs()

  const r = await adicionarItem(osId, {
    tipo: 'servico',
    descricao: 'Serviço sem preço',
    quantidade: 1,
  })

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Informe o valor do item.')
})

test('item digitado como peça não movimenta estoque na conclusão', async () => {
  const { osId, peca } = await cenarioOs()
  await adicionarItem(osId, {
    tipo: 'peca',
    descricao: 'Parafuso avulso',
    quantidade: 4,
    precoUnitarioCentavos: 250,
  })
  for (const passo of [
    'em_diagnostico',
    'orcamento_enviado',
    'aprovado',
    'em_execucao',
    'pronto',
  ] as const) {
    await mudarSituacao(osId, passo)
  }

  // Item sem peça de catálogo não tem saldo a baixar; a do cenário fica intacta.
  expect(await saldoDaPeca(peca.id)).toBe(0)
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
  await adicionarItem(osId, {
    tipo: 'peca',
    referenciaId: peca.id,
    quantidade: 2,
    precoUnitarioCentavos: 3800,
  })
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

test('OS com status pronto não aceita adicionar item, remover item ou alterar desconto', async () => {
  const { osId, servico } = await cenarioOs()
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  const os = await obterOs(osId)
  const itemId = os!.itens[0].id

  await db.update(ordensServico).set({ situacao: 'pronto' }).where(eq(ordensServico.id, osId))

  const add = await adicionarItem(osId, {
    tipo: 'servico',
    descricao: 'Ajuste extra',
    quantidade: 1,
    precoUnitarioCentavos: 5000,
  })
  expect(add.ok).toBe(false)
  if (!add.ok) expect(add.erro).toContain('Pronto')

  const rem = await removerItem(itemId)
  expect(rem.ok).toBe(false)
  if (!rem.ok) expect(rem.erro).toContain('Pronto')

  const desc = await definirDesconto(osId, 1000)
  expect(desc.ok).toBe(false)
  if (!desc.ok) expect(desc.erro).toContain('Pronto')
})

test('desconto maior do que o subtotal da OS é recusado', async () => {
  const { osId, servico } = await cenarioOs()
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 }) // 21000

  const r = await definirDesconto(osId, 25000)
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.erro).toContain('maior do que o subtotal')
})

test('desconto não pode deixar o total da OS menor do que os pagamentos já registrados', async () => {
  const { osId, servico } = await cenarioOs()
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 }) // 21000

  await registrarPagamento({
    osId,
    valorCentavos: 15000,
    forma: 'pix',
    data: '2026-07-30',
    observacao: 'Sinal de entrada',
  })

  // Novo total seria 21000 - 10000 = 11000, menor que o pago de 15000
  const r = await definirDesconto(osId, 10000)
  expect(r.ok).toBe(false)
  if (!r.ok) {
    expect(r.erro).toContain('menor do que o valor já pago')
  }

  // Desconto de 5000 deixa total = 16000 >= 15000 -> permitido
  const permitido = await definirDesconto(osId, 5000)
  expect(permitido.ok).toBe(true)
})

test('remover item não pode deixar o total da OS menor do que os pagamentos já registrados', async () => {
  const { osId, servico, peca } = await cenarioOs()
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 }) // 21000
  await adicionarItem(osId, {
    tipo: 'peca',
    referenciaId: peca.id,
    quantidade: 2,
    precoUnitarioCentavos: 5000, // 10000
  })
  // Total: 31000
  const os = await obterOs(osId)
  const itemServico = os!.itens.find((i) => i.tipo === 'servico')!
  const itemPeca = os!.itens.find((i) => i.tipo === 'peca')!

  // Cliente pagou 20000
  await registrarPagamento({
    osId,
    valorCentavos: 20000,
    forma: 'pix',
    data: '2026-07-30',
    observacao: 'Sinal',
  })

  // Remover serviço (21000) deixaria total em 10000, menor que os 20000 já pagos
  const r = await removerItem(itemServico.id)
  expect(r.ok).toBe(false)
  if (!r.ok) {
    expect(r.erro).toContain('ficaria menor do que o valor já pago')
  }

  // Remover peça (10000) deixaria total em 21000, maior que 20000 -> permitido
  const permitido = await removerItem(itemPeca.id)
  expect(permitido.ok).toBe(true)
})

test('removerItem com UUID inválido retorna falha sem estourar 500 no banco', async () => {
  const r = await removerItem('item-invalido-123')
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.erro).toBe('Item não encontrado.')
})
