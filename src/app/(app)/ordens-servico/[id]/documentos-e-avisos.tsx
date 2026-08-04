'use client'

import { linkDoWhatsapp, preencherModelo } from '@/modulos/avisos/mensagens'

type Modelos = { orcamento: string; pronto: string; cobranca: string }

const LINK =
  'inline-flex items-center rounded-md border border-borda-forte bg-superficie px-3 py-1.5 text-sm hover:bg-realce'

/**
 * PDFs e mensagem de WhatsApp. O envio é manual de propósito: a API oficial
 * exige conta verificada, templates aprovados e custo por mensagem.
 */
export function DocumentosEAvisos({
  osId,
  telefone,
  modelos,
  valores,
  temItens,
  temSaldo,
}: {
  osId: string
  telefone: string | null
  modelos: Modelos
  valores: { cliente: string; numero: string; equipamento: string; total: string; saldo: string }
  temItens: boolean
  temSaldo: boolean
}) {
  const avisos = [
    { chave: 'orcamento' as const, rotulo: 'Avisar: orçamento', ativo: temItens },
    { chave: 'pronto' as const, rotulo: 'Avisar: serviço pronto', ativo: true },
    { chave: 'cobranca' as const, rotulo: 'Cobrar saldo', ativo: temSaldo },
  ]

  return (
    <div className="flex flex-wrap items-start gap-x-8 gap-y-4 rounded-lg border border-borda bg-superficie px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-tinta-fraca">
          Documentos
        </span>
        {/* Nomeados "PDF do …" para não se confundirem com as abas da ficha. */}
        <a href={`/api/documentos/comprovante/${osId}`} target="_blank" rel="noreferrer" className={LINK}>
          PDF do comprovante
        </a>
        <a href={`/api/documentos/orcamento/${osId}`} target="_blank" rel="noreferrer" className={LINK}>
          PDF do orçamento
        </a>
        <a href={`/api/documentos/recibo/${osId}`} target="_blank" rel="noreferrer" className={LINK}>
          PDF do recibo
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-tinta-fraca">
          WhatsApp
        </span>
        {telefone ? (
          avisos
            .filter((aviso) => aviso.ativo)
            .map((aviso) => (
              <a
                key={aviso.chave}
                href={linkDoWhatsapp(telefone, preencherModelo(modelos[aviso.chave], valores))}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-md border border-ok/40 bg-ok-fundo px-3 py-1.5 text-sm text-ok hover:bg-ok/10"
              >
                {aviso.rotulo}
              </a>
            ))
        ) : (
          <span className="text-sm text-tinta-fraca">
            Cliente sem telefone cadastrado — não dá para montar a mensagem.
          </span>
        )}
      </div>
    </div>
  )
}
