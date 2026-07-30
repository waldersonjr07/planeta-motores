'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoSalvarDiagnostico } from '@/modulos/os/acoes'

export function AbaDiagnostico({
  osId,
  problemaRelatado,
  diagnostico,
  acessoriosRecebidos,
}: {
  osId: string
  problemaRelatado: string | null
  diagnostico: string | null
  acessoriosRecebidos: string | null
}) {
  const [resultado, enviar, pendente] = useActionState(acaoSalvarDiagnostico, null)

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="rounded border border-gray-200 p-4 text-sm">
        <p className="text-xs uppercase tracking-wide text-gray-500">Problema relatado</p>
        <p className="mt-1 whitespace-pre-line">
          {problemaRelatado ?? 'Não informado na abertura.'}
        </p>
        {acessoriosRecebidos && (
          <>
            <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">
              Acessórios recebidos
            </p>
            <p className="mt-1 whitespace-pre-line">{acessoriosRecebidos}</p>
          </>
        )}
      </div>

      <form action={enviar} className="flex flex-col gap-2">
        <input type="hidden" name="osId" value={osId} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">Diagnóstico do Ivan</span>
          <textarea
            name="diagnostico"
            rows={5}
            defaultValue={diagnostico ?? ''}
            placeholder="Cilindro riscado, carburador com diafragma endurecido…"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
        {resultado?.ok && <p className="text-sm text-green-700">Diagnóstico salvo.</p>}

        <Botao type="submit" disabled={pendente} className="self-start">
          {pendente ? 'Salvando…' : 'Salvar diagnóstico'}
        </Botao>
      </form>
    </div>
  )
}
