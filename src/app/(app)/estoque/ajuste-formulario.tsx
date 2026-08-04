'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { formatarQuantidade, parsearQuantidade } from '@/lib/quantidade'
import { acaoAjustarEstoque } from '@/modulos/estoque/acoes'

type Peca = { id: string; nome: string; unidade: string; saldo: number }

export function FormularioAjuste({ pecas }: { pecas: Peca[] }) {
  const [resultado, enviar, pendente] = useActionState(acaoAjustarEstoque, null)
  const [pecaId, setPecaId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  const peca = pecas.find((item) => item.id === pecaId)
  const negativo = quantidade.trim().startsWith('-')
  const numero = parsearQuantidade(negativo ? quantidade.trim().slice(1) : quantidade)
  const movimento = numero === null ? null : negativo ? -numero : numero
  const podeConfirmar = Boolean(peca) && movimento !== null && movimento !== 0

  return (
    <form action={enviar} className="flex flex-col gap-3 rounded border border-gray-200 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">Peça</span>
          <select
            name="pecaId"
            required
            value={pecaId}
            onChange={(evento) => {
              setPecaId(evento.target.value)
              setConfirmando(false)
            }}
            className="w-64 rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione…</option>
            {pecas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome} ({item.unidade})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">Quantidade</span>
          <input
            name="quantidade"
            required
            value={quantidade}
            onChange={(evento) => {
              setQuantidade(evento.target.value)
              setConfirmando(false)
            }}
            placeholder="8 ou -3"
            aria-label="Quantidade do ajuste"
            className="w-28 rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">Motivo (opcional)</span>
          <input
            name="motivo"
            placeholder="Inventário, perda, sobra…"
            className="w-72 rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        {!confirmando && (
          <Botao
            type="button"
            disabled={!podeConfirmar}
            onClick={() => setConfirmando(true)}
          >
            Lançar ajuste
          </Botao>
        )}
      </div>

      {confirmando && peca && movimento !== null && (
        <div className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">Confirmar ajuste?</p>
          <p className="text-sm text-amber-900">
            <strong>{peca.nome}</strong> passa de {formatarQuantidade(peca.saldo)} para{' '}
            <strong>{formatarQuantidade(peca.saldo + movimento)}</strong> {peca.unidade} (
            {movimento > 0 ? '+' : ''}
            {formatarQuantidade(movimento)}).
          </p>
          <p className="text-xs text-amber-900">
            O lançamento não é apagado depois: uma correção entra como novo ajuste.
          </p>
          <div className="flex gap-2">
            <Botao type="submit" disabled={pendente}>
              {pendente ? 'Lançando…' : 'Confirmar'}
            </Botao>
            <Botao
              type="button"
              variante="secundario"
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </Botao>
          </div>
        </div>
      )}

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
      {resultado?.ok && <p className="text-sm text-green-700">Ajuste lançado.</p>}
    </form>
  )
}
