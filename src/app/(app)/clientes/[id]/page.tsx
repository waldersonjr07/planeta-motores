import { notFound } from 'next/navigation'
import { Botao, LinkBotao } from '@/componentes/botao'
import { Etiqueta } from '@/componentes/etiqueta'
import { Secao, Vazio } from '@/componentes/pagina'
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

  const endereco =
    [cliente.logradouro, cliente.numero, cliente.bairro, cliente.cidade, cliente.uf]
      .filter(Boolean)
      .join(', ') || 'Endereço não informado'

  return (
    <>
      <div className="flex justify-end">
        <Voltar href="/clientes" texto="Voltar para clientes" />
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{cliente.nome}</h1>
            {!cliente.ativo && <Etiqueta tom="encerrado">inativo</Etiqueta>}
          </div>
          <p className="mt-1.5 text-sm text-tinta-suave">
            {cliente.telefone ?? 'sem telefone'} · cadastrado em{' '}
            {formatarData(cliente.criadoEm)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <LinkBotao href={`/clientes/${id}/editar`}>Editar</LinkBotao>
          <form action={acaoDefinirAtivoCliente}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="ativo" value={cliente.ativo ? 'false' : 'true'} />
            <Botao variante="secundario" type="submit">
              {cliente.ativo ? 'Inativar' : 'Reativar'}
            </Botao>
          </form>
        </div>
      </header>

      <Secao titulo="Dados do cliente">
        <p className="text-sm">{endereco}</p>
        {cliente.documento && (
          <p className="mt-1 text-sm text-tinta-suave">CPF/CNPJ {cliente.documento}</p>
        )}
        {cliente.email && (
          <p className="mt-1 text-sm text-tinta-suave">{cliente.email}</p>
        )}
        {cliente.observacoes && (
          <p className="mt-3 whitespace-pre-line text-sm">{cliente.observacoes}</p>
        )}
      </Secao>

      <Secao
        titulo="Equipamentos"
        descricao="Cada motor guarda o próprio histórico — é assim que a reincidência aparece."
      >
        <div className="flex flex-col gap-5">
          {equipamentos.length === 0 ? (
            <Vazio>Nenhum equipamento cadastrado.</Vazio>
          ) : (
            <ul className="flex flex-col gap-2">
              {equipamentos.map((equipamento) => (
                <li
                  key={equipamento.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-borda px-4 py-2.5 text-sm"
                >
                  <span>
                    {equipamento.descricao}
                    {equipamento.numeroSerie && (
                      <span className="text-tinta-suave">
                        {' '}
                        · série {equipamento.numeroSerie}
                      </span>
                    )}
                  </span>
                  <form action={acaoDefinirAtivoEquipamento}>
                    <input type="hidden" name="id" value={equipamento.id} />
                    <input type="hidden" name="clienteId" value={id} />
                    <input type="hidden" name="ativo" value="false" />
                    <Botao variante="discreto" type="submit">
                      Remover
                    </Botao>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-borda pt-5">
            <FormularioEquipamento clienteId={id} />
          </div>
        </div>
      </Secao>
    </>
  )
}
