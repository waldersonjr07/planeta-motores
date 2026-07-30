'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoAjustarEstoque } from '@/modulos/estoque/acoes'

export function FormularioAjuste({
  pecas,
}: {
  pecas: { id: string; nome: string; unidade: string }[]
}) {
  const [resultado, enviar, pendente] = useActionState(acaoAjustarEstoque, null)

  return (
    <form
      action={enviar}
      className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">Peça</span>
        <select
          name="pecaId"
          required
          className="w-64 rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Selecione…</option>
          {pecas.map((peca) => (
            <option key={peca.id} value={peca.id}>
              {peca.nome} ({peca.unidade})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">Quantidade</span>
        <input
          name="quantidade"
          required
          placeholder="8 ou -3"
          aria-label="Quantidade do ajuste"
          className="w-28 rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">Motivo</span>
        <input
          name="motivo"
          required
          placeholder="Inventário, perda, sobra…"
          className="w-72 rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <Botao type="submit" disabled={pendente}>
        {pendente ? 'Lançando…' : 'Lançar ajuste'}
      </Botao>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
      {resultado?.ok && <p className="text-sm text-green-700">Ajuste lançado.</p>}
    </form>
  )
}
