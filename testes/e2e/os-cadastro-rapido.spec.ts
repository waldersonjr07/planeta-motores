import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { clientes, equipamentos } from '../../src/db/schema'
import { prepararSessao } from './ajuda'

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)
})

/**
 * Com a carteira vazia o seletor de equipamento já nasce em "novo", e o reset
 * do React 19 o devolve a esse mesmo valor — o único cenário em que perder a
 * escolha não faz mal. Quem semeia um equipamento exercita a oficina de
 * verdade, onde o padrão é "Selecione…".
 */
async function semearEquipamento(): Promise<void> {
  const [cliente] = await db.insert(clientes).values({ nome: 'Marcos Andrade' }).returning()
  await db.insert(equipamentos).values({
    clienteId: cliente.id,
    tipoMotor: '2T',
    aplicacao: 'rocadeira',
    marca: 'Stihl',
    modelo: 'FS 220',
  })
}

test('erro de validação não apaga o que já foi digitado', async ({ page }) => {
  await page.goto('/ordens-servico/nova')
  await page.getByLabel('Cliente e equipamento').selectOption('novo')

  // Nome em branco reprova; o resto tem de continuar na tela.
  await page.getByLabel('CPF/CNPJ').pressSequentially('12345678901')
  await page.getByLabel('Telefone').pressSequentially('12345678910')
  await page.getByLabel('Marca').fill('Husqvarna')
  await page.getByLabel('Modelo').fill('236')
  await page.getByLabel('Problema relatado pelo cliente').fill('Não pega a frio')

  // Sem desligar o `required`, o navegador barra o envio e a validação do
  // servidor nunca é exercitada (mesmo ajuste de testes/e2e/os-fluxo.spec.ts).
  await page.getByLabel('Nome do cliente').evaluate((campo: HTMLInputElement) => {
    campo.required = false
  })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()

  await expect(page.getByText('Nome do cliente é obrigatório')).toBeVisible()
  await expect(page.getByLabel('CPF/CNPJ')).toHaveValue('123.456.789-01')
  await expect(page.getByLabel('Telefone')).toHaveValue('(12) 34567-8910')
  await expect(page.getByLabel('Marca')).toHaveValue('Husqvarna')
  await expect(page.getByLabel('Modelo')).toHaveValue('236')
  await expect(page.getByLabel('Problema relatado pelo cliente')).toHaveValue(
    'Não pega a frio',
  )
})

test('máquina "Outro" sem dizer qual acusa o erro e mantém os dados', async ({
  page,
}) => {
  await page.goto('/ordens-servico/nova')
  await page.getByLabel('Cliente e equipamento').selectOption('novo')

  await page.getByLabel('Nome do cliente').fill('João da Silva')
  await page.getByLabel('Máquina').selectOption('outro')

  // "Qual máquina?" também é `required`; sem desligar, o navegador barra o
  // envio antes de a validação do servidor entrar em ação.
  await page.getByLabel('Qual máquina?').evaluate((campo: HTMLInputElement) => {
    campo.required = false
  })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()

  await expect(page.getByText('Diga qual é a máquina')).toBeVisible()
  await expect(page.getByLabel('Nome do cliente')).toHaveValue('João da Silva')
})

test('corrigido o erro, a OS abre mesmo com carteira cadastrada', async ({ page }) => {
  await semearEquipamento()

  await page.goto('/ordens-servico/nova')
  await page.getByLabel('Cliente e equipamento').selectOption('novo')

  await page.getByLabel('Máquina').selectOption('outro')

  // Nome do cliente também é `required` e está em branco aqui; sem desligar
  // os dois, o navegador barra o envio antes de a validação do servidor
  // entrar em ação (mesmo ajuste de testes/e2e/os-fluxo.spec.ts).
  await page.getByLabel('Nome do cliente').evaluate((campo: HTMLInputElement) => {
    campo.required = false
  })
  await page.getByLabel('Qual máquina?').evaluate((campo: HTMLInputElement) => {
    campo.required = false
  })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByText('Diga qual é a máquina')).toBeVisible()

  // O seletor tem de voltar em "novo": se voltar a "Selecione…", o `required`
  // barra o segundo envio apontando um campo que a Lucilene não mexeu.
  await expect(page.getByLabel('Cliente e equipamento')).toHaveValue('novo')

  await page.getByLabel('Nome do cliente').fill('João da Silva')
  await page.getByLabel('Qual máquina?').fill('Cortador de grama')
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()

  await expect(page).toHaveURL(/\/ordens-servico\/[0-9a-f-]{36}$/)
  await expect(page.getByText('Cortador de grama')).toBeVisible()
})
