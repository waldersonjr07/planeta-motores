'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function CampoBusca() {
  const router = useRouter()
  const parametros = useSearchParams()

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault()
        const termo = new FormData(evento.currentTarget).get('busca')
        router.push(
          termo ? `/clientes?busca=${encodeURIComponent(String(termo))}` : '/clientes',
        )
      }}
    >
      <input
        name="busca"
        defaultValue={parametros.get('busca') ?? ''}
        placeholder="Buscar por nome ou CPF/CNPJ"
        aria-label="Buscar cliente"
        className="w-80 rounded border border-gray-300 px-3 py-2 text-sm"
      />
    </form>
  )
}
