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
    return (
      <p className="rounded-md border border-borda bg-realce px-3 py-2 text-sm text-tinta-suave">
        Ordem de serviço encerrada.
      </p>
    )
  }

  const motivoPedido = destino ? PEDE_MOTIVO[destino] : undefined

  return (
    <div className="relative">
      <Botao
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((atual) => !atual)}
      >
        Atualização da OS
        <span aria-hidden="true" className="text-xs">
          {aberto ? '▲' : '▼'}
        </span>
      </Botao>

      {principal && !aberto && (
        <p className="mt-1.5 text-right text-xs text-tinta-fraca">
          Próximo passo: {principal.rotulo}
        </p>
      )}

      {aberto && (
        <form
          action={enviar}
          className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-borda-forte bg-superficie p-4 shadow-lg"
        >
          <input type="hidden" name="osId" value={osId} />

          <p className="text-xs uppercase tracking-wide text-tinta-fraca">Situação atual</p>
          <p className="mb-4 mt-0.5 font-semibold">{SITUACOES[situacao]}</p>

          <p className="mb-2 text-xs uppercase tracking-wide text-tinta-fraca">Mudar para</p>

          <div className="flex flex-col gap-1.5">
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
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${
                    escolhido
                      ? 'border-acao bg-acao-fundo'
                      : recomendado
                        ? 'border-acao text-acao-escura hover:bg-acao-fundo'
                        : 'border-borda hover:bg-realce'
                  }`}
                >
                  <span>{SITUACOES[para]}</span>
                  {recomendado && (
                    <span className="text-xs text-acao">próximo passo</span>
                  )}
                </button>
              )
            })}
          </div>

          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-tinta-suave">
              Observação (opcional)
            </span>
            <input
              name="observacao"
              placeholder="Fica registrada no histórico"
              className="rounded-md border border-borda-forte px-3 py-2 text-sm placeholder:text-tinta-fraca"
            />
          </label>

          {motivoPedido && (
            <div className="mt-4 flex flex-col gap-2 rounded-md border border-atencao-borda bg-atencao-fundo p-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-atencao">{motivoPedido}</span>
                <input
                  name="motivo"
                  required
                  aria-label={motivoPedido}
                  className="rounded-md border border-atencao-borda bg-superficie px-3 py-2 text-sm"
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
