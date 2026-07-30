import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { clientes, equipamentos } from '../../src/db/schema'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

async function inserirCliente(extra: Record<string, unknown> = {}) {
  const [cliente] = await db
    .insert(clientes)
    .values({ nome: 'Marcos Andrade', ...extra })
    .returning()
  return cliente
}

test('cliente nasce ativo, como pessoa física, com datas preenchidas', async () => {
  const cliente = await inserirCliente()

  expect(cliente.tipoPessoa).toBe('fisica')
  expect(cliente.ativo).toBe(true)
  expect(cliente.criadoEm).toBeInstanceOf(Date)
  expect(cliente.atualizadoEm).toBeInstanceOf(Date)
})

test('o mesmo documento não pode ser cadastrado duas vezes', async () => {
  await inserirCliente({ documento: '12345678900' })
  await expect(inserirCliente({ documento: '12345678900' })).rejects.toThrow()
})

test('vários clientes podem ficar sem documento', async () => {
  await inserirCliente({ nome: 'Sem documento 1' })
  await inserirCliente({ nome: 'Sem documento 2' })

  expect(await db.select().from(clientes)).toHaveLength(2)
})

test('equipamento exige cliente existente', async () => {
  await expect(
    db.insert(equipamentos).values({
      clienteId: '00000000-0000-0000-0000-000000000000',
      tipoMotor: '2T',
      aplicacao: 'rocadeira',
    }),
  ).rejects.toThrow()
})

test('apagar o cliente apaga seus equipamentos', async () => {
  const cliente = await inserirCliente()
  await db
    .insert(equipamentos)
    .values({ clienteId: cliente.id, tipoMotor: '2T', aplicacao: 'rocadeira' })

  await db.delete(clientes)

  expect(await db.select().from(equipamentos)).toHaveLength(0)
})
