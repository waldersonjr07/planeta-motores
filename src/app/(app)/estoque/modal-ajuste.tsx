'use client'

import { useActionState, useEffect, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { formatarQuantidade, parsearQuantidade } from '@/lib/quantidade'
import { acaoAjustarEstoque } from '@/modulos/estoque/acoes'

type Peca = { id: string; nome: string; unidade: string; saldo: number }

export function ModalAjusteEstoque({ pecas }: { pecas: Peca[] }) {
  const [aberto, setAberto] = useState(false)
  const [resultado, enviar, pendente] = useActionState(acaoAjustarEstoque, null)
  const [pecaId, setPecaId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  // Fecha o modal após sucesso
  useEffect(() => {
    if (resultado?.ok) {
      setAberto(false)
      setPecaId('')
      setQuantidade('')
      setConfirmando(false)
    }
  }, [resultado])

  // Fecha ao pressionar Escape
  useEffect(() => {
    function aoPressionarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    if (aberto) {
      window.addEventListener('keydown', aoPressionarTecla)
      return () => window.removeEventListener('keydown', aoPressionarTecla)
    }
  }, [aberto])

  const peca = pecas.find((item) => item.id === pecaId)
  const negativo = quantidade.trim().startsWith('-')
  const numero = parsearQuantidade(negativo ? quantidade.trim().slice(1) : quantidade)
  const movimento = numero === null ? null : negativo ? -numero : numero
  const podeConfirmar = Boolean(peca) && movimento !== null && movimento !== 0

  return (
    <>
      <Botao variante="secundario" onClick={() => setAberto(true)}>
        Ajustar Saldo
      </Botao>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-ajuste"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAberto(false)
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl transition-colors dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-zinc-800">
              <div>
                <h2 id="titulo-modal-ajuste" className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                  Ajuste de Inventário
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                  O saldo é a soma dos movimentos e nunca é editado direto.
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setAberto(false)}
                className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <form action={enviar} className="mt-5 flex flex-col gap-4">
              <CampoSelecao
                rotulo="Peça para ajuste"
                nome="pecaId"
                required
                value={pecaId}
                onChange={(evento) => {
                  setPecaId(evento.target.value)
                  setConfirmando(false)
                }}
              >
                <option value="">Selecione uma peça…</option>
                {pecas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} ({item.unidade}) — saldo atual: {formatarQuantidade(item.saldo)}
                  </option>
                ))}
              </CampoSelecao>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Campo
                  rotulo="Quantidade do ajuste"
                  nome="quantidade"
                  required
                  value={quantidade}
                  onChange={(evento) => {
                    setQuantidade(evento.target.value)
                    setConfirmando(false)
                  }}
                  placeholder="Ex: 5 ou -2"
                />

                <Campo
                  rotulo="Motivo (opcional)"
                  nome="motivo"
                  placeholder="Ex: Quebra, contagem…"
                />
              </div>

              {confirmando && peca && movimento !== null ? (
                <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                    Confirmação do ajuste
                  </p>
                  <p className="text-sm text-slate-800 dark:text-zinc-200">
                    <strong>{peca.nome}</strong> passará de{' '}
                    <span className="font-mono text-slate-600 dark:text-zinc-400">{formatarQuantidade(peca.saldo)}</span> para{' '}
                    <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                      {formatarQuantidade(peca.saldo + movimento)}
                    </strong>{' '}
                    {peca.unidade} ({movimento > 0 ? '+' : ''}
                    <span className="font-mono">{formatarQuantidade(movimento)}</span>).
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Botao type="submit" disabled={pendente}>
                      {pendente ? 'Lançando…' : 'Confirmar Ajuste'}
                    </Botao>
                    <Botao
                      type="button"
                      variante="secundario"
                      onClick={() => setConfirmando(false)}
                    >
                      Voltar
                    </Botao>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-zinc-800">
                  <Botao
                    type="button"
                    variante="secundario"
                    onClick={() => setAberto(false)}
                    disabled={pendente}
                  >
                    Cancelar
                  </Botao>
                  <Botao
                    type="button"
                    disabled={!podeConfirmar}
                    onClick={() => setConfirmando(true)}
                  >
                    Avançar
                  </Botao>
                </div>
              )}

              {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
            </form>
          </div>
        </div>
      )}
    </>
  )
}
