'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, GradeFormulario } from '@/componentes/campo'
import { MensagemErro, MensagemOk } from '@/componentes/mensagem-erro'
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
    <form action={enviar} className="flex flex-col gap-4">
      <GradeFormulario>
        <CampoSelecao
          rotulo="Peça"
          nome="pecaId"
          required
          className="col-span-4"
          value={pecaId}
          onChange={(evento) => {
            setPecaId(evento.target.value)
            setConfirmando(false)
          }}
        >
          <option value="">Selecione…</option>
          {pecas.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome} ({item.unidade})
            </option>
          ))}
        </CampoSelecao>

        <Campo
          rotulo="Quantidade"
          nome="quantidade"
          required
          className="col-span-2"
          value={quantidade}
          onChange={(evento) => {
            setQuantidade(evento.target.value)
            setConfirmando(false)
          }}
          placeholder="8 ou -3"
        />

        <Campo
          rotulo="Motivo (opcional)"
          nome="motivo"
          className="col-span-4"
          placeholder="Inventário, perda, sobra…"
        />

        {!confirmando && (
          <div className="col-span-2">
            <Botao
              type="button"
              disabled={!podeConfirmar}
              onClick={() => setConfirmando(true)}
              className="w-full"
            >
              Lançar ajuste
            </Botao>
          </div>
        )}
      </GradeFormulario>

      {confirmando && peca && movimento !== null && (
        <div className="flex flex-col gap-3 rounded-lg border border-atencao-borda bg-atencao-fundo p-4">
          <p className="font-semibold text-atencao">Confirmar ajuste?</p>
          <p className="text-sm text-atencao">
            <strong>{peca.nome}</strong> passa de {formatarQuantidade(peca.saldo)} para{' '}
            <strong>{formatarQuantidade(peca.saldo + movimento)}</strong> {peca.unidade} (
            {movimento > 0 ? '+' : ''}
            {formatarQuantidade(movimento)}).
          </p>
          <p className="text-xs text-atencao">
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
      {resultado?.ok && <MensagemOk>Ajuste lançado.</MensagemOk>}
    </form>
  )
}
