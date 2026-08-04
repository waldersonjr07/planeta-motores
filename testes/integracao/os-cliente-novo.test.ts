import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { clientes, equipamentos } from '../../src/db/schema'
import { listarClientes } from '../../src/modulos/clientes/consultas'
import { entradaOsRapida } from '../../src/modulos/os/esquemas'
import { obterOs } from '../../src/modulos/os/consultas'
import { criarOsComClienteNovo } from '../../src/modulos/os/operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

function entrada(extra: Record<string, unknown> = {}) {
  return entradaOsRapida.parse({
    nomeCliente: 'Marcos Andrade',
    documentoCliente: '123.456.789-00',
    telefoneCliente: '(11) 98765-4321',
    tipoMotor: '2T',
    aplicacao: 'rocadeira',
    marca: 'Stihl',
    modelo: 'FS 220',
    problemaRelatado: 'Não pega a frio',
    ...extra,
  })
}

test('abre a OS cadastrando cliente e máquina de uma vez', async () => {
  const r = await criarOsComClienteNovo(entrada())

  expect(r.ok).toBe(true)
  if (!r.ok) return

  const os = await obterOs(r.dados.id)
  expect(os?.cliente.nome).toBe('Marcos Andrade')
  expect(os?.cliente.telefone).toBe('11987654321')
  expect(os?.equipamento.descricao).toBe('Roçadeira Stihl FS 220 (2T)')
  expect(os?.problemaRelatado).toBe('Não pega a frio')
  expect(os?.situacao).toBe('recebido')
})

test('o cliente cadastrado assim aparece na carteira como qualquer outro', async () => {
  await criarOsComClienteNovo(entrada())

  const [cliente] = await listarClientes()
  expect(cliente.nome).toBe('Marcos Andrade')
  // É o vínculo com o equipamento que mantém o histórico por motor.
  expect(cliente.quantidadeEquipamentos).toBe(1)
})

test('só o nome é obrigatório: sem documento e sem telefone funciona', async () => {
  const r = await criarOsComClienteNovo(
    entrada({ documentoCliente: '', telefoneCliente: '', marca: '', modelo: '' }),
  )

  expect(r.ok).toBe(true)
  if (!r.ok) return
  const os = await obterOs(r.dados.id)
  expect(os?.cliente.telefone).toBeNull()
  expect(os?.equipamento.descricao).toBe('Roçadeira (2T)')
})

test('nome em branco é recusado na validação', () => {
  expect(() => entrada({ nomeCliente: '   ' })).toThrow('Nome do cliente é obrigatório')
})

test('documento já cadastrado é recusado, sem deixar nada pela metade', async () => {
  await criarOsComClienteNovo(entrada())

  const r = await criarOsComClienteNovo(entrada({ nomeCliente: 'Outro nome' }))

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.erro).toBe('Já existe cliente cadastrado com esse CPF/CNPJ.')
  // A transação não pode ter deixado cliente nem equipamento órfão.
  expect(await db.select().from(clientes)).toHaveLength(1)
  expect(await db.select().from(equipamentos)).toHaveLength(1)
})

test('a numeração da OS segue a mesma sequência do cadastro normal', async () => {
  const primeira = await criarOsComClienteNovo(entrada({ documentoCliente: '' }))
  const segunda = await criarOsComClienteNovo(
    entrada({ nomeCliente: 'Ana Souza', documentoCliente: '' }),
  )

  expect(primeira.ok && segunda.ok).toBe(true)
  if (!primeira.ok || !segunda.ok) return
  expect(primeira.dados.numero.split('-')[1]).toBe('0001')
  expect(segunda.dados.numero.split('-')[1]).toBe('0002')
})
