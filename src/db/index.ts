import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL não definida')

/**
 * Em desenvolvimento o Next reavalia este módulo a cada recompilação. Sem
 * guardar o cliente fora do módulo, cada recompilação abriria um pool novo e
 * deixaria o anterior aberto — em poucas horas o Postgres chega ao limite de
 * conexões e o sistema para de responder, com erro de consulta e não de
 * conexão, o que esconde a causa.
 */
const global = globalThis as unknown as {
  clientePlanetaMotores?: ReturnType<typeof postgres>
}

const cliente = global.clientePlanetaMotores ?? postgres(url, { max: 5 })

if (process.env.NODE_ENV !== 'production') {
  global.clientePlanetaMotores = cliente
}

export const db = drizzle(cliente, { schema })
export type Db = typeof db
