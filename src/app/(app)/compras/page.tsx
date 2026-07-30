import Link from 'next/link'
import { formatarReais } from '@/lib/dinheiro'
import { listarCompras } from '@/modulos/compras/consultas'

export default async function PaginaCompras() {
  const lista = await listarCompras()

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Compras</h1>
        <Link
          href="/compras/nova"
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white"
        >
          Nova compra
        </Link>
      </header>

      {lista.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhuma compra registrada ainda.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-600">
            <tr>
              <th className="py-2">Data</th>
              <th className="py-2">Fornecedor</th>
              <th className="py-2">OS</th>
              <th className="py-2">Documento</th>
              <th className="py-2 text-right">Itens</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((compra) => (
              <tr key={compra.id} className="border-b border-gray-100">
                <td className="py-2">{compra.data.split('-').reverse().join('/')}</td>
                <td className="py-2">{compra.fornecedorNome ?? '—'}</td>
                <td className="py-2">{compra.osNumero ?? '—'}</td>
                <td className="py-2">{compra.numeroDocumento ?? '—'}</td>
                <td className="py-2 text-right">{compra.quantidadeItens}</td>
                <td className="py-2 text-right">{formatarReais(compra.totalCentavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
