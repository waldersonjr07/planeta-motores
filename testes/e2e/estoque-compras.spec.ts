import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { fornecedores, pecas } from '../../src/db/schema'
import { lancarAjuste, prepararSessao } from './ajuda'

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)
  await db.insert(pecas).values({
    nome: 'Óleo 2 tempos',
    unidade: 'L',
    controlaSaldo: true,
    quantidadeMinima: '2',
    precoVendaCentavos: 3800,
  })
  await db.insert(fornecedores).values({ nome: 'Peças Rio Claro' })
})

test('ajuste move o saldo e a peça sai da lista de reposição', async ({ page }) => {
  await page.goto('/estoque')
  await expect(page.getByText('1 peça precisa de reposição')).toBeVisible()

  await lancarAjuste(page, 'Óleo 2 tempos (L)', '10', 'Inventário inicial')

  await expect(page.getByText('Ajuste lançado.')).toBeVisible()
  await expect(page.getByText('precisa de reposição')).toHaveCount(0)
})

test('a confirmação mostra o saldo antes e depois, e dá para cancelar', async ({ page }) => {
  await page.goto('/estoque')
  await page.getByLabel('Peça').selectOption({ label: 'Óleo 2 tempos (L)' })
  await page.getByLabel('Quantidade do ajuste').fill('10')
  await page.getByRole('button', { name: 'Lançar ajuste' }).click()

  await expect(page.getByText('Confirmar ajuste?')).toBeVisible()
  await expect(page.getByText('passa de 0 para')).toBeVisible()

  await page.getByRole('button', { name: 'Cancelar' }).click()

  await expect(page.getByText('Confirmar ajuste?')).toHaveCount(0)
  await expect(page.getByText('Ajuste lançado.')).toHaveCount(0)
})

test('ajuste sem motivo é aceito depois da confirmação', async ({ page }) => {
  await page.goto('/estoque')

  await lancarAjuste(page, 'Óleo 2 tempos (L)', '5')

  await expect(page.getByText('Ajuste lançado.')).toBeVisible()
  const linha = page.getByRole('row').filter({ hasText: 'Óleo 2 tempos' })
  await expect(linha.getByRole('cell', { name: '5', exact: true })).toBeVisible()
})

test('baixa por ajuste negativo deixa o saldo negativo em destaque', async ({ page }) => {
  await page.goto('/estoque')

  await lancarAjuste(page, 'Óleo 2 tempos (L)', '-3', 'Perda no galpão')

  const linha = page.getByRole('row').filter({ hasText: 'Óleo 2 tempos' })
  await expect(linha.getByRole('cell', { name: '-3', exact: true })).toBeVisible()
})

test('compra entra no estoque', async ({ page }) => {
  await page.goto('/compras')
  await expect(page.getByText('Nenhuma compra registrada ainda.')).toBeVisible()

  await page.getByRole('link', { name: 'Nova compra' }).click()
  await page.getByLabel('Fornecedor').selectOption({ label: 'Peças Rio Claro' })
  // Os campos da linha têm rótulo próprio: o formulário aceita várias linhas,
  // e "Peça" sozinho seria ambíguo tanto para o teste quanto para leitor de tela.
  await page.getByLabel('Peça da linha 1').selectOption({ label: 'Óleo 2 tempos (L)' })
  await page.getByLabel('Quantidade da linha 1').fill('4')
  await page.getByLabel('Custo unitário da linha 1').fill('30,00')
  await page.getByRole('button', { name: 'Registrar compra' }).click()

  await expect(page.getByRole('cell', { name: 'Peças Rio Claro' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'R$ 120,00' })).toBeVisible()

  await page.goto('/estoque')
  const linha = page.getByRole('row').filter({ hasText: 'Óleo 2 tempos' })
  await expect(linha.getByRole('cell', { name: '4', exact: true })).toBeVisible()
})
