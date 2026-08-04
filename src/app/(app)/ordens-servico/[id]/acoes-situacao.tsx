'use client'

import { useActionState, useEffect, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoMudarSituacao } from '@/modulos/os/acoes'
import { SITUACOES, TRANSICOES, proximaAcao, type SituacaoOs } from '@/modulos/os/situacoes'

/**
 * Transições que pedem justificativa antes de acontecer. O cancelamento saiu
 * daqui: a observação opcional do painel cobre quem quiser registrar o motivo.
 */
const PEDE_MOTIVO: Partial<Record<SituacaoOs, string>> = {
  recusado: 'Por que o cliente recusou?',
}

export function AcoesSituacao({ osId, situacao }: { osId: string; situacao: SituacaoOs }) {
  const [resultado, enviar, pendente] = useActionState(acaoMudarSituacao, null)
  const [aberto, setAberto] = useState(false)
  const [destino, setDestino] = useState<SituacaoOs | null>(null)

  // A situação mudou: fecha o painel para não deixar na tela um menu que já não
  // corresponde ao estado da OS.
  useEffect(() => {
    if (resultado?.ok) {
      setAberto(false)
      setDestino(null)
    }
  }, [resultado])

  const principal = proximaAcao(situacao)
  const opcoes = TRANSICOES[situacao].filter((para) => para !== situacao)

  if (opcoes.length === 0) {
    return <p className="text-sm text-gray-600">Ordem de serviço encerrada.</p>
  }

  const motivoPedido = destino ? PEDE_MOTIVO[destino] : undefined

  return (
    <div className="relative">
      <Botao type="button" onClick={() => setAberto((atual) => !atual)}>
        Atualização da OS {aberto ? '▲' : '▼'}
      </Botao>

      {principal && !aberto && (
        <p className="mt-1 text-right text-xs text-gray-600">
          Próximo passo: {principal.rotulo}
        </p>
      )}

      {aberto && (
        <form
          action={enviar}
          className="absolute right-0 z-10 mt-2 w-80 rounded border border-gray-300 bg-white p-4 shadow-lg"
        >
          <input type="hidden" name="osId" value={osId} />

          <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">
            Situação atual
          </p>
          <p className="mb-3 font-semibold">{SITUACOES[situacao]}</p>

          <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Mudar para</p>

          <div className="flex flex-col gap-2">
            {opcoes.map((para) => {
              const recomendado = para === principal?.para
              const pedeMotivo = Boolean(PEDE_MOTIVO[para])
              const escolhido = destino === para

              // Quem pede motivo não envia no clique: primeiro abre o campo.
              return (
                <button
                  key={para}
                  type={pedeMotivo ? 'button' : 'submit'}
                  name={pedeMotivo ? undefined : 'para'}
                  value={pedeMotivo ? undefined : para}
                  disabled={pendente}
                  onClick={pedeMotivo ? () => setDestino(para) : undefined}
                  className={`rounded border px-3 py-2 text-left text-sm disabled:opacity-60 ${
                    escolhido
                      ? 'border-blue-600 bg-blue-50'
                      : recomendado
                        ? 'border-blue-600 text-blue-800'
                        : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {SITUACOES[para]}
                  {recomendado && (
                    <span className="ml-2 text-xs text-blue-700">· próximo passo</span>
                  )}
                </button>
              )
            })}
          </div>

          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-gray-700">Observação (opcional)</span>
            <input
              name="observacao"
              placeholder="Fica registrada no histórico"
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          {motivoPedido && (
            <div className="mt-3 flex flex-col gap-2 rounded bg-amber-50 p-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-amber-900">{motivoPedido}</span>
                <input
                  name="motivo"
                  required
                  aria-label={motivoPedido}
                  className="rounded border border-amber-300 px-3 py-2 text-sm"
                />
              </label>
              <Botao type="submit" name="para" value={destino!} disabled={pendente}>
                {pendente ? 'Salvando…' : `Confirmar: ${SITUACOES[destino!]}`}
              </Botao>
            </div>
          )}

          {resultado && !resultado.ok && (
            <div className="mt-3">
              <MensagemErro>{resultado.erro}</MensagemErro>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
