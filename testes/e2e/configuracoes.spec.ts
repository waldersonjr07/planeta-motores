import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { usuarios } from '../../src/db/schema'
import { gerarHash } from '../../src/modulos/auth/senha'
import { limparBanco } from '../ajuda/banco'

test.beforeEach(async ({ page }) => {
  await limparBanco()
  await db.insert(usuarios).values({
    nome: 'Lucilene',
    email: 'lucilene@planetamotores.com.br',
    senhaHash: await gerarHash('motor2tempos'),
  })

  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('lucilene@planetamotores.com.br')
  await page.getByLabel('Senha').fill('motor2tempos')
  await page.getByRole('button', { name: 'Entrar' }).click()
  // Esperar o redirecionamento antes de navegar: sair no meio aborta a ação de
  // servidor e o cookie de sessão nunca é gravado.
  await expect(page).toHaveURL(/\/clientes$/)
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
