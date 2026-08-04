import { expect, test } from '@playwright/test'
import { db } from '../../src/db'
import { clientes, equipamentos, pecas, servicos } from '../../src/db/schema'
import { lancarAjuste, mudarSituacaoNaTela, prepararSessao, resumoDaOs } from './ajuda'

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)

  const [cliente] = await db.insert(clientes).values({ nome: 'Marcos Andrade' }).returning()
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
  await db.insert(pecas).values({
    nome: 'Kit cilindro 40mm',
    controlaSaldo: true,
    quantidadeMinima: '1',
  })
})

test('percorre a OS do recebimento até a entrega e baixa o estoque', async ({ page }) => {
  // Entra estoque para a peça, para a baixa ser visível no fim.
  await page.goto('/estoque')
  await lancarAjuste(page, 'Kit cilindro 40mm (un)', '5', 'Inventário inicial')
  await expect(page.getByText('Ajuste lançado.')).toBeVisible()

  // Abre a OS.
  await page.goto('/ordens-servico')
  await page.getByRole('link', { name: 'Nova OS' }).click()
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByLabel('Problema relatado pelo cliente').fill('Não pega a frio')
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()

  await expect(page.getByRole('heading', { name: /^OS \d{4}-0001$/ })).toBeVisible()

  // Diagnóstico.
  await mudarSituacaoNaTela(page, 'Em diagnóstico')
  await page.getByLabel('Diagnóstico do Ivan').fill('Cilindro riscado')
  await page.getByRole('button', { name: 'Salvar diagnóstico' }).click()
  await expect(page.getByText('Diagnóstico salvo.')).toBeVisible()

  // Orçamento: um serviço e uma peça do catálogo.
  await page.getByRole('link', { name: /^Orçamento/ }).click()
  await page.getByLabel('Item').selectOption({ label: 'Retífica de cilindro — R$ 210,00' })
  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await expect(page.getByRole('cell', { name: 'Retífica de cilindro' })).toBeVisible()

  // Peça não tem preço de tabela: o valor é digitado aqui.
  await page.getByLabel('Item').selectOption({ label: 'Kit cilindro 40mm (un)' })
  await page.getByLabel('Quantidade').fill('2')
  await page.getByLabel('Valor unitário').fill('230,00')
  await page.getByRole('button', { name: 'Adicionar item' }).click()

  // 21.000 + 2 × 23.000 = 67.000 centavos. O valor aparece no cabeçalho e na
  // soma do orçamento; conferimos o do cabeçalho, que fica sempre à vista.
  await expect(resumoDaOs(page)).toContainText('R$ 670,00')

  // Envia, aprova, executa, conclui e entrega.
  await mudarSituacaoNaTela(page, 'Orçamento enviado')
  await expect(resumoDaOs(page)).toContainText('versão 1')

  await mudarSituacaoNaTela(page, 'Aprovado')
  await mudarSituacaoNaTela(page, 'Em execução')
  await mudarSituacaoNaTela(page, 'Pronto')
  await mudarSituacaoNaTela(page, 'Entregue')

  await expect(page.getByText('Ordem de serviço encerrada.')).toBeVisible()

  // O histórico tem as sete linhas do caminho completo. Escopo em `main`
  // porque o menu lateral também é uma lista.
  await page.getByRole('link', { name: /^Histórico/ }).click()
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(7)
  await expect(page.getByText('Em execução → Pronto')).toBeVisible()

  // O estoque baixou as duas peças: 5 − 2 = 3.
  await page.goto('/estoque')
  const linha = page.getByRole('row').filter({ hasText: 'Kit cilindro 40mm' })
  await expect(linha.getByRole('cell', { name: '3', exact: true })).toBeVisible()
})

test('item digitado em "Outros" entra no orçamento com valor livre', async ({ page }) => {
  await page.goto('/ordens-servico/nova')
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()

  await page.getByRole('link', { name: /^Orçamento/ }).click()
  await page.getByLabel('Item').selectOption('outros')

  await page.getByLabel('Descrição').fill('Mão de obra de desmontagem')
  await page.getByLabel('Valor unitário').fill('150,00')
  await page.getByRole('button', { name: 'Adicionar item' }).click()

  await expect(page.getByRole('cell', { name: 'Mão de obra de desmontagem' })).toBeVisible()
  await expect(resumoDaOs(page)).toContainText('R$ 150,00')

  // O catálogo continua intacto: o item digitado vale só para esta OS.
  await page.goto('/catalogo/servicos')
  await expect(page.getByText('Mão de obra de desmontagem')).toHaveCount(0)
  await expect(page.getByRole('cell', { name: 'Retífica de cilindro' })).toBeVisible()
})

test('item digitado cobrado como peça não movimenta o estoque', async ({ page }) => {
  await page.goto('/estoque')
  await lancarAjuste(page, 'Kit cilindro 40mm (un)', '5')

  await page.goto('/ordens-servico/nova')
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()

  await page.getByRole('link', { name: /^Orçamento/ }).click()
  await page.getByLabel('Item').selectOption('outros')
  await page.getByLabel('Descrição').fill('Parafuso avulso')
  await page.getByLabel('Cobrar como').selectOption('peca')
  await page.getByLabel('Valor unitário').fill('2,50')
  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await expect(page.getByRole('cell', { name: 'Parafuso avulso' })).toBeVisible()

  for (const passo of [
    'Em diagnóstico',
    'Orçamento enviado',
    'Aprovado',
    'Em execução',
    'Pronto',
  ]) {
    await mudarSituacaoNaTela(page, passo)
  }

  await page.goto('/estoque')
  const linha = page.getByRole('row').filter({ hasText: 'Kit cilindro 40mm' })
  await expect(linha.getByRole('cell', { name: '5', exact: true })).toBeVisible()
})

