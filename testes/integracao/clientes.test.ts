import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { equipamentos } from '../../src/db/schema'
import { listarClientes, obterCliente } from '../../src/modulos/clientes/consultas'
import { entradaCliente } from '../../src/modulos/clientes/esquemas'
import {
  atualizarCliente,
  criarCliente,
  definirAtivoCliente,
} from '../../src/modulos/clientes/operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

const base = {
  nome: 'Marcos Andrade',
  tipoPessoa: 'fisica' as const,
  documento: '',
  telefone: '',
  email: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  cep: '',
  observacoes: '',
}

function entrada(extra: Partial<typeof base> = {}) {
  return entradaCliente.parse({ ...base, ...extra })
}

test('cria o cliente e devolve o identificador', async () => {
  const r = await criarCliente(entrada({ telefone: '(11) 98765-4321' }))

  expect(r.ok).toBe(true)
  if (!r.ok) return
  const cliente = await obterCliente(r.dados.id)
  expect(cliente?.nome).toBe('Marcos Andrade')
  expect(cliente?.telefone).toBe('11987654321')
})

test('recusa documento já cadastrado com mensagem legível', async () => {
  await criarCliente(entrada({ documento: '123.456.789-00' }))

  const r = await criarCliente(entrada({ nome: 'Outro', documento: '12345678900' }))

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Já existe cliente cadastrado com esse CPF/CNPJ.')
})

test('atualiza o cliente e move a data de atualização', async () => {
  const criado = await criarCliente(entrada())
  if (!criado.ok) throw new Error('criação falhou')
  const antes = await obterCliente(criado.dados.id)

  const r = await atualizarCliente(criado.dados.id, entrada({ nome: 'Marcos A. Silva' }))

  expect(r.ok).toBe(true)
  const depois = await obterCliente(criado.dados.id)
  expect(depois?.nome).toBe('Marcos A. Silva')
  expect(depois!.atualizadoEm.getTime()).toBeGreaterThanOrEqual(antes!.atualizadoEm.getTime())
})

test('atualizar cliente inexistente falha sem estourar', async () => {
  const r = await atualizarCliente('00000000-0000-0000-0000-000000000000', entrada())

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Cliente não encontrado.')
})

test('lista em ordem alfabética e conta os equipamentos', async () => {
  const zeca = await criarCliente(entrada({ nome: 'Zeca Ferreira', documento: '1'.repeat(11) }))
  const ana = await criarCliente(entrada({ nome: 'Ana Souza' }))
  if (!zeca.ok || !ana.ok) throw new Error('criação falhou')
  await db.insert(equipamentos).values([
    { clienteId: zeca.dados.id, tipoMotor: '2T', aplicacao: 'rocadeira' },
    { clienteId: zeca.dados.id, tipoMotor: '4T', aplicacao: 'motobomba' },
  ])

  const lista = await listarClientes()

  expect(lista.map((c) => c.nome)).toEqual(['Ana Souza', 'Zeca Ferreira'])
  expect(lista[0].quantidadeEquipamentos).toBe(0)
  expect(lista[1].quantidadeEquipamentos).toBe(2)
})

test('busca por parte do nome, ignorando caixa', async () => {
  await criarCliente(entrada({ nome: 'Verde Jardins Paisagismo' }))
  await criarCliente(entrada({ nome: 'Lava-jato Cruz', documento: '2'.repeat(11) }))

  const lista = await listarClientes({ busca: 'jardins' })

  expect(lista.map((c) => c.nome)).toEqual(['Verde Jardins Paisagismo'])
})

test('busca por documento aceita pontuação digitada', async () => {
  await criarCliente(entrada({ documento: '12.345.678/0001-95', tipoPessoa: 'juridica' }))

  const lista = await listarClientes({ busca: '12.345.678' })

  expect(lista).toHaveLength(1)
})

test('inativo fica fora da lista, salvo quando pedido', async () => {
  const criado = await criarCliente(entrada())
  if (!criado.ok) throw new Error('criação falhou')

  await definirAtivoCliente(criado.dados.id, false)

  expect(await listarClientes()).toHaveLength(0)
  expect(await listarClientes({ incluirInativos: true })).toHaveLength(1)
})
