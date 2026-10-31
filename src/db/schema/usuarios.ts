import { randomUUID } from 'node:crypto'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const usuarios = sqliteTable('usuarios', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
})

/**
 * `id` guarda o SHA-256 do token, não o token. Assim um vazamento do banco
 * não entrega sessão viva a ninguém.
 */
export const sessoes = sqliteTable('sessoes', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  expiraEm: integer('expira_em', { mode: 'timestamp_ms' }).notNull(),
  criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().defaultNow(),
})
