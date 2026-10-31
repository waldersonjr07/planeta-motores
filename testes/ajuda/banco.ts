import { db } from '../../src/db'

/**
 * Esvazia todas as tabelas de domínio preservando o esquema. Descobre a lista
 * no catálogo do SQLite para que tabela nova entre sozinha, sem manutenção
 * desta função.
 */
export async function limparBanco(): Promise<void> {
  const cliente = (db as any).$client
  const tabelas = cliente
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations'",
    )
    .all() as { name: string }[]

  if (tabelas.length === 0) return

  cliente.pragma('foreign_keys = OFF')
  for (const t of tabelas) {
    cliente.prepare(`DELETE FROM "${t.name}"`).run()
  }
  try {
    cliente.prepare('DELETE FROM sqlite_sequence').run()
  } catch {
    // sqlite_sequence não existe se nenhuma tabela usar autoincrement
  }
  cliente.pragma('foreign_keys = ON')
}
