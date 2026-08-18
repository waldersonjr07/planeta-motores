import os from 'node:os'
import path from 'node:path'

/**
 * Onde o `next dev` da suíte e2e procura o carimbo do último backup. Fica fora
 * do repositório porque é estado de execução, e num módulo próprio porque quem
 * precisa dele são dois lados que não podem se importar: o
 * `playwright.config.ts` (que passa o caminho para o servidor) e o spec do
 * painel. Importar `ajuda.ts` no config arrastaria o banco junto.
 */
export const CAMINHO_ULTIMO_BACKUP = path.join(os.tmpdir(), 'pm-e2e-ultimo-backup')

/** O formato que o `scripts/backup.sh` escreve. */
export function marcador(quando: Date): string {
  return `${quando.toISOString()}  cópia externa: enviada\n`
}
