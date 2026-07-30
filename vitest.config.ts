import path from 'node:path'
import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

export default defineConfig({
  resolve: {
    // O código da aplicação importa por "@/", e o Vitest não lê os paths do
    // tsconfig por conta própria.
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    include: ['testes/**/*.test.ts'],
    exclude: ['testes/e2e/**'],
    fileParallelism: false,
    globalSetup: ['./testes/ajuda/setup-global.ts'],
  },
})
