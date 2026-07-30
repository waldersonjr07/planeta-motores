import { expect, test } from '@playwright/test'
import { prepararSessao } from './ajuda'

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)
  await page.goto('/catalogo/servicos')
})

test('cadastra serviço com preço e mostra formatado', async ({ page }) => {
  await page.getByLabel('Nome do serviço').fill('Retífica de cilindro')
  await page.getByLabel('Preço padrão').fill('1.250,50')
  await page.getByRole('button', { name: 'Adicionar serviço' }).click()

  await expect(page.getByText('Retífica de cilindro')).toBeVisible()
  await expect(page.getByText('R$ 1.250,50')).toBeVisible()
})

test('recusa preço inválido com mensagem no campo', async ({ page }) => {
  await page.getByLabel('Nome do serviço').fill('Serviço qualquer')
  await page.getByLabel('Preço padrão').fill('caro')
  await page.getByRole('button', { name: 'Adicionar serviço' }).click()

  await expect(page.getByText('Informe um valor como 1.250,50')).toBeVisible()
})

test('remover tira o serviço da lista', async ({ page }) => {
  await page.getByLabel('Nome do serviço').fill('Serviço temporário')
  await page.getByRole('button', { name: 'Adicionar serviço' }).click()
  await expect(page.getByText('Serviço temporário')).toBeVisible()

  await page.getByRole('button', { name: 'Remover' }).click()

  await expect(page.getByText('Nenhum serviço cadastrado ainda.')).toBeVisible()
})
