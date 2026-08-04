import { expect, test } from '@playwright/test'
import { prepararSessao } from './ajuda'

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)
})

test('o catálogo não tem mais aba de peças', async ({ page }) => {
  await page.goto('/catalogo/servicos')

  await expect(page.getByRole('link', { name: 'Serviços' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Fornecedores' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Peças' })).toHaveCount(0)
})

test('a peça é cadastrada e acompanhada na tela de estoque', async ({ page }) => {
  await page.goto('/estoque')
  await expect(page.getByText('Nenhuma peça cadastrada.')).toBeVisible()

  const cadastro = page.getByRole('region', { name: 'Cadastrar peça' })
  await cadastro.getByLabel('Nome da peça').fill('Óleo 2 tempos')
  await cadastro.getByLabel('Marca').fill('Ipiranga')
  await cadastro.getByLabel('Unidade').selectOption('L')
  await cadastro.getByLabel('Preço de venda').fill('38,00')
  await cadastro.getByLabel('Quantidade mínima').fill('2')
  await cadastro.getByLabel('Controla saldo em estoque').check()
  await cadastro.getByRole('button', { name: 'Cadastrar peça' }).click()

  await expect(page.getByText('Peça cadastrada.')).toBeVisible()

  const linha = page.getByRole('row').filter({ hasText: 'Óleo 2 tempos' })
  await expect(linha.getByRole('cell', { name: 'R$ 38,00' })).toBeVisible()
  await expect(linha.getByRole('cell', { name: 'Controla saldo' })).toBeVisible()
})

test('a peça cadastrada no estoque aparece no orçamento da OS', async ({ page }) => {
  await page.goto('/estoque')
  await page.getByRole('region', { name: 'Cadastrar peça' }).getByLabel('Nome da peça').fill('Vela NGK')
  await page
    .getByRole('region', { name: 'Cadastrar peça' })
    .getByLabel('Preço de venda')
    .fill('18,00')
  await page.getByRole('button', { name: 'Cadastrar peça' }).click()
  await expect(page.getByText('Peça cadastrada.')).toBeVisible()

  // Sai do catálogo como tela, mas continua sendo item de orçamento.
  await page.goto('/catalogo/servicos')
  await expect(page.getByText('Vela NGK')).toHaveCount(0)
})

test('remover a peça tira ela da tela de estoque', async ({ page }) => {
  await page.goto('/estoque')
  await page.getByRole('region', { name: 'Cadastrar peça' }).getByLabel('Nome da peça').fill('Peça temporária')
  await page.getByRole('button', { name: 'Cadastrar peça' }).click()
  await expect(page.getByRole('cell', { name: 'Peça temporária' })).toBeVisible()

  await page.getByRole('button', { name: 'Remover' }).click()

  await expect(page.getByText('Nenhuma peça cadastrada.')).toBeVisible()
})
