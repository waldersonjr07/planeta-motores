'use client'

import { useActionState, useEffect, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoSalvarPeca } from '@/modulos/catalogo/acoes'

export function ModalNovaPeca() {
  const [aberto, setAberto] = useState(false)
  const [resultado, enviar, pendente] = useActionState(acaoSalvarPeca, null)

  // Fecha o modal após salvar a peça com sucesso
  useEffect(() => {
    if (resultado?.ok) {
      setAberto(false)
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

  const campos = resultado && !resultado.ok ? (resultado.campos ?? {}) : {}

  return (
    <>
      <Botao variante="primario" onClick={() => setAberto(true)}>
        + Nova Peça
      </Botao>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-peca"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAberto(false)
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl transition-colors dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-zinc-800">
              <div>
                <h2 id="titulo-modal-peca" className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                  Cadastrar Nova Peça
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                  A peça fica disponível para orçamentos de OS e compras de estoque.
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Campo
                  rotulo="Nome da peça"
                  nome="nome"
                  required
                  placeholder="Ex: Óleo 2T, Vela ignição…"
                  erro={campos.nome}
                  className="sm:col-span-2"
                />

                <Campo rotulo="Marca" nome="marca" placeholder="Ex: Stihl, Castrol…" />

                <CampoSelecao
                  rotulo="Unidade"
                  nome="unidade"
                  opcoes={[
                    { valor: 'un', texto: 'Unidade (un)' },
                    { valor: 'L', texto: 'Litro (L)' },
                    { valor: 'mL', texto: 'Mililitro (mL)' },
                  ]}
                />

                <Campo
                  rotulo="Quantidade mínima"
                  nome="quantidadeMinima"
                  placeholder="0"
                  erro={campos.quantidadeMinima}
                />

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      name="controlaSaldo"
                      className="size-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
                    />
                    Controla saldo em estoque
                  </label>
                </div>
              </div>

              {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}

              <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-zinc-800">
                <Botao
                  type="button"
                  variante="secundario"
                  onClick={() => setAberto(false)}
                  disabled={pendente}
                >
                  Cancelar
                </Botao>
                <Botao type="submit" disabled={pendente}>
                  {pendente ? 'Cadastrando…' : 'Cadastrar Peça'}
                </Botao>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
