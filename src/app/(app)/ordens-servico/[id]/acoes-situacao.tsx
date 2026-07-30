'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoMudarSituacao } from '@/modulos/os/acoes'
import { SITUACOES, TRANSICOES, proximaAcao, type SituacaoOs } from '@/modulos/os/situacoes'

/** Transições que pedem uma justificativa antes de acontecer. */
const PEDE_MOTIVO: Partial<Record<SituacaoOs, string>> = {
  recusado: 'Por que o cliente recusou?',
  cancelado: 'Por que a OS está sendo cancelada?',
}

export function AcoesSituacao({ osId, situacao }: { osId: string; situacao: SituacaoOs }) {
  const [resultado, enviar, pendente] = useActionState(acaoMudarSituacao, null)
  const [destino, setDestino] = useState<SituacaoOs | null>(null)

  const principal = proximaAcao(situacao)
  const alternativas = TRANSICOES[situacao].filter(
    (para) => para !== principal?.para && para !== situacao,
  )

  if (!principal && alternativas.length === 0) {
    return <p className="text-sm text-gray-600">Ordem de serviço encerrada.</p>
  }

  const motivoPedido = destino ? PEDE_MOTIVO[destino] : undefined

  return (
    <form action={enviar} className="flex flex-col gap-2">
      <input type="hidden" name="osId" value={osId} />
      <input type="hidden" name="para" value={destino ?? principal?.para ?? ''} />

      {motivoPedido && (
        <input
          name="motivo"
          required
          placeholder={motivoPedido}
          aria-label={motivoPedido}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
      )}

      <div className="flex flex-wrap gap-2">
        {principal && (
          <Botao type="submit" disabled={pendente} onClick={() => setDestino(null)}>
            {pendente ? 'Salvando…' : principal.rotulo}
          </Botao>
        )}

        {alternativas.map((para) => (
          <Botao
            key={para}
            type="submit"
            variante="secundario"
            disabled={pendente}
            onClick={() => setDestino(para)}
          >
            {SITUACOES[para]}
          </Botao>
        ))}
      </div>

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
    </form>
  )
}
