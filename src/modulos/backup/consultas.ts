import { readFile } from 'node:fs/promises'
import { type EstadoDoBackup, interpretarMarcador } from './estado'

/**
 * Onde o carimbo aparece de dentro do contêiner. No host ele é
 * `/home/planeta/backups/estado/ULTIMO-SUCESSO`, montado somente leitura pelo
 * docker-compose.prod.yml. Só o carimbo é montado, e não a pasta dos backups:
 * a aplicação web não tem por que alcançar os dumps do banco.
 */
const CAMINHO_PADRAO = '/estado/ULTIMO-SUCESSO'

/**
 * `null` significa "não é para conferir aqui", e não "está tudo bem": é o que
 * acontece em desenvolvimento, onde não existe cron nem VPS e o aviso seria
 * ruído permanente. Em produção a conferência é sempre feita, e um arquivo
 * ilegível ou ausente vira aviso — ver `interpretarMarcador`.
 */
export async function obterEstadoDoBackup(): Promise<EstadoDoBackup | null> {
  const caminho = process.env.CAMINHO_ULTIMO_BACKUP
  if (!caminho && process.env.NODE_ENV !== 'production') return null

  const conteudo = await readFile(caminho ?? CAMINHO_PADRAO, 'utf8').catch(() => null)
  return interpretarMarcador(conteudo)
}
