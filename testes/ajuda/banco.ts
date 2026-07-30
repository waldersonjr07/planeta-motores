import { sql } from 'drizzle-orm'
import { db } from '../../src/db'

/**
 * Esvazia todas as tabelas de domínio preservando o esquema. Descobre a lista
 * no catálogo do Postgres para que tabela nova entre sozinha, sem manutenção
 * desta função.
 */
export async function limparBanco(): Promise<void> {
  const linhas = await db.execute<{ nome: string }>(sql`
    select tablename as nome
    from pg_tables
    where schemaname = 'public'
      and tablename <> '__drizzle_migrations'
  `)
  if (linhas.length === 0) return
  const lista = linhas.map((l) => `"${l.nome}"`).join(', ')
  await db.execute(sql.raw(`truncate table ${lista} restart identity cascade`))
}
