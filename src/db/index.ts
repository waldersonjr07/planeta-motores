import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL não definida')

const cliente = postgres(url, { max: 5 })

export const db = drizzle(cliente, { schema })
export type Db = typeof db
