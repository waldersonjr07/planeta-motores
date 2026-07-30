import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { clientes, usuarios } from '../../src/db/schema'
import { gerarHash } from '../../src/modulos/auth/senha'
import { limparBanco } from '../ajuda/banco'

test.beforeEach(async ({ page }) => {
  await limparBanco()
  await db.insert(usuarios).values({
    nome: 'Lucilene',
    email: 'lucilene@planetamotores.com.br',
    senhaHash: await gerarHash('motor2tempos'),
  })
  await db.insert(clientes).values([
    { nome: 'Verde Jardins Paisagismo', cidade: 'São Paulo' },
    { nome: 'Lava-jato Cruz', cidade: 'Osasco' },
  ])

  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('lucilene@planetamotores.com.br')
  await page.getByLabel('Senha').fill('motor2tempos')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/clientes$/)
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
