import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

export default defineConfig({
  testDir: './testes/e2e',
  // Os testes compartilham o banco de teste e o limpam entre casos.
  workers: 1,
  /*
   * 30 s (o padrão) não cobre a primeira visita a uma rota depois de o `.next`
   * ser apagado: no Windows, a compilação sob demanda do `next dev` passa
   * disso com folga e o teste falha por tempo, não por defeito.
   */
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://localhost:3100' },
  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://localhost:3100/entrar',
    reuseExistingServer: false,
    timeout: 180_000,
    env: { DATABASE_URL: process.env.DATABASE_URL! },
  },
})
