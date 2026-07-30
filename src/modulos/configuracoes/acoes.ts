'use server'

import { revalidatePath } from 'next/cache'
import { falhaDeValidacao, type Resultado } from '@/lib/resultado'
import { entradaConfiguracoes } from './esquemas'
import { salvarConfiguracoes } from './operacoes'

export async function acaoSalvarConfiguracoes(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  const dados: Record<string, string> = {}
  for (const [chave, valor] of formulario.entries()) dados[chave] = String(valor)

  const analise = entradaConfiguracoes.safeParse(dados)
  if (!analise.success) return falhaDeValidacao(analise.error)

  const r = await salvarConfiguracoes(analise.data)
  if (!r.ok) return r

  revalidatePath('/configuracoes')
  return { ok: true, dados: null }
}
