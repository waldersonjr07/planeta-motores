import path from 'node:path'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'

/**
 * A conexão nasce na primeira consulta, não na importação do módulo.
 *
 * O `next build` importa cada rota na fase de coleta de dados de página, e o
 * estágio de build da imagem não tem `.env`. Adiando a validação/abertura para
 * o primeiro uso, o build funciona sem problemas e o banco só é aberto em tempo de execução.
 */

const global = globalThis as unknown as {
  clientePlanetaMotores?: InstanceType<typeof Database>
}

function normalizarCaminhoBanco(urlOuCaminho: string): string {
  let limpo = urlOuCaminho.trim()
  if (limpo.startsWith('file://')) {
    limpo = limpo.slice(7)
  } else if (limpo.startsWith('file:') || limpo.startsWith('sqlite:')) {
    limpo = limpo.replace(/^(file:|sqlite:)\/?\/?/, '')
  }
  // Corrige caminhos do Windows que ficam com barra inicial (/C:/...)
  limpo = limpo.replace(/^\/([a-zA-Z]:)/, '$1')

  return path.isAbsolute(limpo) ? limpo : path.resolve(process.cwd(), limpo)
}

function criarConexao() {
  const url = process.env.DATABASE_URL || 'oficina.db'
  const caminhoBanco = normalizarCaminhoBanco(url)

  /*
   * Em desenvolvimento o Next reavalia este módulo a cada recompilação. Sem
   * guardar o cliente fora do módulo, cada recompilação abriria uma conexão nova.
   */
  const cliente = global.clientePlanetaMotores ?? new Database(caminhoBanco)
  cliente.pragma('journal_mode = WAL')
  cliente.pragma('synchronous = NORMAL')
  cliente.pragma('foreign_keys = ON')
  cliente.pragma('busy_timeout = 5000')

  if (process.env.NODE_ENV !== 'production') {
    global.clientePlanetaMotores = cliente
  }

  return drizzle(cliente, { schema })
}

type Conexao = ReturnType<typeof criarConexao>

let conexao: Conexao | undefined

/**
 * Fachada com a cara do `db` de sempre: `db.select()`, `db.insert()` e
 * `db.transaction()` seguem funcionando sem que nenhum chamador mude, e
 * `typeof db.transaction` continua resolvendo como tipo, que é como
 * `estoque/operacoes.ts` deriva `Transacao`.
 *
 * O método sai amarrado à instância real de propósito. O Drizzle usa `this`
 * internamente; sem o `bind`, `this` seria este proxy e cada acesso de dentro
 * da biblioteca daria a volta pelo `get` de novo.
 */
let filaTransacao = Promise.resolve()

export const db = new Proxy({} as Conexao, {
  get(_alvo, propriedade) {
    const real = (conexao ??= criarConexao())
    if (propriedade === 'transaction') {
      return async function transacao(cb: (tx: any) => Promise<any> | any) {
        const espera = filaTransacao
        let liberar: () => void
        filaTransacao = new Promise<void>((resolve) => {
          liberar = resolve
        })
        await espera

        try {
          const raw = real.$client
          const inTx = raw.inTransaction
          let sp: string | null = null
          if (inTx) {
            sp = `sp_${Date.now()}_${Math.random().toString(36).slice(2)}`
            raw.exec(`SAVEPOINT ${sp}`)
          } else {
            raw.exec('BEGIN')
          }
          try {
            const resultado = await cb(real)
            if (inTx) {
              raw.exec(`RELEASE SAVEPOINT ${sp}`)
            } else {
              raw.exec('COMMIT')
            }
            return resultado
          } catch (erro) {
            if (inTx) {
              raw.exec(`ROLLBACK TO SAVEPOINT ${sp}`)
            } else {
              raw.exec('ROLLBACK')
            }
            throw erro
          }
        } finally {
          liberar!()
        }
      }
    }
    const valor = Reflect.get(real, propriedade)
    return typeof valor === 'function' ? valor.bind(real) : valor
  },
})

export type Db = typeof db
