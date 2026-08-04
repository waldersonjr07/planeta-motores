import { db } from '@/db'
import { estoqueMovimentos } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'

export type Transacao = Parameters<Parameters<typeof db.transaction>[0]>[0]

export type EntradaMovimento = {
  pecaId: string
  tipo: 'entrada_compra' | 'saida_os' | 'estorno_os' | 'ajuste'
  quantidade: number
  referenciaTipo?: string
  referenciaId?: string
  motivo?: string | null
  usuarioId?: string
}

/**
 * Grava no razão. Aceita transação para que a baixa de estoque e a mudança de
 * situação da OS aconteçam juntas ou não aconteçam.
 */
export async function registrarMovimento(
  entrada: EntradaMovimento,
  tx?: Transacao,
): Promise<void> {
  const executor = tx ?? db
  await executor.insert(estoqueMovimentos).values({
    pecaId: entrada.pecaId,
    tipo: entrada.tipo,
    quantidade: entrada.quantidade.toFixed(3),
    referenciaTipo: entrada.referenciaTipo ?? null,
    referenciaId: entrada.referenciaId ?? null,
    motivo: entrada.motivo ?? null,
    usuarioId: entrada.usuarioId ?? null,
  })
}

export async function ajustarEstoque(entrada: {
  pecaId: string
  quantidade: number
  /** Opcional: a tela confirma o lançamento no lugar de exigir justificativa. */
  motivo?: string
}): Promise<Resultado<null>> {
  if (!Number.isFinite(entrada.quantidade) || entrada.quantidade === 0) {
    return falha('Informe uma quantidade diferente de zero.')
  }

  await registrarMovimento({
    pecaId: entrada.pecaId,
    tipo: 'ajuste',
    quantidade: entrada.quantidade,
    motivo: entrada.motivo?.trim() || null,
  })
  return sucesso(null)
}
