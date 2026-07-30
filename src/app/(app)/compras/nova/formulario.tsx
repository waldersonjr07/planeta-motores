'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoRegistrarCompra } from '@/modulos/compras/acoes'

type Opcao = { id: string; texto: string }

export function FormularioCompra({
  pecas,
  fornecedores,
  ordens,
  hoje,
}: {
  pecas: Opcao[]
  fornecedores: Opcao[]
  ordens: Opcao[]
  hoje: string
}) {
  const [resultado, enviar, pendente] = useActionState(acaoRegistrarCompra, null)
  const [linhas, setLinhas] = useState([0])

  return (
    <form action={enviar} className="flex max-w-3xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">Fornecedor</span>
          <select
            name="fornecedorId"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Não informado</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.texto}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">Data</span>
          <input
            type="date"
            name="data"
            required
            defaultValue={hoje}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">OS que motivou a compra</span>
          <select name="osId" className="rounded border border-gray-300 px-3 py-2 text-sm">
            <option value="">Nenhuma (reposição de estoque)</option>
            {ordens.map((os) => (
              <option key={os.id} value={os.id}>
                {os.texto}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">Nota / documento</span>
          <input
            name="numeroDocumento"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Itens</span>
        {linhas.map((linha) => (
          <div key={linha} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-700">Peça</span>
              <select
                name="pecaId"
                aria-label={`Peça da linha ${linha + 1}`}
                className="w-72 rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Selecione…</option>
                {pecas.map((peca) => (
                  <option key={peca.id} value={peca.id}>
                    {peca.texto}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-700">Quantidade</span>
              <input
                name="quantidade"
                defaultValue="1"
                aria-label={`Quantidade da linha ${linha + 1}`}
                className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-700">Custo unitário</span>
              <input
                name="custo"
                placeholder="0,00"
                aria-label={`Custo unitário da linha ${linha + 1}`}
                className="w-32 rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        ))}

        <Botao
          type="button"
          variante="secundario"
          className="self-start"
          onClick={() => setLinhas((atual) => [...atual, atual.length])}
        >
          Adicionar linha
        </Botao>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">Observações</span>
        <textarea
          name="observacoes"
          rows={2}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}

      <Botao type="submit" disabled={pendente} className="self-start">
        {pendente ? 'Registrando…' : 'Registrar compra'}
      </Botao>
    </form>
  )
}
