'use client'

import { useActionState } from 'react'
import { Botao } from '@/componentes/botao'
import { MensagemErro, MensagemOk } from '@/componentes/mensagem-erro'
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
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="rounded-md border border-borda bg-realce px-4 py-3 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-tinta-fraca">
          Problema relatado pelo cliente
        </p>
        <p className="mt-1 whitespace-pre-line">
          {problemaRelatado ?? 'Não informado na abertura.'}
        </p>
        {acessoriosRecebidos && (
          <>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-tinta-fraca">
              Acessórios recebidos
            </p>
            <p className="mt-1 whitespace-pre-line">{acessoriosRecebidos}</p>
          </>
        )}
      </div>

      <form action={enviar} className="flex flex-col gap-3">
        <input type="hidden" name="osId" value={osId} />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-tinta-suave">
            Diagnóstico do Ivan
          </span>
          <textarea
            name="diagnostico"
            rows={5}
            defaultValue={diagnostico ?? ''}
            placeholder="Cilindro riscado, carburador com diafragma endurecido…"
            className="rounded-md border border-borda-forte px-3 py-2 text-sm placeholder:text-tinta-fraca"
          />
        </label>

        {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}
        {resultado?.ok && <MensagemOk>Diagnóstico salvo.</MensagemOk>}

        <Botao type="submit" disabled={pendente} className="self-start">
          {pendente ? 'Salvando…' : 'Salvar diagnóstico'}
        </Botao>
      </form>
    </div>
  )
}
