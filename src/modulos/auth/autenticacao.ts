import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { usuarios } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import {
  chavesDaTentativa,
  esperaRestanteMs,
  esquecerTentativas,
  mensagemDeEspera,
  registrarFalha,
} from './limitador'
import { origemDaRequisicao } from './origem'
import { verificarSenha } from './senha'
import { criarSessao } from './sessao'

const CREDENCIAL_INVALIDA = 'E-mail ou senha inválidos.'

/** Confere credenciais e abre a sessão. Devolve o token da sessão criada. */
export async function autenticar(
  email: string,
  senha: string,
): Promise<Resultado<string>> {
  const chaves = chavesDaTentativa(email, await origemDaRequisicao())

  // Bloqueado não chega a consultar o banco nem a conferir hash: a tentativa
  // não acontece, então também não conta como erro novo.
  const espera = esperaRestanteMs(chaves)
  if (espera > 0) return falha(mensagemDeEspera(espera))

  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(and(eq(usuarios.email, email.trim().toLowerCase()), eq(usuarios.ativo, true)))
    .limit(1)

  if (!usuario || !(await verificarSenha(senha, usuario.senhaHash))) {
    /*
     * Um erro só, sem distinguir e-mail que não existe de senha errada — nem
     * na mensagem, nem no contador. Contasse diferente, o freio viraria o
     * oráculo que a mensagem única existe para não ser: bastaria ver qual
     * e-mail bloqueia para saber qual está cadastrado.
     */
    registrarFalha(chaves)
    return falha(CREDENCIAL_INVALIDA)
  }

  esquecerTentativas(chaves)
  return sucesso(await criarSessao(usuario.id))
}
