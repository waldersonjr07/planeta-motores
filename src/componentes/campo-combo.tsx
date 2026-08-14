'use client'

import { useId, useState } from 'react'
import { normalizarTexto } from '@/lib/texto'

/**
 * `texto` é o que aparece na lista; `chave` é o que conta para dizer "isto que
 * eu digitei já existe". Os dois se separam porque a tela enfeita o texto para
 * quem lê — "Óleo 2 tempos Ipiranga (L)" — e ninguém digita o enfeite. Sem
 * `chave`, digitar o nome real não casaria com nada e proporia cadastrar uma
 * segunda peça com o mesmo nome.
 */
export type OpcaoCombo = { id: string; texto: string; chave?: string }

/** A opção cujo texto exibido ou chave é exatamente o que se digitou. */
function casarExata(opcoes: OpcaoCombo[], alvo: string): OpcaoCombo | undefined {
  if (!alvo) return undefined
  return opcoes.find(
    (opcao) =>
      normalizarTexto(opcao.chave ?? opcao.texto) === alvo ||
      normalizarTexto(opcao.texto) === alvo,
  )
}

const CONTROLE =
  'w-full rounded-md border border-borda-forte bg-superficie px-3 py-2 text-sm placeholder:text-tinta-fraca'

export function CampoCombo({
  rotulo,
  nome,
  opcoes,
  permiteCriar = false,
  rotuloCriar = (texto) => `Cadastrar “${texto}”`,
  placeholder,
  erro,
  className = '',
  'aria-label': rotuloAcessivel,
  aoMudar,
  idInicial,
  textoInicial,
}: {
  rotulo: string
  nome: string
  opcoes: OpcaoCombo[]
  permiteCriar?: boolean
  rotuloCriar?: (texto: string) => string
  placeholder?: string
  erro?: string
  className?: string
  'aria-label'?: string
  aoMudar?: (estado: { id: string | null; nome: string | null }) => void
  /**
   * Estado de partida, lido só na montagem — é assim que o combo volta
   * preenchido quando a tela se remonta pelo eco de uma validação reprovada.
   * Trocá-los sem remontar não mexe num combo já em uso, de propósito: seria
   * apagar o que a Lucilene está digitando.
   */
  idInicial?: string
  textoInicial?: string
}) {
  const [texto, setTexto] = useState(textoInicial ?? '')
  const [escolhido, setEscolhido] = useState<string | null>(idInicial || null)
  const [aberto, setAberto] = useState(false)
  const [indice, setIndice] = useState(0)
  const idBase = useId()

  const alvo = normalizarTexto(texto)
  const filtradas = alvo
    ? opcoes.filter((opcao) => normalizarTexto(opcao.texto).includes(alvo))
    : opcoes

  // Digitar exatamente o nome de algo que existe casa com ele, em vez de
  // propor criar uma segunda peça com o mesmo nome. Compara pela chave: o
  // texto exibido pode trazer marca e unidade que ninguém digita.
  const exata = casarExata(opcoes, alvo)
  const id = escolhido ?? exata?.id ?? null
  const podeCriar = permiteCriar && alvo.length > 0 && !exata
  const nomeNovo = id ? '' : podeCriar ? texto.trim() : ''

  const linhas = podeCriar ? filtradas.length + 1 : filtradas.length

  function avisar(novoId: string | null, novoNome: string | null) {
    aoMudar?.({ id: novoId, nome: novoNome })
  }

  function selecionar(posicao: number) {
    if (podeCriar && posicao === filtradas.length) {
      setEscolhido(null)
      setAberto(false)
      avisar(null, texto.trim())
      return
    }
    const opcao = filtradas[posicao]
    if (!opcao) return
    setTexto(opcao.texto)
    setEscolhido(opcao.id)
    setAberto(false)
    avisar(opcao.id, null)
  }

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={`${idBase}-entrada`}
        className="text-xs font-medium uppercase tracking-wide text-tinta-suave"
      >
        {rotulo}
      </label>

      <div className="relative">
        <input
          id={`${idBase}-entrada`}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={`${idBase}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={
            aberto && linhas > 0 ? `${idBase}-opcao-${indice}` : undefined
          }
          aria-label={rotuloAcessivel}
          autoComplete="off"
          className={CONTROLE}
          placeholder={placeholder}
          value={texto}
          onChange={(evento) => {
            const digitado = evento.target.value
            setTexto(digitado)
            setEscolhido(null)
            setAberto(true)
            setIndice(0)
            // Avisa a mesma resolução que a renderização faz: quem digita o
            // nome inteiro de algo que existe escolheu aquilo, e a tela não
            // deve tratar a linha como cadastro novo.
            const casada = casarExata(opcoes, normalizarTexto(digitado))
            avisar(casada?.id ?? null, casada ? null : digitado.trim() || null)
          }}
          onFocus={() => setAberto(true)}
          // `onBlur` atrasado: o clique numa opção só chega depois do blur, e
          // fechar antes cancelaria a escolha.
          onBlur={() => window.setTimeout(() => setAberto(false), 120)}
          onKeyDown={(evento) => {
            if (evento.key === 'ArrowDown') {
              evento.preventDefault()
              setAberto(true)
              setIndice((n) => (linhas === 0 ? 0 : (n + 1) % linhas))
            } else if (evento.key === 'ArrowUp') {
              evento.preventDefault()
              setIndice((n) => (linhas === 0 ? 0 : (n - 1 + linhas) % linhas))
            } else if (evento.key === 'Enter' && aberto) {
              evento.preventDefault()
              selecionar(indice)
            } else if (evento.key === 'Escape') {
              setAberto(false)
            }
          }}
        />

        {aberto && linhas > 0 && (
          <ul
            id={`${idBase}-lista`}
            role="listbox"
            className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-borda-forte bg-superficie py-1 text-sm shadow-lg"
          >
            {filtradas.map((opcao, posicao) => (
              <li
                key={opcao.id}
                id={`${idBase}-opcao-${posicao}`}
                role="option"
                aria-selected={posicao === indice}
                className={`cursor-pointer px-3 py-1.5 ${
                  posicao === indice ? 'bg-acao-fundo' : ''
                }`}
                onMouseDown={() => selecionar(posicao)}
                onMouseEnter={() => setIndice(posicao)}
              >
                {opcao.texto}
              </li>
            ))}

            {podeCriar && (
              <li
                id={`${idBase}-opcao-${filtradas.length}`}
                role="option"
                aria-selected={indice === filtradas.length}
                className={`cursor-pointer border-t border-borda px-3 py-1.5 font-medium text-acao ${
                  indice === filtradas.length ? 'bg-acao-fundo' : ''
                }`}
                onMouseDown={() => selecionar(filtradas.length)}
                onMouseEnter={() => setIndice(filtradas.length)}
              >
                {rotuloCriar(texto.trim())}
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Sempre os dois, mesmo vazios: a tela de compras repete linhas e a
          ação casa as listas por posição. */}
      <input type="hidden" name={`${nome}Id`} value={id ?? ''} />
      <input type="hidden" name={`${nome}Nome`} value={nomeNovo} />

      {erro && <span className="text-xs text-alerta">{erro}</span>}
    </div>
  )
}
