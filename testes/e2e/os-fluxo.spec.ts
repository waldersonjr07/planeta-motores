import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { clientes, equipamentos, pecas, servicos } from '../../src/db/schema'
import { lancarAjuste, mudarSituacaoNaTela, prepararSessao } from './ajuda'

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)

  const [cliente] = await db.insert(clientes).values({ nome: 'Marcos Andrade' }).returning()
  await db.insert(equipamentos).values({
    clienteId: cliente.id,
    tipoMotor: '2T',
    aplicacao: 'rocadeira',
    marca: 'Stihl',
    modelo: 'FS 220',
  })
  await db
    .insert(servicos)
    .values({ nome: 'Retífica de cilindro', precoPadraoCentavos: 21000 })
  await db.insert(pecas).values({
    nome: 'Kit cilindro 40mm',
    controlaSaldo: true,
    quantidadeMinima: '1',
    precoVendaCentavos: 23000,
  })
})

test('percorre a OS do recebimento até a entrega e baixa o estoque', async ({ page }) => {
  // Entra estoque para a peça, para a baixa ser visível no fim.
  await page.goto('/estoque')
  await lancarAjuste(page, 'Kit cilindro 40mm (un)', '5', 'Inventário inicial')
  await expect(page.getByText('Ajuste lançado.')).toBeVisible()

  // Abre a OS.
  await page.goto('/ordens-servico')
  await page.getByRole('link', { name: 'Nova OS' }).click()
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByLabel('Problema relatado pelo cliente').fill('Não pega a frio')
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()

  await expect(page.getByRole('heading', { name: /^OS \d{4}-0001$/ })).toBeVisible()

  // Diagnóstico.
  await mudarSituacaoNaTela(page, 'Em diagnóstico')
  await page.getByLabel('Diagnóstico do Ivan').fill('Cilindro riscado')
  await page.getByRole('button', { name: 'Salvar diagnóstico' }).click()
  await expect(page.getByText('Diagnóstico salvo.')).toBeVisible()

  // Orçamento: um serviço e uma peça do catálogo.
  await page.getByRole('link', { name: /^Orçamento/ }).click()
  await page.getByLabel('Item').selectOption({ label: 'Retífica de cilindro — R$ 210,00' })
  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await expect(page.getByRole('cell', { name: 'Retífica de cilindro' })).toBeVisible()

  await page.getByLabel('Item').selectOption({ label: 'Kit cilindro 40mm — R$ 230,00' })
  await page.getByLabel('Quantidade').fill('2')
  await page.getByRole('button', { name: 'Adicionar item' }).click()

  // 21.000 + 2 × 23.000 = 67.000 centavos. O valor aparece no cabeçalho e na
  // soma do orçamento; conferimos o do cabeçalho, que fica sempre à vista.
  await expect(page.getByText('Total R$ 670,00')).toBeVisible()

  // Envia, aprova, executa, conclui e entrega.
  await mudarSituacaoNaTela(page, 'Orçamento enviado')
  await expect(page.getByText('orçamento versão 1')).toBeVisible()

  await mudarSituacaoNaTela(page, 'Aprovado')
  await mudarSituacaoNaTela(page, 'Em execução')
  await mudarSituacaoNaTela(page, 'Pronto')
  await mudarSituacaoNaTela(page, 'Entregue')

  await expect(page.getByText('Ordem de serviço encerrada.')).toBeVisible()

  // O histórico tem as sete linhas do caminho completo. Escopo em `main`
  // porque o menu lateral também é uma lista.
  await page.getByRole('link', { name: /^Histórico/ }).click()
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(7)
  await expect(page.getByText('Em execução → Pronto')).toBeVisible()

  // O estoque baixou as duas peças: 5 − 2 = 3.
  await page.goto('/estoque')
  const linha = page.getByRole('row').filter({ hasText: 'Kit cilindro 40mm' })
  await expect(linha.getByRole('cell', { name: '3', exact: true })).toBeVisible()
})

