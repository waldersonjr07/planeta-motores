import { beforeEach, expect, test } from 'vitest'
import {
  LIMITE_POR_CONTA,
  LIMITE_POR_ORIGEM,
  chavesDaTentativa,
  esperaRestanteMs,
  esquecerTentativas,
  mensagemDeEspera,
  registrarFalha,
  reiniciarLimitador,
} from '../../src/modulos/auth/limitador'

const MINUTO = 60_000
const AGORA = new Date('2026-08-14T10:00:00Z').getTime()

const daLucilene = chavesDaTentativa('lucilene@planetamotores.com.br', '200.0.0.1')

beforeEach(reiniciarLimitador)

function errar(vezes: number, alvos = daLucilene, agora = AGORA) {
  for (let i = 0; i < vezes; i++) registrarFalha(alvos, agora)
}

test('deixa tentar enquanto está abaixo do limite', () => {
  errar(LIMITE_POR_CONTA - 1)

  expect(esperaRestanteMs(daLucilene, AGORA)).toBe(0)
})

test('bloqueia ao chegar no limite', () => {
  errar(LIMITE_POR_CONTA)

  expect(esperaRestanteMs(daLucilene, AGORA)).toBe(MINUTO)
})

test('libera quando a espera passa', () => {
  errar(LIMITE_POR_CONTA)

  expect(esperaRestanteMs(daLucilene, AGORA + MINUTO - 1)).toBe(1)
  expect(esperaRestanteMs(daLucilene, AGORA + MINUTO)).toBe(0)
})

test('quem insiste depois de liberado espera cada vez mais', () => {
  errar(LIMITE_POR_CONTA)

  // Sexto erro, já liberado da primeira espera: agora são cinco minutos.
  const depois = AGORA + MINUTO
  registrarFalha(daLucilene, depois)
  expect(esperaRestanteMs(daLucilene, depois)).toBe(5 * MINUTO)

  // Sétimo: quinze. E o teto é uma hora, por mais que insista.
  const maisTarde = depois + 5 * MINUTO
  registrarFalha(daLucilene, maisTarde)
  expect(esperaRestanteMs(daLucilene, maisTarde)).toBe(15 * MINUTO)

  let quando = maisTarde + 15 * MINUTO
  for (let i = 0; i < 5; i++) {
    registrarFalha(daLucilene, quando)
    quando += 60 * MINUTO
  }
  expect(esperaRestanteMs(daLucilene, quando - 60 * MINUTO)).toBe(60 * MINUTO)
})

test('sucesso zera o contador', () => {
  errar(LIMITE_POR_CONTA - 1)
  esquecerTentativas(daLucilene)

  // Recomeça do zero: erra de novo até um a menos que o limite e ainda passa.
  errar(LIMITE_POR_CONTA - 1)
  expect(esperaRestanteMs(daLucilene, AGORA)).toBe(0)
})

test('bloqueio de uma origem não trava a mesma conta vinda de outro lugar', () => {
  const doAtacante = chavesDaTentativa('lucilene@planetamotores.com.br', '203.0.113.7')
  errar(LIMITE_POR_ORIGEM, doAtacante)

  expect(esperaRestanteMs(doAtacante, AGORA)).toBeGreaterThan(0)
  // A dona, do endereço dela, continua entrando. É esta a razão de o endereço
  // fazer parte das duas chaves.
  expect(esperaRestanteMs(daLucilene, AGORA)).toBe(0)
})

test('varrer e-mails diferentes do mesmo lugar esbarra no limite da origem', () => {
  for (let i = 0; i < LIMITE_POR_ORIGEM; i++) {
    registrarFalha(chavesDaTentativa(`chute${i}@exemplo.com`, '203.0.113.7'), AGORA)
  }

  const proximo = chavesDaTentativa('outro@exemplo.com', '203.0.113.7')
  expect(esperaRestanteMs(proximo, AGORA)).toBeGreaterThan(0)
})

test('a mensagem diz quanto falta e não fala da conta', () => {
  expect(mensagemDeEspera(MINUTO)).toBe('Muitas tentativas seguidas. Tente de novo em 1 minuto.')
  expect(mensagemDeEspera(5 * MINUTO)).toBe(
    'Muitas tentativas seguidas. Tente de novo em 5 minutos.',
  )
  // Arredonda para cima: nunca convida a tentar antes da hora.
  expect(mensagemDeEspera(61_000)).toContain('2 minutos')
})
