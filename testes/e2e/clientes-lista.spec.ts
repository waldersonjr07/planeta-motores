import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { clientes } from '../../src/db/schema'
import { prepararSessao } from './ajuda'

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)
  await db.insert(clientes).values([
    { nome: 'Verde Jardins Paisagismo', cidade: 'São Paulo' },
    { nome: 'Lava-jato Cruz', cidade: 'Osasco' },
  ])
  await page.goto('/clientes')
})

test('lista os clientes em ordem alfabética', async ({ page }) => {
  const nomes = await page
    .getByRole('cell')
    .filter({ hasText: /Verde|Lava/ })
    .allInnerTexts()
  expect(nomes).toEqual(['Lava-jato Cruz', 'Verde Jardins Paisagismo'])
})

test('a busca filtra a lista', async ({ page }) => {
  await page.getByLabel('Buscar cliente').fill('jardins')
  await page.getByLabel('Buscar cliente').press('Enter')

  await expect(page.getByText('Verde Jardins Paisagismo')).toBeVisible()
  await expect(page.getByText('Lava-jato Cruz')).toHaveCount(0)
})

test('o menu mostra o nome do usuário e permite sair', async ({ page }) => {
  await expect(page.getByText('Lucilene')).toBeVisible()

  await page.getByRole('button', { name: 'Sair' }).click()

  await expect(page).toHaveURL(/\/entrar$/)
})
