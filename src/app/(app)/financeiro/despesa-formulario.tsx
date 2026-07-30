'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoRegistrarDespesa } from '@/modulos/financeiro/acoes'
import { CATEGORIAS_DESPESA } from '@/modulos/financeiro/esquemas'

export function FormularioDespesa({ hoje }: { hoje: string }) {
  const [resultado, enviar, pendente] = useActionState(acaoRegistrarDespesa, null)

  return (
    <form
      action={enviar}
      className="flex flex-wrap items-end gap-3 rounded border border-gray-200 p-4"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">Data</span>
        <input
          type="date"
          name="data"
          defaultValue={hoje}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">Categoria</span>
        <select name="categoria" className="rounded border border-gray-300 px-3 py-2 text-sm">
          {Object.entries(CATEGORIAS_DESPESA).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">Descrição</span>
        <input
          name="descricao"
          required
          className="w-72 rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-gray-700">Valor</span>
        <input
          name="valor"
          required
          placeholder="0,00"
          className="w-32 rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <Botao type="submit" disabled={pendente}>
        {pendente ? 'Lançando…' : 'Lançar despesa'}
      </Botao>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}
