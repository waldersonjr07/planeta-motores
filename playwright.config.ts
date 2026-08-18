import { writeFileSync } from 'node:fs'
import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'
import { CAMINHO_ULTIMO_BACKUP, marcador } from './testes/e2e/caminho-backup'

dotenv.config({ path: '.env.test' })

/*
 * Carimbo de backup recente, escrito antes de o servidor subir. Sem ele o
 * painel avisaria "a cópia de segurança não está sendo feita" em toda a suíte,
 * porque arquivo ausente é aviso de propósito. O spec do painel reescreve este
 * arquivo com a data que cada caso precisa.
 */
writeFileSync(CAMINHO_ULTIMO_BACKUP, marcador(new Date()))

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
    env: {
      DATABASE_URL: process.env.DATABASE_URL!,
      CAMINHO_ULTIMO_BACKUP,
    },
  },
})
