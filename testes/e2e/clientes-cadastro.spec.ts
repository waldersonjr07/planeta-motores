import { expect, test } from '@playwright/test'
import { prepararSessao } from './ajuda'

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)
  await page.goto('/clientes')
})

test('cadastra o cliente e cai na ficha dele', async ({ page }) => {
  await page.getByRole('link', { name: 'Novo cliente' }).click()
  await page.getByLabel('Nome').fill('Marcos Andrade')
  await page.getByLabel('Telefone').fill('(11) 98765-4321')
  await page.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByRole('heading', { name: 'Marcos Andrade' })).toBeVisible()
  await expect(page.getByText('11987654321')).toBeVisible()
})

test('recusa cliente sem nome mostrando o erro no campo', async ({ page }) => {
  await page.getByRole('link', { name: 'Novo cliente' }).click()
  await page.getByLabel('Nome').fill('   ')
  // Sem desligar o `required`, o navegador barra o envio e a validação do
  // servidor nunca é exercitada.
  await page.getByLabel('Nome').evaluate((campo: HTMLInputElement) => {
    campo.required = false
  })
  await page.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByText('Nome é obrigatório')).toBeVisible()
})

test('adiciona equipamento na ficha do cliente', async ({ page }) => {
  await page.getByRole('link', { name: 'Novo cliente' }).click()
  await page.getByLabel('Nome').fill('Marcos Andrade')
  await page.getByRole('button', { name: 'Salvar' }).click()

  await page.getByLabel('Marca').fill('Stihl')
  await page.getByLabel('Modelo').fill('FS 220')
  await page.getByRole('button', { name: 'Adicionar equipamento' }).click()

  await expect(page.getByText('Roçadeira Stihl FS 220 (2T)')).toBeVisible()
})

test('o botão de voltar leva à lista de clientes', async ({ page }) => {
  await page.getByRole('link', { name: 'Novo cliente' }).click()
  await page.getByLabel('Nome').fill('Marcos Andrade')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('heading', { name: 'Marcos Andrade' })).toBeVisible()

  await page.getByRole('link', { name: 'Voltar para clientes' }).click()

  await expect(page).toHaveURL(/\/clientes$/)
  await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible()
})

test('inativa o cliente e ele sai da lista', async ({ page }) => {
  await page.getByRole('link', { name: 'Novo cliente' }).click()
  await page.getByLabel('Nome').fill('Marcos Andrade')
  await page.getByRole('button', { name: 'Salvar' }).click()

  await page.getByRole('button', { name: 'Inativar' }).click()
  await expect(page.getByText('inativo')).toBeVisible()

  await page.goto('/clientes')
  await expect(page.getByText('Nenhum cliente cadastrado ainda.')).toBeVisible()
})
