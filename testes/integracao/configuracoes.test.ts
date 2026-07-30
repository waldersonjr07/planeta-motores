import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { configuracoes } from '../../src/db/schema'
import { obterConfiguracoes } from '../../src/modulos/configuracoes/consultas'
import { entradaConfiguracoes } from '../../src/modulos/configuracoes/esquemas'
import { salvarConfiguracoes } from '../../src/modulos/configuracoes/operacoes'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

test('a primeira leitura cria a linha com os padrões', async () => {
  const linha = await obterConfiguracoes()

  expect(linha.id).toBe(1)
  expect(linha.empresaNome).toBe('Planeta Motores')
  expect(linha.orcamentoValidadeDias).toBe(15)
})

test('leituras repetidas não criam linha nova', async () => {
  await obterConfiguracoes()
  await obterConfiguracoes()

  expect(await db.select().from(configuracoes)).toHaveLength(1)
})

test('salva os dados da empresa e os modelos de mensagem', async () => {
  const entrada = entradaConfiguracoes.parse({
    empresaNome: 'Planeta Motores ME',
    empresaCnpj: '12.345.678/0001-95',
    empresaTelefone: '(19) 3524-1122',
    empresaEndereco: 'Rua das Oficinas, 100',
    orcamentoValidadeDias: '10',
    modeloMsgOrcamento: 'Orçamento da OS {{numero}}: {{total}}',
    modeloMsgPronto: 'OS {{numero}} pronta',
    modeloMsgCobranca: 'Saldo de {{saldo}} na OS {{numero}}',
  })

  const r = await salvarConfiguracoes(entrada)

  expect(r.ok).toBe(true)
  const linha = await obterConfiguracoes()
  expect(linha.empresaNome).toBe('Planeta Motores ME')
  expect(linha.empresaCnpj).toBe('12345678000195')
  expect(linha.empresaTelefone).toBe('1935241122')
  expect(linha.orcamentoValidadeDias).toBe(10)
  expect(linha.modeloMsgPronto).toBe('OS {{numero}} pronta')
})

test('nome da empresa em branco é recusado', () => {
  expect(() =>
    entradaConfiguracoes.parse({
      empresaNome: '  ',
      empresaCnpj: '',
      empresaTelefone: '',
      empresaEndereco: '',
      orcamentoValidadeDias: '15',
      modeloMsgOrcamento: 'a',
      modeloMsgPronto: 'b',
      modeloMsgCobranca: 'c',
    }),
  ).toThrow('Nome da empresa é obrigatório')
})

test('validade do orçamento precisa ser pelo menos um dia', () => {
  expect(() =>
    entradaConfiguracoes.parse({
      empresaNome: 'Planeta Motores',
      empresaCnpj: '',
      empresaTelefone: '',
      empresaEndereco: '',
      orcamentoValidadeDias: '0',
      modeloMsgOrcamento: 'a',
      modeloMsgPronto: 'b',
      modeloMsgCobranca: 'c',
    }),
  ).toThrow()
})
