import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db } from '../src/db'
import { usuarios } from '../src/db/schema'
import { gerarHash } from '../src/modulos/auth/senha'

// Envolvido em função: o script é compilado como CommonJS, onde `await` no
// nível do módulo não é aceito.
async function principal(): Promise<void> {
  const [nome, emailBruto, senha] = process.argv.slice(2)

  if (!nome || !emailBruto || !senha) {
    console.error('Uso: npm run usuario -- "Nome" email@dominio senha')
    process.exit(1)
  }

  const email = emailBruto.trim().toLowerCase()
  const senhaHash = await gerarHash(senha)

  const [existente] = await db.select().from(usuarios).where(eq(usuarios.email, email))

  if (existente) {
    await db
      .update(usuarios)
      .set({ senhaHash, ativo: true })
      .where(eq(usuarios.id, existente.id))
    console.log(`Senha de ${email} atualizada.`)
  } else {
    await db.insert(usuarios).values({ nome, email, senhaHash })
    console.log(`Usuário ${email} criado.`)
  }

  process.exit(0)
}

void principal()
