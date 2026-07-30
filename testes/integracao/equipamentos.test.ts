import { beforeEach, expect, test } from 'vitest'
import {
  listarEquipamentosDoCliente,
  obterEquipamento,
} from '../../src/modulos/clientes/equipamentos-consultas'
import { entradaEquipamento } from '../../src/modulos/clientes/equipamentos-esquemas'
import {
  atualizarEquipamento,
  criarEquipamento,
  definirAtivoEquipamento,
} from '../../src/modulos/clientes/equipamentos-operacoes'
import { entradaCliente } from '../../src/modulos/clientes/esquemas'
import { criarCliente } from '../../src/modulos/clientes/operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function novoCliente() {
  const r = await criarCliente(
    entradaCliente.parse({
      nome: 'Marcos Andrade',
      tipoPessoa: 'fisica',
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
    }),
  )
  if (!r.ok) throw new Error('criação de cliente falhou')
  return r.dados.id
}

function entrada(clienteId: string, extra: Record<string, unknown> = {}) {
  return entradaEquipamento.parse({
    clienteId,
    tipoMotor: '2T',
    aplicacao: 'rocadeira',
    marca: 'Stihl',
    modelo: 'FS 220',
    numeroSerie: '',
    observacoes: '',
    ...extra,
  })
}

test('cria o equipamento sob o cliente', async () => {
  const clienteId = await novoCliente()

  const r = await criarEquipamento(entrada(clienteId))

  expect(r.ok).toBe(true)
  if (!r.ok) return
  const equipamento = await obterEquipamento(r.dados.id)
  expect(equipamento?.clienteId).toBe(clienteId)
  expect(equipamento?.marca).toBe('Stihl')
})

test('aceita entrada sem os campos opcionais, como vem do formulário', async () => {
  const clienteId = await novoCliente()

  // O formulário da ficha não tem campo de observações: a chave nem chega.
  // Campo opcional ausente precisa valer nulo, não reprovar a validação.
  const analise = entradaEquipamento.safeParse({
    clienteId,
    tipoMotor: '2T',
    aplicacao: 'rocadeira',
    marca: 'Stihl',
    modelo: 'FS 220',
  })

  expect(analise.success).toBe(true)
  if (!analise.success) return
  expect(analise.data.observacoes).toBeNull()
  expect((await criarEquipamento(analise.data)).ok).toBe(true)
})

test('recusa equipamento de cliente inexistente com mensagem legível', async () => {
  const r = await criarEquipamento(entrada('00000000-0000-0000-0000-000000000000'))

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Cliente não encontrado.')
})

test('a lista traz a descrição pronta', async () => {
  const clienteId = await novoCliente()
  await criarEquipamento(entrada(clienteId))

  const lista = await listarEquipamentosDoCliente(clienteId)

  expect(lista).toHaveLength(1)
  expect(lista[0].descricao).toBe('Roçadeira Stihl FS 220 (2T)')
})

test('atualiza o equipamento', async () => {
  const clienteId = await novoCliente()
  const criado = await criarEquipamento(entrada(clienteId))
  if (!criado.ok) throw new Error('criação falhou')

  const r = await atualizarEquipamento(criado.dados.id, entrada(clienteId, { modelo: 'FS 160' }))

  expect(r.ok).toBe(true)
  expect((await obterEquipamento(criado.dados.id))?.modelo).toBe('FS 160')
})

test('atualizar equipamento inexistente falha sem estourar', async () => {
  const clienteId = await novoCliente()

  const r = await atualizarEquipamento(
    '00000000-0000-0000-0000-000000000000',
    entrada(clienteId),
  )

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Equipamento não encontrado.')
})

test('inativo sai da lista, salvo quando pedido', async () => {
  const clienteId = await novoCliente()
  const criado = await criarEquipamento(entrada(clienteId))
  if (!criado.ok) throw new Error('criação falhou')

  await definirAtivoEquipamento(criado.dados.id, false)

  expect(await listarEquipamentosDoCliente(clienteId)).toHaveLength(0)
  expect(await listarEquipamentosDoCliente(clienteId, true)).toHaveLength(1)
})
