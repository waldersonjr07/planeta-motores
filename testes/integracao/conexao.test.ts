import { sql } from 'drizzle-orm'
import { expect, test } from 'vitest'
import { db } from '../../src/db'

test('a conexão responde a uma consulta trivial', async () => {
  const linhas = await db.execute(sql`select 1 as um`)
  expect(linhas[0].um).toBe(1)
})

test('a conexão aponta para o banco de teste', async () => {
  const linhas = await db.execute(sql`select current_database() as banco`)
  expect(linhas[0].banco).toBe('pm_teste')
})