test('item digitado em "Outros" entra no orçamento com valor livre', async ({ page }) => {
  await page.goto('/ordens-servico/nova')
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()

  await page.getByRole('link', { name: /^Orçamento/ }).click()
  await page.getByLabel('Item').selectOption('outros')

  await page.getByLabel('Descrição').fill('Mão de obra de desmontagem')
  await page.getByLabel('Valor unitário').fill('150,00')
  await page.getByRole('button', { name: 'Adicionar item' }).click()

  await expect(page.getByRole('cell', { name: 'Mão de obra de desmontagem' })).toBeVisible()
  await expect(page.getByText('Total R$ 150,00')).toBeVisible()

  // O catálogo continua intacto: o item digitado vale só para esta OS.
  await page.goto('/catalogo/servicos')
  await expect(page.getByText('Mão de obra de desmontagem')).toHaveCount(0)
  await expect(page.getByRole('cell', { name: 'Retífica de cilindro' })).toBeVisible()
})

test('item digitado cobrado como peça não movimenta o estoque', async ({ page }) => {
  await page.goto('/estoque')
  await lancarAjuste(page, 'Kit cilindro 40mm (un)', '5')

  await page.goto('/ordens-servico/nova')
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()

  await page.getByRole('link', { name: /^Orçamento/ }).click()
  await page.getByLabel('Item').selectOption('outros')
  await page.getByLabel('Descrição').fill('Parafuso avulso')
  await page.getByLabel('Cobrar como').selectOption('peca')
  await page.getByLabel('Valor unitário').fill('2,50')
  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await expect(page.getByRole('cell', { name: 'Parafuso avulso' })).toBeVisible()

  for (const passo of [
    'Em diagnóstico',
    'Orçamento enviado',
    'Aprovado',
    'Em execução',
    'Pronto',
  ]) {
    await mudarSituacaoNaTela(page, passo)
  }

  await page.goto('/estoque')
  const linha = page.getByRole('row').filter({ hasText: 'Kit cilindro 40mm' })
  await expect(linha.getByRole('cell', { name: '5', exact: true })).toBeVisible()
})

test('a lista filtra por situação e encontra pela busca', async ({ page }) => {
  await page.goto('/ordens-servico')
  await page.getByRole('link', { name: 'Nova OS' }).click()
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()

  await page.goto('/ordens-servico')
  await expect(page.getByRole('cell', { name: 'Marcos Andrade' })).toBeVisible()

  await page.getByLabel('Situação').selectOption('entregue')
  await expect(
    page.getByText('Nenhuma ordem de serviço encontrada com esses filtros.'),
  ).toBeVisible()

  await page.goto('/ordens-servico')
  await page.getByLabel('Buscar ordem de serviço').fill('andrade')
  await page.getByLabel('Buscar ordem de serviço').press('Enter')
  await expect(page.getByRole('cell', { name: 'Marcos Andrade' })).toBeVisible()
})

test('cancelar pede motivo e encerra a OS', async ({ page }) => {
  await page.goto('/ordens-servico/nova')
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()

  await mudarSituacaoNaTela(page, 'Cancelado', 'Aberta por engano')

  await expect(page.getByText('Ordem de serviço encerrada.')).toBeVisible()
  await page.getByRole('link', { name: /^Histórico/ }).click()
  await expect(page.getByText('Aberta por engano')).toBeVisible()
})

test('o painel de atualização só oferece transições válidas', async ({ page }) => {
  await page.goto('/ordens-servico/nova')
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()

  await page.getByRole('button', { name: /Atualização da OS/ }).click()

  // De "Recebido" só se vai para diagnóstico ou cancelamento: pular etapa
  // deixa de ser possível na tela, não só recusado no servidor.
  await expect(page.getByRole('button', { name: /^Em diagnóstico/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Cancelado/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Pronto/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Entregue/ })).toHaveCount(0)
})