test('abre a OS digitando cliente e máquina na hora', async ({ page }) => {
  await page.goto('/ordens-servico/nova')

  await page.getByLabel('Cliente e equipamento').selectOption('novo')
  await page.getByLabel('Nome do cliente').fill('Ana Souza')
  await page.getByLabel('CPF/CNPJ').fill('987.654.321-00')
  await page.getByLabel('Telefone').fill('(11) 91234-5678')
  await page.getByLabel('Máquina').selectOption('motosserra')
  await page.getByLabel('Motor').selectOption('4T')
  await page.getByLabel('Marca').fill('Husqvarna')
  await page.getByLabel('Modelo').fill('372 XP')
  await page.getByLabel('Problema relatado pelo cliente').fill('Não corta')
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()

  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()
  await expect(page.getByText('Ana Souza')).toBeVisible()
  await expect(page.getByText('Motosserra Husqvarna 372 XP (4T)')).toBeVisible()

  // O cadastro sai de verdade: o cliente entra na carteira com a máquina.
  await page.goto('/clientes')
  const linha = page.getByRole('row').filter({ hasText: 'Ana Souza' })
  await expect(linha.getByRole('cell', { name: '11912345678' })).toBeVisible()
  await expect(linha.getByRole('cell', { name: '1', exact: true })).toBeVisible()
})

test('cliente novo exige o nome', async ({ page }) => {
  await page.goto('/ordens-servico/nova')
  await page.getByLabel('Cliente e equipamento').selectOption('novo')

  const nome = page.getByLabel('Nome do cliente')
  await nome.fill('   ')
  // Sem desligar o `required`, o navegador barra o envio e a validação do
  // servidor nunca é exercitada.
  await nome.evaluate((campo: HTMLInputElement) => {
    campo.required = false
  })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()

  await expect(page.getByText('Nome do cliente é obrigatório')).toBeVisible()
})

test('a lista filtra por situação e encontra pela busca', async ({ page }) => {
  await page.goto('/ordens-servico')
  await page.getByRole('link', { name: 'Nova OS' }).click()
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()

  await page.goto('/ordens-servico')
  await expect(page.getByRole('cell', { name: 'Marcos Andrade' })).toBeVisible()

  await page.getByLabel('Situação').selectOption('entregue')
  await expect(
    page.getByText('Nenhuma ordem de serviço encontrada com esses filtros.'),
  ).toBeVisible()

  await page.goto('/ordens-servico')
  await page.getByLabel('Buscar ordem de serviço').fill('andrade')
  await page.getByLabel('Buscar ordem de serviço').press('Enter')
  await expect(page.getByRole('cell', { name: 'Marcos Andrade' })).toBeVisible()
})

test('cancelar encerra a OS em um clique, sem pedir justificativa', async ({ page }) => {
  await page.goto('/ordens-servico/nova')
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()

  await page.getByRole('button', { name: /Atualização da OS/ }).click()
  await expect(page.getByRole('textbox', { name: /^Por que/ })).toHaveCount(0)
  await page.getByRole('button', { name: /^Cancelado/ }).click()

  await expect(page.getByText('Ordem de serviço encerrada.')).toBeVisible()
})

test('a observação do painel vai para o histórico', async ({ page }) => {
  await page.goto('/ordens-servico/nova')
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()

  await page.getByRole('button', { name: /Atualização da OS/ }).click()
  await page.getByLabel('Observação (opcional)').fill('Aberta por engano')
  await page.getByRole('button', { name: /^Cancelado/ }).click()

  await page.getByRole('link', { name: /^Histórico/ }).click()
  await expect(page.getByText('Aberta por engano')).toBeVisible()
})

test('o botão de voltar leva à lista de ordens de serviço', async ({ page }) => {
  await page.goto('/ordens-servico/nova')
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()

  await page.getByRole('link', { name: 'Voltar para ordens de serviço' }).click()

  await expect(page).toHaveURL(/\/ordens-servico$/)
  await expect(page.getByRole('heading', { name: 'Ordens de serviço' })).toBeVisible()
})

test('o painel de atualização só oferece transições válidas', async ({ page }) => {
  await page.goto('/ordens-servico/nova')
  await page
    .getByLabel('Cliente e equipamento')
    .selectOption({ label: 'Roçadeira Stihl FS 220 (2T)' })
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByRole('heading', { name: /^OS/ })).toBeVisible()

  await page.getByRole('button', { name: /Atualização da OS/ }).click()

  // De "Recebido" só se vai para diagnóstico ou cancelamento: pular etapa
  // deixa de ser possível na tela, não só recusado no servidor.
  await expect(page.getByRole('button', { name: /^Em diagnóstico/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Cancelado/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Pronto/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Entregue/ })).toHaveCount(0)
})
