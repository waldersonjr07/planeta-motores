'use client'

import { linkDoWhatsapp, preencherModelo } from '@/modulos/avisos/mensagens'

type Modelos = { orcamento: string; pronto: string; cobranca: string }

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
    <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4 text-sm">
      <span className="text-gray-600">Documentos:</span>
      {/* Nomeados "PDF do …" para não se confundirem com as abas da ficha. */}
      <a
        href={`/api/documentos/comprovante/${osId}`}
        target="_blank"
        rel="noreferrer"
        className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
      >
        PDF do comprovante
      </a>
      <a
        href={`/api/documentos/orcamento/${osId}`}
        target="_blank"
        rel="noreferrer"
        className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
      >
        PDF do orçamento
      </a>
      <a
        href={`/api/documentos/recibo/${osId}`}
        target="_blank"
        rel="noreferrer"
        className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
      >
        PDF do recibo
      </a>

      {telefone ? (
        <>
          <span className="ml-4 text-gray-600">WhatsApp:</span>
          {avisos
            .filter((aviso) => aviso.ativo)
            .map((aviso) => (
              <a
                key={aviso.chave}
                href={linkDoWhatsapp(telefone, preencherModelo(modelos[aviso.chave], valores))}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-green-600 px-3 py-1.5 text-green-700 hover:bg-green-50"
              >
                {aviso.rotulo}
              </a>
            ))}
        </>
      ) : (
        <span className="ml-4 text-gray-500">
          Cliente sem telefone cadastrado — não dá para montar a mensagem.
        </span>
      )}
    </div>
  )
}
