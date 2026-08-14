import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

/**
 * Guarda de manutenção: toda Server Action tem de conferir a sessão na
 * primeira linha.
 *
 * Isto é um teste de código-fonte, não de comportamento, e é de propósito. O
 * `exigirUsuario()` dentro da ação é a única camada que confere o cookie
 * contra o banco — o middleware só sabe se existe cookie. Uma ação nova que
 * esqueça a linha nasce aberta para a internet inteira, e nenhum teste de
 * comportamento a pegaria, porque ninguém escreve teste para a ação que
 * esqueceu de escrever. Este pega: ele descobre os arquivos sozinho.
 */

const MODULOS = path.resolve(import.meta.dirname, '../../src/modulos')

/** Login e logout: são a porta de entrada, precisam rodar sem sessão. */
const DISPENSADOS = new Set(['auth'])

/** `await exigirUsuario()`, com ou sem guardar o usuário para a autoria. */
const GUARDA = /^(?:const \w+ = )?await exigirUsuario\(\)$/

function arquivosDeAcoes(): { modulo: string; caminho: string }[] {
  return readdirSync(MODULOS, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory() && !DISPENSADOS.has(entrada.name))
    .map((entrada) => ({
      modulo: entrada.name,
      caminho: path.join(MODULOS, entrada.name, 'acoes.ts'),
    }))
    .filter((alvo) => existsSync(alvo.caminho))
}

/** Nome da ação → primeira linha executável do corpo dela. */
function primeiraLinhaDeCadaAcao(fonte: string): { nome: string; primeira: string }[] {
  const linhas = fonte.split(/\r?\n/)
  const achados: { nome: string; primeira: string }[] = []

  for (let i = 0; i < linhas.length; i++) {
    const abertura = /^export async function (\w+)\(/.exec(linhas[i])
    if (!abertura) continue

    // A assinatura pode ocupar várias linhas; termina na que fecha com "{".
    let j = i
    while (j < linhas.length && !linhas[j].trimEnd().endsWith('{')) j++

    // Primeira linha do corpo que não seja branco nem comentário.
    let k = j + 1
    while (k < linhas.length) {
      const conteudo = linhas[k].trim()
      const comentario =
        conteudo === '' ||
        conteudo.startsWith('//') ||
        conteudo.startsWith('/*') ||
        conteudo.startsWith('*')
      if (!comentario) break
      k++
    }

    achados.push({ nome: abertura[1], primeira: (linhas[k] ?? '').trim() })
  }

  return achados
}

const alvos = arquivosDeAcoes()

test('acha os arquivos de ação — se esta lista secar, o resto não prova nada', () => {
  expect(alvos.map((a) => a.modulo).sort()).toEqual([
    'catalogo',
    'clientes',
    'compras',
    'configuracoes',
    'estoque',
    'financeiro',
    'os',
  ])
})

describe.each(alvos)('$modulo/acoes.ts', ({ caminho }) => {
  const fonte = readFileSync(caminho, 'utf8')
  const acoes = primeiraLinhaDeCadaAcao(fonte)

  test('importa a guarda', () => {
    expect(fonte).toContain("import { exigirUsuario } from '@/modulos/auth/guarda'")
  })

  test('tem pelo menos uma ação', () => {
    expect(acoes.length).toBeGreaterThan(0)
  })

  test.each(acoes)('$nome confere a sessão na primeira linha', ({ primeira }) => {
    expect(primeira).toMatch(GUARDA)
  })

  /*
   * Só `export async function` é vasculhado acima. Um `export const acao = ...`
   * passaria despercebido pela varredura e nasceria sem guarda — então ele é
   * proibido aqui, e o teste diz por quê em vez de ficar quieto.
   */
  test('não exporta ação por outro formato, que a varredura não veria', () => {
    const outros = fonte
      .split(/\r?\n/)
      .filter((linha) => /^export /.test(linha))
      .filter((linha) => !/^export (async function|type|interface) /.test(linha))
    expect(outros).toEqual([])
  })
})

test('todas as 26 ações da aplicação estão cobertas', () => {
  const total = alvos.reduce(
    (soma, alvo) => soma + primeiraLinhaDeCadaAcao(readFileSync(alvo.caminho, 'utf8')).length,
    0,
  )
  // Número escrito à mão: ação nova faz este teste falhar e obriga quem a
  // escreveu a olhar para a linha da guarda antes de subir o número.
  expect(total).toBe(26)
})
