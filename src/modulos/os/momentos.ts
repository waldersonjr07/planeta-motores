/**
 * Rótulos puros, sem nada de servidor: este módulo é importado por componente
 * de cliente. Colocá-los em `fotos.ts` arrastaria `node:fs` e o driver do
 * Postgres para o pacote do navegador.
 */
export type MomentoFoto = 'chegada' | 'dano' | 'conclusao'

export const MOMENTOS: Record<MomentoFoto, string> = {
  chegada: 'Chegada',
  dano: 'Dano encontrado',
  conclusao: 'Conclusão',
}
