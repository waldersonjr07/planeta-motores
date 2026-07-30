import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

export default defineConfig({
  testDir: './testes/e2e',
  // Os testes compartilham o banco de teste e o limpam entre casos.
  workers: 1,
  use: { baseURL: 'http://localhost:3100' },
  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://localhost:3100/entrar',
    reuseExistingServer: false,
    timeout: 180_000,
    env: { DATABASE_URL: process.env.DATABASE_URL! },
  },
})
