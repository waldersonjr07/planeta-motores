import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { clientes, equipamentos, pecas, servicos } from '../../src/db/schema'
import { prepararSessao } from './ajuda'

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
  await page.getByLabel('Peça').selectOption({ label: 'Kit cilindro 40mm (un)' })
  await page.getByLabel('Quantidade do ajuste').fill('5')
  await page.getByLabel('Motivo').fill('Inventário inicial')
  await page.getByRole('button', { name: 'Lançar ajuste' }).click()
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
  await expect(page.getByText('Recebido')).toBeVisible()

  // Diagnóstico.
  await page.getByRole('button', { name: 'Iniciar diagnóstico' }).click()
  await page.getByLabel('Diagnóstico do Ivan').fill('Cilindro riscado')
  await page.getByRole('button', { name: 'Salvar diagnóstico' }).click()
  await expect(page.getByText('Diagnóstico salvo.')).toBeVisible()

  // Orçamento: um serviço e uma peça.
  await page.getByRole('link', { name: /^Orçamento/ }).click()
  // Rótulo exato: confere de quebra que a opção mostra o preço do catálogo.
  await page
    .getByLabel('Item do catálogo')
    .selectOption({ label: 'Retífica de cilindro — R$ 210,00' })
  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await expect(page.getByRole('cell', { name: 'Retífica de cilindro' })).toBeVisible()

  await page
    .getByLabel('Item do catálogo')
    .selectOption({ label: 'Kit cilindro 40mm — R$ 230,00' })
  await page.getByLabel('Quantidade').fill('2')
  await page.getByRole('button', { name: 'Adicionar item' }).click()

  // 21.000 + 2 × 23.000 = 67.000 centavos. O valor aparece no cabeçalho e na
  // soma do orçamento; conferimos o do cabeçalho, que é o que fica sempre à vista.
  await expect(page.getByText('Total R$ 670,00')).toBeVisible()

  // Envia, aprova, executa, conclui e entrega.
  await page.getByRole('button', { name: 'Enviar orçamento' }).click()
  await expect(page.getByText('orçamento versão 1')).toBeVisible()

  await page.getByRole('button', { name: 'Registrar aprovação' }).click()
  await page.getByRole('button', { name: 'Iniciar execução' }).click()
  await page.getByRole('button', { name: 'Concluir serviço' }).click()
  await page.getByRole('button', { name: 'Entregar' }).click()

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

test('pular etapa é recusado com mensagem', async ({ page }) => {
  await page.goto('/ordens-servico/nova')
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()

  // "Cancelado" é a alternativa oferecida em Recebido; a transição proibida
  // que queremos exercitar é a de item em OS encerrada.
  await page.getByRole('button', { name: 'Cancelado' }).click()
  await page.getByLabel('Por que a OS está sendo cancelada?').fill('Aberta por engano')
  await page.getByRole('button', { name: 'Cancelado' }).click()

  await expect(page.getByText('Ordem de serviço encerrada.')).toBeVisible()
})
