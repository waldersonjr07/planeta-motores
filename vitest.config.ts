import path from 'node:path'
import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

export default defineConfig({
  // O tsconfig usa `jsx: preserve` (o Next cuida disso no build dele). No
  // Vitest o esbuild cairia no runtime clássico e procuraria um `React` global.
  esbuild: { jsx: 'automatic' },
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
