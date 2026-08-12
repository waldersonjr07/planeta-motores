import { expect, test } from '@playwright/test'
import { prepararSessao } from './ajuda'

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)
})

test('o CPF ganha ponto e traço conforme se digita', async ({ page }) => {
  await page.goto('/clientes/novo')
  const documento = page.getByLabel('CPF/CNPJ')

  await documento.pressSequentially('123')
  await expect(documento).toHaveValue('123.')

  await documento.pressSequentially('45678901')
  await expect(documento).toHaveValue('123.456.789-01')
})

test('o documento vira CNPJ ao passar do 11º dígito', async ({ page }) => {
  await page.goto('/clientes/novo')
  const documento = page.getByLabel('CPF/CNPJ')

  await documento.pressSequentially('12345678000190')
  await expect(documento).toHaveValue('12.345.678/0001-90')
})

test('o telefone abre parêntese e põe traço antes dos 4 últimos', async ({ page }) => {
  await page.goto('/clientes/novo')
  const telefone = page.getByLabel('Telefone')

  await telefone.pressSequentially('12')
  await expect(telefone).toHaveValue('(12) ')

  await telefone.pressSequentially('345678910')
  await expect(telefone).toHaveValue('(12) 34567-8910')
})

test('backspace apaga o dígito, não trava no separador', async ({ page }) => {
  await page.goto('/clientes/novo')
  const documento = page.getByLabel('CPF/CNPJ')

  await documento.pressSequentially('123')
  await expect(documento).toHaveValue('123.')

  await documento.press('Backspace')
  await expect(documento).toHaveValue('12')
})

test('o cliente é gravado com o documento pontuado na tela', async ({ page }) => {
  await page.goto('/clientes/novo')
  await page.getByLabel('Nome').fill('João da Silva')
  await page.getByLabel('CPF/CNPJ').pressSequentially('12345678901')
  await page.getByLabel('Telefone').pressSequentially('12345678910')
  await page.getByRole('button', { name: /Salvar|Cadastrar/ }).click()

  await expect(page.getByText('João da Silva')).toBeVisible()
})
