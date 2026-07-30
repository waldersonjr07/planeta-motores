import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

export default async function setupGlobal() {
  const cliente = postgres(process.env.DATABASE_URL!, { max: 1 })
  await migrate(drizzle(cliente), { migrationsFolder: './drizzle' })
  await cliente.end()
}
