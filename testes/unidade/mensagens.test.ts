import { expect, test } from 'vitest'
import { linkDoWhatsapp, preencherModelo } from '../../src/modulos/avisos/mensagens'

test('troca todos os marcadores pelos valores', () => {
  const modelo =
    'Olá {{cliente}}, o orçamento da OS {{numero}} ({{equipamento}}) ficou em {{total}}.'

  expect(
    preencherModelo(modelo, {
      cliente: 'Marcos',
      numero: '2026-0001',
      equipamento: 'Roçadeira Stihl FS 220 (2T)',
      total: 'R$ 520,00',
    }),
  ).toBe(
    'Olá Marcos, o orçamento da OS 2026-0001 (Roçadeira Stihl FS 220 (2T)) ficou em R$ 520,00.',
  )
})

test('troca o mesmo marcador mais de uma vez', () => {
  expect(preencherModelo('{{numero}} e {{numero}}', { numero: '0001' })).toBe('0001 e 0001')
})

test('marcador sem valor vira vazio, não aparece cru', () => {
  expect(preencherModelo('Saldo de {{saldo}}.', {})).toBe('Saldo de .')
  expect(preencherModelo('Saldo de {{saldo}}.', {})).not.toContain('{{')
})

test('telefone sem DDI recebe o 55', () => {
  expect(linkDoWhatsapp('(11) 98765-4321', 'oi')).toContain('wa.me/5511987654321')
})

test('telefone que já tem DDI não duplica', () => {
  expect(linkDoWhatsapp('5511987654321', 'oi')).toContain('wa.me/5511987654321')
})

test('a mensagem vai codificada para URL', () => {
  const link = linkDoWhatsapp('11987654321', 'Orçamento: R$ 520,00 & pronto')

  expect(link).toContain('text=Or%C3%A7amento%3A%20R%24%20520%2C00%20%26%20pronto')
})
