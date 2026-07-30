import { expect, test } from '@playwright/test'
import { prepararSessao } from './ajuda'

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)
  await page.goto('/configuracoes')
})

test('salva os dados da empresa e mantém depois de recarregar', async ({ page }) => {
  await page.getByLabel('Nome da empresa').fill('Planeta Motores ME')
  await page.getByLabel('Telefone').fill('(19) 3524-1122')
  await page.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByText('Configurações salvas.')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Nome da empresa')).toHaveValue('Planeta Motores ME')
  await expect(page.getByLabel('Telefone')).toHaveValue('1935241122')
})

test('recusa validade de orçamento zerada', async ({ page }) => {
  const campo = page.getByLabel('Validade do orçamento (dias)')
  await campo.fill('0')
  // O campo tem min=1, então o navegador barraria o envio e a regra do servidor
  // nunca rodaria. Removemos a restrição para exercitar a validação de verdade.
  await campo.evaluate((elemento: HTMLInputElement) => elemento.removeAttribute('min'))

  await page.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByText('A validade precisa ser de pelo menos um dia')).toBeVisible()
})
