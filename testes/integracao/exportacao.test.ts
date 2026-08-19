import { beforeEach, expect, test } from 'vitest'
import { gerarExportacao } from '../../src/modulos/exportacao/pacote'
import { registrarPagamento } from '../../src/modulos/financeiro/operacoes'
import { adicionarItem } from '../../src/modulos/os/operacoes'
import { limparBanco } from '../ajuda/banco'
import { cenarioOs } from '../ajuda/os'

beforeEach(limparBanco)

test('exporta um arquivo por tabela de domínio', async () => {
  const arquivos = await gerarExportacao()

  const nomes = arquivos.map((arquivo) => arquivo.nome)
  expect(nomes).toContain('clientes.csv')
  expect(nomes).toContain('ordens-servico.csv')
  expect(nomes).toContain('pagamentos.csv')
  expect(nomes).toContain('estoque-movimentos.csv')
})

test('não exporta usuários nem sessões', async () => {
  const nomes = (await gerarExportacao()).map((arquivo) => arquivo.nome)

  // Hash de senha não tem por que sair da máquina.
  expect(nomes).not.toContain('usuarios.csv')
  expect(nomes).not.toContain('sessoes.csv')
})

test('os dados aparecem no CSV correspondente', async () => {
  const { osId, servico, numero } = await cenarioOs()
  await adicionarItem(osId, { tipo: 'servico', referenciaId: servico.id, quantidade: 1 })
  await registrarPagamento({
    osId,
    valorCentavos: 21000,
    forma: 'pix',
    data: '2026-07-30',
    observacao: 'Pago na entrega',
  })

  const arquivos = await gerarExportacao()
  const porNome = new Map(arquivos.map((arquivo) => [arquivo.nome, arquivo.conteudo]))

  expect(porNome.get('clientes.csv')).toContain('Marcos Andrade')
  expect(porNome.get('ordens-servico.csv')).toContain(numero)
  expect(porNome.get('os-itens.csv')).toContain('Retífica de cilindro')
  expect(porNome.get('pagamentos.csv')).toContain('Pago na entrega')

  // `criado_em` é `timestamptz` e chega aqui como Date. Este é o caminho que o
  // teste de unidade do csv.ts não cobre: o valor sai do banco, atravessa o
  // drizzle e só então é serializado. Sem o deslocamento, a planilha mostraria
  // o horário três horas adiantado.
  expect(porNome.get('clientes.csv')).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-0[34]:00/)
  expect(porNome.get('clientes.csv')).not.toMatch(/\dZ/)
})

test('tabela vazia gera arquivo vazio, sem quebrar a exportação', async () => {
  const arquivos = await gerarExportacao()
  const despesas = arquivos.find((arquivo) => arquivo.nome === 'despesas.csv')

  expect(despesas).toBeDefined()
  expect(despesas!.conteudo).toBe('')
})
