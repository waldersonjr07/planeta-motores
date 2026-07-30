import { expect, type Page } from '@playwright/test'
import { db } from '../../src/db'
import { usuarios } from '../../src/db/schema'
import { gerarHash } from '../../src/modulos/auth/senha'
import { limparBanco } from '../ajuda/banco'

export const CREDENCIAIS = {
  email: 'lucilene@planetamotores.com.br',
  senha: 'motor2tempos',
}

/**
 * Limpa o banco, cria a Lucilene e entra. Espera o redirecionamento antes de
 * devolver: navegar no meio da ação de servidor aborta a gravação do cookie.
 */
export async function prepararSessao(page: Page): Promise<void> {
  await limparBanco()
  await db.insert(usuarios).values({
    nome: 'Lucilene',
    email: CREDENCIAIS.email,
    senhaHash: await gerarHash(CREDENCIAIS.senha),
  })

  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(CREDENCIAIS.email)
  await page.getByLabel('Senha').fill(CREDENCIAIS.senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/ordens-servico$/)
}
