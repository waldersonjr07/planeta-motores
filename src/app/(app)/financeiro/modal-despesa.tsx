'use client'

import { useActionState, useEffect, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao } from '@/componentes/campo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoRegistrarDespesa } from '@/modulos/financeiro/acoes'
import { CATEGORIAS_DESPESA } from '@/modulos/financeiro/esquemas'

export function ModalNovaDespesa({ hoje }: { hoje: string }) {
  const [aberto, setAberto] = useState(false)
  const [resultado, enviar, pendente] = useActionState(acaoRegistrarDespesa, null)

  // Fecha o modal após sucesso no lançamento
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

  return (
    <>
      <Botao variante="primario" onClick={() => setAberto(true)}>
        + Nova Despesa
      </Botao>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-despesa"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAberto(false)
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl transition-colors dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-zinc-800">
              <div>
                <h2 id="titulo-modal-despesa" className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                  Lançar Nova Despesa
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                  Registre uma saída do caixa da oficina (combustível, aluguel, ferramenta, etc.)
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
              <FormularioCampos hoje={hoje} valores={resultado && !resultado.ok ? resultado.valores ?? {} : {}} />

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
                  {pendente ? 'Lançando…' : 'Lançar Despesa'}
                </Botao>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function FormularioCampos({
  hoje,
  valores,
}: {
  hoje: string
  valores: Record<string, string>
}) {
  const [categoria, setCategoria] = useState(valores.categoria || 'ferramenta')
  const ehOutros = categoria === 'outros'

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Campo
          rotulo="Data"
          nome="data"
          type="date"
          defaultValue={valores.data || hoje}
        />
        <CampoSelecao
          rotulo="Categoria"
          nome="categoria"
          defaultValue={valores.categoria || undefined}
          onChange={(e) => setCategoria(e.target.value)}
          opcoes={Object.entries(CATEGORIAS_DESPESA).map(([valor, texto]) => ({
            valor,
            texto,
          }))}
        />
      </div>

      {ehOutros && (
        <Campo
          rotulo="Especifique a despesa"
          nome="descricao"
          placeholder="Ex: Conserto do portão, materiais de limpeza…"
          defaultValue={valores.descricao ?? ''}
        />
      )}

      <Campo
        rotulo="Valor (R$)"
        nome="valor"
        required
        placeholder="0,00"
        defaultValue={valores.valor ?? ''}
      />
    </>
  )
}
