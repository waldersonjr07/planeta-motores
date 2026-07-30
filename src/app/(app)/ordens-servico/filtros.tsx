'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { SITUACOES } from '@/modulos/os/situacoes'

const GRUPOS = [
  { valor: '', texto: 'Todas as situações' },
  { valor: 'na_oficina', texto: 'Na oficina (em andamento)' },
  ...Object.entries(SITUACOES).map(([valor, texto]) => ({ valor, texto })),
]

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
      className="flex flex-wrap items-center gap-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        const dados = new FormData(evento.currentTarget)
        navegar({ busca: String(dados.get('busca') ?? '') })
      }}
    >
      <input
        name="busca"
        defaultValue={parametros.get('busca') ?? ''}
        placeholder="Buscar por nº da OS, cliente ou equipamento"
        aria-label="Buscar ordem de serviço"
        className="w-96 rounded border border-gray-300 px-3 py-2 text-sm"
      />

      <select
        aria-label="Situação"
        defaultValue={parametros.get('situacao') ?? ''}
        onChange={(evento) => navegar({ situacao: evento.target.value })}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      >
        {GRUPOS.map((grupo) => (
          <option key={grupo.valor} value={grupo.valor}>
            {grupo.texto}
          </option>
        ))}
      </select>
    </form>
  )
}
