import { sql } from 'drizzle-orm'
import { expect, test } from 'vitest'
import { db } from '../../src/db'

test('a conexão responde a uma consulta trivial', async () => {
  const linhas = db.all<{ um: number }>(sql`select 1 as um`)
  expect(linhas[0].um).toBe(1)
})

