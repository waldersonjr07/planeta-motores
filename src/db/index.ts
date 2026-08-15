import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * A conexão nasce na primeira consulta, não na importação do módulo.
 *
 * O `next build` importa cada rota na fase de coleta de dados de página, e o
 * estágio de build da imagem não tem `.env`. Validar `DATABASE_URL` no topo do
 * módulo derrubava o build inteiro em `/api/documentos/[tipo]/[osId]` — numa
 * fase que nem chega a executar o handler, só a lê. Adiando a validação para o
 * primeiro uso, a imagem é construída sem precisar de segredo nenhum, e a falta
 * da variável continua sendo erro imediato em produção: estoura na primeira
 * requisição, não numa consulta perdida lá adiante.
 */

const global = globalThis as unknown as {
  clientePlanetaMotores?: ReturnType<typeof postgres>
}

function criarConexao() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL não definida')

  /*
   * Em desenvolvimento o Next reavalia este módulo a cada recompilação. Sem
   * guardar o cliente fora do módulo, cada recompilação abriria um pool novo e
   * deixaria o anterior aberto — em poucas horas o Postgres chega ao limite de
   * conexões e o sistema para de responder, com erro de consulta e não de
   * conexão, o que esconde a causa.
   */
  const cliente = global.clientePlanetaMotores ?? postgres(url, { max: 5 })

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
export const db = new Proxy({} as Conexao, {
  get(_alvo, propriedade) {
    const real = (conexao ??= criarConexao())
    const valor = Reflect.get(real, propriedade)
    return typeof valor === 'function' ? valor.bind(real) : valor
  },
})

export type Db = typeof db
