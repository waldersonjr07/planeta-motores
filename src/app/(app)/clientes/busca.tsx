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
        placeholder="Nome ou CPF/CNPJ"
        aria-label="Buscar cliente"
        className="w-72 rounded-md border border-borda-forte bg-superficie px-3 py-1.5 text-sm placeholder:text-tinta-fraca"
      />
    </form>
  )
}
