import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Botao } from '@/componentes/botao'
import { Voltar } from '@/componentes/voltar'
import { formatarData } from '@/lib/datas'
import {
  acaoDefinirAtivoCliente,
  acaoDefinirAtivoEquipamento,
} from '@/modulos/clientes/acoes'
import { obterCliente } from '@/modulos/clientes/consultas'
import { listarEquipamentosDoCliente } from '@/modulos/clientes/equipamentos-consultas'
import { FormularioEquipamento } from './equipamento-formulario'

export default async function FichaCliente({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cliente = await obterCliente(id)
  if (!cliente) notFound()

  const equipamentos = await listarEquipamentosDoCliente(id)

  return (
    <section className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Voltar href="/clientes" texto="Voltar para clientes" />
      </div>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{cliente.nome}</h1>
          <p className="text-sm text-gray-600">
            {cliente.telefone ?? 'sem telefone'} · cadastrado em{' '}
            {formatarData(cliente.criadoEm)}
            {!cliente.ativo && ' · inativo'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/clientes/${id}/editar`}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            Editar
          </Link>
          <form action={acaoDefinirAtivoCliente}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="ativo" value={cliente.ativo ? 'false' : 'true'} />
            <Botao variante="secundario" type="submit">
              {cliente.ativo ? 'Inativar' : 'Reativar'}
            </Botao>
          </form>
        </div>
      </header>

      <div className="text-sm text-gray-700">
        <p>
          {[cliente.logradouro, cliente.numero, cliente.bairro, cliente.cidade, cliente.uf]
            .filter(Boolean)
            .join(', ') || 'Endereço não informado'}
        </p>
        {cliente.observacoes && (
          <p className="mt-2 whitespace-pre-line">{cliente.observacoes}</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">Equipamentos</h2>

        {equipamentos.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhum equipamento cadastrado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {equipamentos.map((equipamento) => (
              <li
                key={equipamento.id}
                className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm"
              >
                <span>
                  {equipamento.descricao}
                  {equipamento.numeroSerie && (
                    <span className="text-gray-600"> · série {equipamento.numeroSerie}</span>
                  )}
                </span>
                <form action={acaoDefinirAtivoEquipamento}>
                  <input type="hidden" name="id" value={equipamento.id} />
                  <input type="hidden" name="clienteId" value={id} />
                  <input type="hidden" name="ativo" value="false" />
                  <Botao variante="secundario" type="submit">
                    Remover
                  </Botao>
                </form>
              </li>
            ))}
          </ul>
        )}

        <FormularioEquipamento clienteId={id} />
      </div>
    </section>
  )
}
