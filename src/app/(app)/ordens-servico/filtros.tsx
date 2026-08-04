'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { SITUACOES } from '@/modulos/os/situacoes'

const OPCOES = [
  { valor: '', texto: 'Todas as situações' },
  { valor: 'na_oficina', texto: 'Na oficina (em andamento)' },
  ...Object.entries(SITUACOES).map(([valor, texto]) => ({ valor, texto })),
]

const CONTROLE =
  'rounded-md border border-borda-forte bg-superficie px-3 py-1.5 text-sm placeholder:text-tinta-fraca'

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
