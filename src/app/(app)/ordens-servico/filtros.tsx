'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { SITUACOES } from '@/modulos/os/situacoes'

// A primeira opção é o padrão da tela, e o padrão esconde as canceladas: o
// rótulo diz isso, senão a lista parece estar mentindo sobre "todas".
const OPCOES = [
  { valor: '', texto: 'Todas, menos canceladas' },
  { valor: 'todas', texto: 'Todas, inclusive canceladas' },
  { valor: 'na_oficina', texto: 'Na oficina (em andamento)' },
  ...Object.entries(SITUACOES).map(([valor, texto]) => ({ valor, texto })),
]

const CONTROLE =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600'

export function FiltrosOs() {
  const router = useRouter()
  const parametros = useSearchParams()

  function navegar(alteracoes: Record<string, string>) {
    const busca = new URLSearchParams(parametros.toString())
    for (const [chave, valor] of Object.entries(alteracoes)) {
      if (valor) busca.set(chave, valor)
      else busca.delete(chave)
    }
    router.push(`/ordens-servico${busca.size ? `?${busca}` : ''}`)
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(evento) => {
        evento.preventDefault()
        const dados = new FormData(evento.currentTarget)
        navegar({ busca: String(dados.get('busca') ?? '') })
      }}
    >
      <input
        name="busca"
        defaultValue={parametros.get('busca') ?? ''}
        placeholder="Nº da OS, cliente ou equipamento"
        aria-label="Buscar ordem de serviço"
        className={`w-72 ${CONTROLE}`}
      />

      <select
        aria-label="Situação"
        defaultValue={parametros.get('situacao') ?? ''}
        onChange={(evento) => navegar({ situacao: evento.target.value })}
        className={CONTROLE}
      >
        {OPCOES.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.texto}
          </option>
        ))}
      </select>
    </form>
  )
}
