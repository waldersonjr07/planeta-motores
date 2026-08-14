'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { falhaDeValidacao, type Resultado } from '@/lib/resultado'
import { exigirUsuario } from '@/modulos/auth/guarda'
import { entradaEquipamento } from './equipamentos-esquemas'
import { criarEquipamento, definirAtivoEquipamento } from './equipamentos-operacoes'
import { entradaCliente } from './esquemas'
import { atualizarCliente, criarCliente, definirAtivoCliente } from './operacoes'

function objeto(formulario: FormData): Record<string, string> {
  const dados: Record<string, string> = {}
  for (const [chave, valor] of formulario.entries()) dados[chave] = String(valor)
  return dados
}

export async function acaoCriarCliente(
  _anterior: Resultado<{ id: string }> | null,
  formulario: FormData,
): Promise<Resultado<{ id: string }>> {
  await exigirUsuario()

  const analise = entradaCliente.safeParse(objeto(formulario))
  if (!analise.success) return falhaDeValidacao(analise.error)

  const r = await criarCliente(analise.data)
  if (!r.ok) return r

  revalidatePath('/clientes')
  redirect(`/clientes/${r.dados.id}`)
}

export async function acaoAtualizarCliente(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  await exigirUsuario()

  const id = String(formulario.get('id') ?? '')
  const analise = entradaCliente.safeParse(objeto(formulario))
  if (!analise.success) return falhaDeValidacao(analise.error)

  const r = await atualizarCliente(id, analise.data)
  if (!r.ok) return r

  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
  redirect(`/clientes/${id}`)
}

export async function acaoDefinirAtivoCliente(formulario: FormData): Promise<void> {
  await exigirUsuario()

  const id = String(formulario.get('id') ?? '')
  await definirAtivoCliente(id, formulario.get('ativo') === 'true')
  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
}

export async function acaoCriarEquipamento(
  _anterior: Resultado<{ id: string }> | null,
  formulario: FormData,
): Promise<Resultado<{ id: string }>> {
  await exigirUsuario()

  const analise = entradaEquipamento.safeParse(objeto(formulario))
  if (!analise.success) return falhaDeValidacao(analise.error)

  const r = await criarEquipamento(analise.data)
  if (!r.ok) return r

  revalidatePath(`/clientes/${analise.data.clienteId}`)
  return r
}

export async function acaoDefinirAtivoEquipamento(formulario: FormData): Promise<void> {
  await exigirUsuario()

  await definirAtivoEquipamento(
    String(formulario.get('id') ?? ''),
    formulario.get('ativo') === 'true',
  )
  revalidatePath(`/clientes/${String(formulario.get('clienteId') ?? '')}`)
}
