import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

export default async function setupGlobal() {
  const dbUrl = process.env.DATABASE_URL || 'oficina_teste.db'
  let limpo = dbUrl.trim()
  if (limpo.startsWith('file://')) {
    limpo = limpo.slice(7)
  } else if (limpo.startsWith('file:') || limpo.startsWith('sqlite:')) {
    limpo = limpo.replace(/^(file:|sqlite:)\/?\/?/, '')
  }
  limpo = limpo.replace(/^\/([a-zA-Z]:)/, '$1')
  const caminhoBanco = path.isAbsolute(limpo) ? limpo : path.resolve(process.cwd(), limpo)

  const cliente = new Database(caminhoBanco)
  cliente.pragma('foreign_keys = ON')
  migrate(drizzle(cliente), { migrationsFolder: './drizzle' })
  cliente.close()
}
