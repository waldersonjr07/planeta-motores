import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { usuarios } from '../../src/db/schema'
import { gerarHash } from '../../src/modulos/auth/senha'
import { limparBanco } from '../ajuda/banco'

test.beforeEach(async () => {
  await limparBanco()
  await db.insert(usuarios).values({
    nome: 'Lucilene',
    email: 'lucilene@planetamotores.com.br',
    senhaHash: await gerarHash('motor2tempos'),
  })
})

test('rota protegida manda para o login', async ({ page }) => {
  await page.goto('/clientes')
  await expect(page).toHaveURL(/\/entrar$/)
})

test('entra com credenciais corretas', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('lucilene@planetamotores.com.br')
  await page.getByLabel('Senha').fill('motor2tempos')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL(/\/clientes$/)
})

test('mostra erro e permanece na tela com senha errada', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('lucilene@planetamotores.com.br')
  await page.getByLabel('Senha').fill('errada')
  await page.getByRole('button', { name: 'Entrar' }).click()

  // Não usar getByRole('alert') aqui: o Next injeta um anunciador de rota com
  // esse mesmo papel, e o seletor fica ambíguo.
  await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible()
  await expect(page).toHaveURL(/\/entrar$/)
})
