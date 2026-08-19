import { expect, test } from 'vitest'
import {
  HORAS_ATE_AVISAR,
  interpretarMarcador,
  precisaAvisar,
} from '../../src/modulos/backup/estado'

// O arquivo é escrito por scripts/backup.sh, uma linha só:
//   2026-08-17T03:00:12-04:00  cópia externa: enviada
const MARCADOR = (carimbo: string) => `${carimbo}  cópia externa: enviada\n`

const AGORA = new Date('2026-08-17T12:00:00-04:00')

test('backup da madrugada de hoje está em dia', () => {
  const estado = interpretarMarcador(MARCADOR('2026-08-17T03:00:12-04:00'), AGORA)
  expect(estado.situacao).toBe('em-dia')
  expect(precisaAvisar(estado)).toBe(false)
})

test('backup de ontem de madrugada ainda está em dia', () => {
  // 33 h: uma noite falhada ainda não passou do limite, duas passam.
  const estado = interpretarMarcador(MARCADOR('2026-08-16T03:00:12-04:00'), AGORA)
  expect(estado.situacao).toBe('em-dia')
})

test('backup parado há mais de 36 h vira aviso', () => {
  const estado = interpretarMarcador(MARCADOR('2026-08-15T03:00:12-04:00'), AGORA)
  expect(estado).toEqual({
    situacao: 'atrasado',
    feitoEm: new Date('2026-08-15T03:00:12-04:00'),
  })
  expect(precisaAvisar(estado)).toBe(true)
})

test('o limite é fechado em 36 h', () => {
  const limite = new Date(AGORA.getTime() - HORAS_ATE_AVISAR * 3_600_000)
  expect(interpretarMarcador(MARCADOR(limite.toISOString()), AGORA).situacao).toBe('em-dia')

  const passou = new Date(limite.getTime() - 60_000)
  expect(interpretarMarcador(MARCADOR(passou.toISOString()), AGORA).situacao).toBe('atrasado')
})

// Os casos abaixo são o motivo de o aviso existir: se a checagem em si quebrar
// sem ninguém notar, a tela ficaria calma exatamente como quando está tudo bem.
// Sem notícia é aviso, não silêncio.
test('arquivo ausente vira aviso', () => {
  const estado = interpretarMarcador(null, AGORA)
  expect(estado).toEqual({ situacao: 'sem-noticia' })
  expect(precisaAvisar(estado)).toBe(true)
})

test.each([
  ['vazio', ''],
  ['só espaço', '   \n'],
  ['texto qualquer', 'não sei o que aconteceu aqui\n'],
  ['data sem hora', '2026-08-17  cópia externa: enviada\n'],
  ['data sem fuso', '2026-08-17T03:00:12  cópia externa: enviada\n'],
  ['data impossível', '2026-13-45T99:00:12-04:00\n'],
])('conteúdo ilegível (%s) vira aviso', (_nome, conteudo) => {
  expect(interpretarMarcador(conteudo, AGORA).situacao).toBe('sem-noticia')
})

test('aceita o fuso escrito como Z', () => {
  expect(interpretarMarcador(MARCADOR('2026-08-17T06:00:12Z'), AGORA).situacao).toBe('em-dia')
})

test('relógio adiantado não vira aviso', () => {
  // Data no futuro é desencontro de relógio entre a VPS e quem lê, não backup
  // atrasado — e o backup mais recente que o esperado nunca é a má notícia.
  expect(interpretarMarcador(MARCADOR('2026-08-17T14:00:00-04:00'), AGORA).situacao).toBe(
    'em-dia',
  )
})

test('o estado da cópia externa não muda o aviso da tela', () => {
  // A Lucilene não tem o que fazer com "o B2 ainda não está configurado", e ver
  // isso todo dia ensinaria a ignorar a linha que um dia vai importar. O estado
  // da cópia externa fica no log e no próprio arquivo, para quem administra.
  const pulada = '2026-08-17T03:00:12-04:00  cópia externa: PULADA (rclone não instalado)\n'
  expect(interpretarMarcador(pulada, AGORA).situacao).toBe('em-dia')
})
