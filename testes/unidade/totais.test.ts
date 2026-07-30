import { expect, test } from 'vitest'
import { calcularTotais } from '../../src/modulos/os/totais'

const peca = (quantidade: string, preco: number) => ({
  tipo: 'peca' as const,
  quantidade,
  precoUnitarioCentavos: preco,
})
const servico = (quantidade: string, preco: number) => ({
  tipo: 'servico' as const,
  quantidade,
  precoUnitarioCentavos: preco,
})

test('separa peças de serviços e soma o total', () => {
  const totais = calcularTotais([peca('1', 23000), peca('1', 6200), servico('1', 21000)])

  expect(totais.pecasCentavos).toBe(29200)
  expect(totais.servicosCentavos).toBe(21000)
  expect(totais.totalCentavos).toBe(50200)
})

test('multiplica pela quantidade, inclusive fracionada', () => {
  // 0,5 L a R$ 38,00 = R$ 19,00
  expect(calcularTotais([peca('0.5', 3800)]).totalCentavos).toBe(1900)
  expect(calcularTotais([peca('3', 1800)]).totalCentavos).toBe(5400)
})

test('arredonda o centavo em vez de deixar fração', () => {
  // 0,333 × R$ 10,00 = R$ 3,33
  expect(calcularTotais([peca('0.333', 1000)]).totalCentavos).toBe(333)
})

test('aplica o desconto sobre o subtotal', () => {
  const totais = calcularTotais([servico('1', 21000)], 1000)

  expect(totais.subtotalCentavos).toBe(21000)
  expect(totais.descontoCentavos).toBe(1000)
  expect(totais.totalCentavos).toBe(20000)
})

test('desconto maior que o subtotal não gera total negativo', () => {
  expect(calcularTotais([servico('1', 5000)], 9000).totalCentavos).toBe(0)
})

test('lista vazia soma zero', () => {
  expect(calcularTotais([])).toEqual({
    pecasCentavos: 0,
    servicosCentavos: 0,
    subtotalCentavos: 0,
    descontoCentavos: 0,
    totalCentavos: 0,
  })
})
