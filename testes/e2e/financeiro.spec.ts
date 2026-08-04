import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { clientes, equipamentos, servicos } from '../../src/db/schema'
import { mudarSituacaoNaTela, prepararSessao } from './ajuda'

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)

  const [cliente] = await db
    .insert(clientes)
    .values({ nome: 'Marcos Andrade', telefone: '11987654321' })
    .returning()
  await db.insert(equipamentos).values({
    clienteId: cliente.id,
    tipoMotor: '2T',
    aplicacao: 'rocadeira',
    marca: 'Stihl',
    modelo: 'FS 220',
  })
  await db
    .insert(servicos)
    .values({ nome: 'Retífica de cilindro', precoPadraoCentavos: 21000 })

  // Abre a OS e lança o serviço.
  await page.goto('/ordens-servico/nova')
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()

  await page.getByRole('link', { name: /^Orçamento/ }).click()
  await page.getByLabel('Item').selectOption({ label: 'Retífica de cilindro — R$ 210,00' })
  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await expect(page.getByText('Total R$ 210,00')).toBeVisible()
})

test('sinal deixa a cobrança parcial e o saldo aparece em contas a receber', async ({
  page,
}) => {
  await page.getByRole('link', { name: /^Pagamentos/ }).click()
  await page.getByLabel('Valor').fill('50,00')
  await page.getByLabel('Forma').selectOption('pix')
  await page.getByLabel('Observação').fill('Sinal para peça')
  await page.getByRole('button', { name: 'Lançar pagamento' }).click()

  await expect(page.getByRole('cell', { name: 'R$ 50,00' })).toBeVisible()
  await expect(page.getByText('cobrança parcial')).toBeVisible()

  await page.goto('/financeiro')
  await expect(page.getByText('Total em aberto:')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'R$ 160,00' })).toBeVisible()
})

test('pagamento acima do saldo é recusado com o saldo na mensagem', async ({ page }) => {
  await page.getByRole('link', { name: /^Pagamentos/ }).click()
  await page.getByLabel('Valor').fill('500,00')
  await page.getByRole('button', { name: 'Lançar pagamento' }).click()

  await expect(
    page.getByText('O pagamento passa do saldo devedor, que é de R$ 210,00.'),
  ).toBeVisible()
})

test('quitar tira a OS de contas a receber', async ({ page }) => {
  await page.getByRole('link', { name: /^Pagamentos/ }).click()
  await page.getByLabel('Valor').fill('210,00')
  await page.getByRole('button', { name: 'Lançar pagamento' }).click()

  await expect(page.getByText('cobrança quitada')).toBeVisible()

  await page.goto('/financeiro')
  await expect(page.getByText('Ninguém devendo.')).toBeVisible()
})

test('despesa entra no resultado do mês', async ({ page }) => {
  await page.goto('/financeiro')
  await page.getByLabel('Descrição').fill('Conta de luz')
  await page.getByLabel('Valor').fill('180,00')
  await page.getByLabel('Categoria').selectOption('energia')
  await page.getByRole('button', { name: 'Lançar despesa' }).click()

  await expect(page.getByRole('cell', { name: 'Conta de luz' })).toBeVisible()
  // Sem entradas, o resultado do mês fica negativo no valor da despesa. O valor
  // aparece também na linha "Outras despesas", por isso o escopo no bloco.
  const resultado = page.getByRole('group', { name: 'Resultado do período' })
  await expect(resultado.getByText('-R$ 180,00')).toHaveCount(2)
})

test('a ficha oferece os PDFs e a mensagem de WhatsApp', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'PDF do comprovante' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'PDF do orçamento' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'PDF do recibo' })).toBeVisible()

  const aviso = page.getByRole('link', { name: 'Avisar: orçamento' })
  await expect(aviso).toHaveAttribute('href', /^https:\/\/wa\.me\/5511987654321\?text=/)
})

test('a rota de documento entrega um PDF de verdade', async ({ page }) => {
  const href = await page
    .getByRole('link', { name: 'PDF do orçamento' })
    .getAttribute('href')

  // Pela rota HTTP, com a sessão da página: o teste de integração exercita só
  // a geração, e a rota tem guarda de sessão e cabeçalhos próprios.
  const resposta = await page.request.get(href!)

  expect(resposta.status()).toBe(200)
  expect(resposta.headers()['content-type']).toBe('application/pdf')
  const corpo = await resposta.body()
  expect(corpo.subarray(0, 5).toString()).toBe('%PDF-')
})

test('documento sem sessão é recusado', async ({ page, request }) => {
  const href = await page
    .getByRole('link', { name: 'PDF do recibo' })
    .getAttribute('href')

  // `request` do contexto de teste não carrega os cookies da página.
  const resposta = await request.get(`http://localhost:3100${href}`)

  expect(resposta.status()).toBe(401)
})

test('o painel mostra as pendências e o valor a receber', async ({ page }) => {
  // Só vira pendência a partir de "orçamento enviado": em "recebido" não há
  // nada esperando resposta de ninguém.
  await mudarSituacaoNaTela(page, 'Em diagnóstico')
  await mudarSituacaoNaTela(page, 'Orçamento enviado')

  await page.getByRole('link', { name: /^Pagamentos/ }).click()
  await page.getByLabel('Valor').fill('50,00')
  await page.getByRole('button', { name: 'Lançar pagamento' }).click()

  await page.goto('/painel')
  // O mesmo valor aparece na lista de cobranças; o escopo garante que estamos
  // conferindo o indicador.
  await expect(page.getByRole('group', { name: 'A receber' })).toContainText('R$ 160,00')
  await expect(page.getByRole('group', { name: 'Na oficina' })).toContainText('1')
  await expect(page.getByText('orçamento sem resposta')).toBeVisible()
})
