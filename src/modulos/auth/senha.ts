import { hash, verify } from '@node-rs/argon2'

export function gerarHash(senha: string): Promise<string> {
  return hash(senha)
}

export async function verificarSenha(senha: string, valorHash: string): Promise<boolean> {
  try {
    return await verify(valorHash, senha)
  } catch {
    // Hash malformado no banco não é motivo para derrubar o login: é senha errada.
    return false
  }
}
