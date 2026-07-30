import Link from 'next/link'
import { listarClientes } from '@/modulos/clientes/consultas'
import { CampoBusca } from './busca'

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>
}) {
  const { busca } = await searchParams
  const lista = await listarClientes({ busca })

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Link
          href="/clientes/novo"
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
        >
          Novo cliente
        </Link>
      </header>

      <CampoBusca />

      {lista.length === 0 ? (
        <p className="text-sm text-gray-600">
          {busca
            ? 'Nenhum cliente encontrado para essa busca.'
            : 'Nenhum cliente cadastrado ainda.'}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-600">
            <tr>
              <th className="py-2">Nome</th>
              <th className="py-2">Telefone</th>
              <th className="py-2">Cidade</th>
              <th className="py-2">Equipamentos</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((cliente) => (
              <tr key={cliente.id} className="border-b border-gray-100">
                <td className="py-2">
                  <Link
                    href={`/clientes/${cliente.id}`}
                    className="text-blue-700 hover:underline"
                  >
                    {cliente.nome}
                  </Link>
                </td>
                <td className="py-2">{cliente.telefone ?? '—'}</td>
                <td className="py-2">{cliente.cidade ?? '—'}</td>
                <td className="py-2">{cliente.quantidadeEquipamentos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
