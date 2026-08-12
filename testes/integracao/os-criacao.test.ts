import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { clientes, equipamentos, servicos } from '../../src/db/schema'
import { listarOs, obterOs } from '../../src/modulos/os/consultas'
import { criarOs } from '../../src/modulos/os/operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function cenario() {
  const [cliente] = await db.insert(clientes).values({ nome: 'Marcos Andrade' }).returning()
  const [equipamento] = await db
    .insert(equipamentos)
    .values({
      clienteId: cliente.id,
      tipoMotor: '2T',
      aplicacao: 'rocadeira',
      marca: 'Stihl',
      modelo: 'FS 220',
    })
    .returning()
  const [servico] = await db
    .insert(servicos)
    .values({ nome: 'Limpeza de carburador', precoPadraoCentavos: 6200 })
    .returning()
  return { cliente, equipamento, servico }
}

const semTexto = {
  problemaRelatado: null,
  acessoriosRecebidos: null,
  observacoes: null,
}

test('a primeira OS do ano recebe o número 0001', async () => {
  const { cliente, equipamento } = await cenario()

  const r = await criarOs({
    clienteId: cliente.id,
    equipamentoId: equipamento.id,
    ...semTexto,
    problemaRelatado: 'Não pega a frio',
  })

  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect(r.dados.numero).toMatch(/^\d{4}-0001$/)
})

test('a numeração é sequencial e sem furo', async () => {
  const { cliente, equipamento } = await cenario()
  const entrada = { clienteId: cliente.id, equipamentoId: equipamento.id, ...semTexto }

  const numeros: string[] = []
  for (let i = 0; i < 3; i++) {
    const r = await criarOs(entrada)
    if (!r.ok) throw new Error('criação falhou')
    numeros.push(r.dados.numero)
  }

  expect(numeros.map((n) => n.split('-')[1])).toEqual(['0001', '0002', '0003'])
})

test('criações concorrentes não repetem número', async () => {
  const { cliente, equipamento } = await cenario()
  const entrada = { clienteId: cliente.id, equipamentoId: equipamento.id, ...semTexto }

  const resultados = await Promise.all([criarOs(entrada), criarOs(entrada), criarOs(entrada)])

  const numeros = resultados.map((r) => (r.ok ? r.dados.numero : ''))
  expect(numeros.every(Boolean)).toBe(true)
  expect(new Set(numeros).size).toBe(3)
})

test('a OS nasce recebida e com histórico registrado', async () => {
  const { cliente, equipamento } = await cenario()
  const r = await criarOs({
    clienteId: cliente.id,
    equipamentoId: equipamento.id,
    ...semTexto,
    problemaRelatado: 'Perde força',
    acessoriosRecebidos: 'Chave e alça',
  })
  if (!r.ok) throw new Error('criação falhou')

  const os = await obterOs(r.dados.id)

  expect(os?.situacao).toBe('recebido')
  expect(os?.problemaRelatado).toBe('Perde força')
  expect(os?.historico).toHaveLength(1)
  expect(os?.historico[0].situacaoNova).toBe('recebido')
})

test('recusa OS com cliente inexistente', async () => {
  const { equipamento } = await cenario()

  const r = await criarOs({
    clienteId: '00000000-0000-0000-0000-000000000000',
    equipamentoId: equipamento.id,
    ...semTexto,
  })

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Cliente não encontrado.')
})

test('recusa equipamento que é de outro cliente', async () => {
  const { equipamento } = await cenario()
  const [outro] = await db.insert(clientes).values({ nome: 'Outro cliente' }).returning()

  const r = await criarOs({
    clienteId: outro.id,
    equipamentoId: equipamento.id,
    ...semTexto,
  })

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('O equipamento selecionado não pertence a esse cliente.')
})

test('a lista traz cliente, equipamento e total, e filtra por situação', async () => {
  const { cliente, equipamento } = await cenario()
  const r = await criarOs({ clienteId: cliente.id, equipamentoId: equipamento.id, ...semTexto })
  if (!r.ok) throw new Error('criação falhou')

  const [linha] = await listarOs({})

  expect(linha.clienteNome).toBe('Marcos Andrade')
  expect(linha.equipamentoDescricao).toBe('Roçadeira Stihl FS 220 (2T)')
  expect(linha.totalCentavos).toBe(0)
  expect(await listarOs({ situacoes: ['recebido'] })).toHaveLength(1)
  expect(await listarOs({ situacoes: ['entregue'] })).toHaveLength(0)
})

test('a busca encontra por número, cliente e equipamento', async () => {
  const { cliente, equipamento } = await cenario()
  const r = await criarOs({ clienteId: cliente.id, equipamentoId: equipamento.id, ...semTexto })
  if (!r.ok) throw new Error('criação falhou')

  expect(await listarOs({ busca: r.dados.numero })).toHaveLength(1)
  expect(await listarOs({ busca: 'andrade' })).toHaveLength(1)
  expect(await listarOs({ busca: 'stihl' })).toHaveLength(1)
  expect(await listarOs({ busca: 'inexistente' })).toHaveLength(0)
})

test('equipamento "outro" aparece com o texto digitado na lista e no detalhe da OS', async () => {
  const [cliente] = await db.insert(clientes).values({ nome: 'Marcos Andrade' }).returning()
  const [equipamento] = await db
    .insert(equipamentos)
    .values({
      clienteId: cliente.id,
      tipoMotor: '2T',
      aplicacao: 'outro',
      aplicacaoOutra: 'Cortador de grama',
      marca: 'Husqvarna',
      modelo: '236',
    })
    .returning()
  const r = await criarOs({
    clienteId: cliente.id,
    equipamentoId: equipamento.id,
    ...semTexto,
  })
  if (!r.ok) throw new Error('criação falhou')

  const [linha] = await listarOs({})
  const os = await obterOs(r.dados.id)

  expect(linha.equipamentoDescricao).toBe('Cortador de grama Husqvarna 236 (2T)')
  expect(os?.equipamento.descricao).toBe('Cortador de grama Husqvarna 236 (2T)')
})
