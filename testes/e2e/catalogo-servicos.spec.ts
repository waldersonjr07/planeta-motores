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
