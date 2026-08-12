import { expect, test } from 'vitest'
import { descreverEquipamento } from '../../src/modulos/clientes/equipamentos-descricao'

test('descreve aplicação, marca, modelo e tipo de motor', () => {
  expect(
    descreverEquipamento({
      aplicacao: 'rocadeira',
      marca: 'Stihl',
      modelo: 'FS 220',
      tipoMotor: '2T',
    }),
  ).toBe('Roçadeira Stihl FS 220 (2T)')
})

test('omite marca e modelo ausentes sem deixar espaço sobrando', () => {
  expect(
    descreverEquipamento({
      aplicacao: 'motobomba',
      marca: null,
      modelo: null,
      tipoMotor: '4T',
    }),
  ).toBe('Motobomba (4T)')
})

test('funciona com apenas a marca', () => {
  expect(
    descreverEquipamento({
      aplicacao: 'gerador',
      marca: 'Branco',
      modelo: null,
      tipoMotor: '4T',
    }),
  ).toBe('Gerador Branco (4T)')
})

test('a máquina "outro" é descrita pelo que foi digitado', () => {
  expect(
    descreverEquipamento({
      aplicacao: 'outro',
      aplicacaoOutra: 'Cortador de grama',
      marca: 'Husqvarna',
      modelo: '236',
      tipoMotor: '2T',
    }),
  ).toBe('Cortador de grama Husqvarna 236 (2T)')
})

test('sem o texto, "outro" continua saindo como Outro', () => {
  expect(
    descreverEquipamento({
      aplicacao: 'outro',
      aplicacaoOutra: null,
      marca: null,
      modelo: null,
      tipoMotor: '4T',
    }),
  ).toBe('Outro (4T)')
})

test('aplicação da lista ignora o texto de "outro"', () => {
  expect(
    descreverEquipamento({
      aplicacao: 'motosserra',
      aplicacaoOutra: 'Cortador de grama',
      marca: 'Stihl',
      modelo: null,
      tipoMotor: '2T',
    }),
  ).toBe('Motosserra Stihl (2T)')
})
