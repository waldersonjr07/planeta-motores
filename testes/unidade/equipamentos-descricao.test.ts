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
