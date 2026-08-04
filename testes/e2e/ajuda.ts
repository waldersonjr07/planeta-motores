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

/**
 * Muda a situação pelo botão "Atualização da OS": abre o painel, escolhe o
 * destino e, quando a transição pede justificativa, preenche e confirma.
 */
export async function mudarSituacaoNaTela(
  page: Page,
  situacao: string,
  motivo?: string,
): Promise<void> {
  await page.getByRole('button', { name: /Atualização da OS/ }).click()
  // O rótulo do próximo passo recomendado ganha um sufixo; casamos pelo início.
  await page.getByRole('button', { name: new RegExp(`^${situacao}`) }).click()

  if (motivo !== undefined) {
    await page.getByRole('textbox', { name: /^Por que/ }).fill(motivo)
    await page.getByRole('button', { name: new RegExp(`^Confirmar: ${situacao}`) }).click()
  }

  // O painel fecha sozinho quando a situação muda.
  await expect(page.getByText('Mudar para')).toHaveCount(0)
}

/** Lança ajuste de estoque passando pela tela de confirmação. */
export async function lancarAjuste(
  page: Page,
  peca: string,
  quantidade: string,
  motivo?: string,
): Promise<void> {
  await page.getByLabel('Peça do ajuste').selectOption({ label: peca })
  await page.getByLabel('Quantidade do ajuste').fill(quantidade)
  if (motivo) await page.getByLabel('Motivo (opcional)').fill(motivo)

  await page.getByRole('button', { name: 'Lançar ajuste' }).click()
  await expect(page.getByText('Confirmar ajuste?')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
}
