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
  const secao = page.getByRole('region', { name: 'Ajuste de inventário' })

  await secao.getByLabel('Peça').selectOption({ label: 'Óleo 2 tempos (L)' })
  await secao.getByLabel('Quantidade').fill('10')
  await secao.getByRole('button', { name: 'Lançar ajuste' }).click()

  await expect(secao.getByText('Confirmar ajuste?')).toBeVisible()
  await expect(secao.getByText('passa de 0 para')).toBeVisible()

  await secao.getByRole('button', { name: 'Cancelar' }).click()

  await expect(secao.getByText('Confirmar ajuste?')).toHaveCount(0)
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

  await page.getByLabel('Fornecedor').fill('Peças Rio')
  await page.getByRole('option', { name: 'Peças Rio Claro' }).click()

  await page.getByLabel('Peça da linha 1').fill('Óleo 2 tempos')
  await page.getByRole('option', { name: 'Óleo 2 tempos (L)' }).click()

  await page.getByLabel('Quantidade da linha 1').fill('4')
  await page.getByLabel('Custo unitário da linha 1').fill('30,00')
  await page.getByRole('button', { name: 'Registrar compra' }).click()

  await expect(page.getByRole('cell', { name: 'Peças Rio Claro' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'R$ 120,00' })).toBeVisible()

  await page.goto('/estoque')
  const linha = page.getByRole('row').filter({ hasText: 'Óleo 2 tempos' })
  await expect(linha.getByRole('cell', { name: '4', exact: true })).toBeVisible()
})

test('digitar o nome exato da peça casa com ela em vez de cadastrar outra', async ({
  page,
}) => {
  await page.goto('/compras/nova')

  // O nome real, sem a marca e a unidade que a opção exibe. E sai do campo
  // pelo teclado, sem clicar na opção: é o gesto de quem digita rápido.
  await page.getByLabel('Peça da linha 1').fill('Óleo 2 tempos')
  await page.getByLabel('Peça da linha 1').press('Tab')
  await expect(page.getByLabel('Unidade da linha 1')).toBeHidden()

  await page.getByLabel('Quantidade da linha 1').fill('3')
  await page.getByLabel('Custo unitário da linha 1').fill('30,00')
  await page.getByRole('button', { name: 'Registrar compra' }).click()
  await expect(page).toHaveURL('/compras')

  await page.goto('/estoque')
  // Uma linha só: o saldo não se repartiu entre duas peças homônimas.
  const linha = page.getByRole('row').filter({ hasText: 'Óleo 2 tempos' })
  await expect(linha).toHaveCount(1)
  await expect(linha.getByRole('cell', { name: '3', exact: true })).toBeVisible()
})

test('peça digitada na hora entra no cadastro e no estoque', async ({ page }) => {
  await page.goto('/compras/nova')

  await page.getByLabel('Fornecedor').fill('Peças Rio Claro')
  await page.getByRole('option', { name: 'Peças Rio Claro' }).click()

  await page.getByLabel('Peça da linha 1').fill('Vela NGK BPMR7A')
  await page.getByRole('option', { name: /Cadastrar .*Vela NGK BPMR7A/ }).click()

  await page.getByLabel('Quantidade da linha 1').fill('4')
  await page.getByLabel('Custo unitário da linha 1').fill('28,00')
  await page.getByRole('button', { name: 'Registrar compra' }).click()

  await expect(page.getByRole('cell', { name: 'R$ 112,00' })).toBeVisible()

  await page.goto('/estoque')
  const linha = page.getByRole('row').filter({ hasText: 'Vela NGK BPMR7A' })
  await expect(linha.getByRole('cell', { name: '4', exact: true })).toBeVisible()
})

test('erro de validação não apaga o cabeçalho nem as linhas da compra', async ({
  page,
}) => {
  await page.goto('/compras/nova')

  await page.getByLabel('Fornecedor').fill('Peças Rio')
  await page.getByRole('option', { name: 'Peças Rio Claro' }).click()
  await page.getByLabel('Nota / documento').fill('NF 1234')
  await page.getByLabel('Observações').fill('Entrega parcial')

  await page.getByLabel('Peça da linha 1').fill('Óleo 2 tempos')
  await page.getByRole('option', { name: 'Óleo 2 tempos (L)' }).click()
  await page.getByLabel('Quantidade da linha 1').fill('4')
  await page.getByLabel('Custo unitário da linha 1').fill('30,00')

  await page.getByRole('button', { name: 'Adicionar linha' }).click()
  await page.getByLabel('Peça da linha 2').fill('Óleo Motul 800')
  await page.getByRole('option', { name: /Cadastrar .*Óleo Motul 800/ }).click()
  await page.getByLabel('Unidade da linha 2').selectOption('L')
  await page.getByLabel('Quantidade da linha 2').fill('0,5')

  // Custo da segunda linha em branco: reprova, e nada pode sumir da tela.
  await page.getByRole('button', { name: 'Registrar compra' }).click()
  await expect(page.getByText('Informe o custo da linha 2.')).toBeVisible()

  await expect(page.getByLabel('Fornecedor')).toHaveValue('Peças Rio Claro')
  await expect(page.getByLabel('Nota / documento')).toHaveValue('NF 1234')
  await expect(page.getByLabel('Observações')).toHaveValue('Entrega parcial')
  await expect(page.getByLabel('Peça da linha 1')).toHaveValue('Óleo 2 tempos (L)')
  await expect(page.getByLabel('Quantidade da linha 1')).toHaveValue('4')
  await expect(page.getByLabel('Custo unitário da linha 1')).toHaveValue('30,00')
  await expect(page.getByLabel('Peça da linha 2')).toHaveValue('Óleo Motul 800')
  await expect(page.getByLabel('Unidade da linha 2')).toHaveValue('L')
  await expect(page.getByLabel('Quantidade da linha 2')).toHaveValue('0,5')

  // Só o que faltava, e a compra entra inteira — as duas linhas.
  await page.getByLabel('Custo unitário da linha 2').fill('45,00')
  await page.getByRole('button', { name: 'Registrar compra' }).click()
  await expect(page).toHaveURL('/compras')
  await expect(page.getByRole('cell', { name: 'Peças Rio Claro' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'R$ 142,50' })).toBeVisible()

  await page.goto('/estoque')
  const motul = page.getByRole('row').filter({ hasText: 'Óleo Motul 800' })
  await expect(motul.getByRole('cell', { name: '0,5', exact: true })).toBeVisible()
})

test('peça nova em litro respeita a unidade escolhida', async ({ page }) => {
  await page.goto('/compras/nova')

  await page.getByLabel('Peça da linha 1').fill('Óleo Motul 800')
  await page.getByRole('option', { name: /Cadastrar .*Óleo Motul 800/ }).click()
  await page.getByLabel('Unidade da linha 1').selectOption('L')

  await page.getByLabel('Quantidade da linha 1').fill('0,5')
  await page.getByLabel('Custo unitário da linha 1').fill('45,00')
  await page.getByRole('button', { name: 'Registrar compra' }).click()

  // Espera o redirecionamento de sucesso antes de navegar: sair da página no
  // meio da ação de servidor pode abortar a requisição em voo (mesmo risco
  // documentado em `prepararSessao`, aqui no envio da compra).
  await expect(page).toHaveURL('/compras')

  await page.goto('/estoque')
  const linha = page.getByRole('row').filter({ hasText: 'Óleo Motul 800' })
  await expect(linha.getByRole('cell', { name: '0,5', exact: true })).toBeVisible()
})
