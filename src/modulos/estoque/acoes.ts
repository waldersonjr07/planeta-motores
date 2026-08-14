'use server'

import { revalidatePath } from 'next/cache'
import { parsearQuantidade } from '@/lib/quantidade'
import { falha, type Resultado } from '@/lib/resultado'
import { exigirUsuario } from '@/modulos/auth/guarda'
import { ajustarEstoque } from './operacoes'

export async function acaoAjustarEstoque(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  await exigirUsuario()

  const texto = String(formulario.get('quantidade') ?? '').trim()
  const negativo = texto.startsWith('-')
  const quantidade = parsearQuantidade(negativo ? texto.slice(1) : texto)
  if (quantidade === null) {
    return falha('Informe uma quantidade como 0,5 (use "-" para dar baixa).')
  }

  const r = await ajustarEstoque({
    pecaId: String(formulario.get('pecaId') ?? ''),
    quantidade: negativo ? -quantidade : quantidade,
    motivo: String(formulario.get('motivo') ?? ''),
  })

  if (r.ok) revalidatePath('/estoque')
  return r
}
