import { rmSync, writeFileSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'
import { prepararSessao } from './ajuda'
import { CAMINHO_ULTIMO_BACKUP, marcador } from './caminho-backup'

const AVISO = 'A cópia de segurança do sistema não está sendo feita. Avise o Walderson.'

const UMA_HORA = 3_600_000

function backupFeitoHa(horas: number): void {
  writeFileSync(CAMINHO_ULTIMO_BACKUP, marcador(new Date(Date.now() - horas * UMA_HORA)))
}

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)
})

// Deixa o carimbo em dia para os outros arquivos da suíte, que compartilham o
// mesmo servidor.
test.afterAll(() => {
  backupFeitoHa(0)
})

// Não usar getByRole('alert') solto: o Next injeta um anunciador de rota com
// esse mesmo papel, e o seletor fica ambíguo — a mesma armadilha registrada em
// login.spec.ts. O papel continua sendo verificado, mas junto do texto.
const aviso = (page: Page) => page.getByRole('alert').filter({ hasText: AVISO })

test('painel não fala de backup quando o backup está em dia', async ({ page }) => {
  backupFeitoHa(6)
  await page.goto('/painel')

  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible()
  await expect(page.getByText(AVISO)).toHaveCount(0)
})

test('painel avisa quando o backup parou', async ({ page }) => {
  backupFeitoHa(40)
  await page.goto('/painel')

  await expect(aviso(page)).toBeVisible()
})

test('painel avisa também quando o carimbo some', async ({ page }) => {
  // O caso que justifica o desenho: se a própria conferência quebrar — volume
  // não montado, arquivo apagado — a tela não pode ficar calada, porque calada
  // é o que ela fica quando está tudo certo.
  rmSync(CAMINHO_ULTIMO_BACKUP, { force: true })
  await page.goto('/painel')

  await expect(aviso(page)).toBeVisible()
})
