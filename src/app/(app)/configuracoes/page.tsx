import { obterConfiguracoes } from '@/modulos/configuracoes/consultas'
import { FormularioConfiguracoes } from './formulario'

export default async function PaginaConfiguracoes() {
  const valores = await obterConfiguracoes()

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <FormularioConfiguracoes valores={valores} />

      <div className="border-t border-gray-200 pt-4">
        <h2 className="font-semibold">Exportar dados</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          Baixa um arquivo .zip com um CSV por tabela: clientes, equipamentos, ordens de
          serviço, itens, pagamentos, despesas, compras e movimentos de estoque. Guarde uma
          cópia fora desta máquina — oficina que perde a carteira de clientes não reabre.
        </p>
        <a
          href="/api/exportacao"
          className="mt-3 inline-block rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          Baixar exportação
        </a>
      </div>
    </section>
  )
}
