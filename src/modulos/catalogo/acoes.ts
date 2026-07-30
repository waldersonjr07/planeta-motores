'use server'

import { revalidatePath } from 'next/cache'
import { falhaDeValidacao, type Resultado } from '@/lib/resultado'
import { entradaFornecedor } from './fornecedores-esquemas'
import {
  atualizarFornecedor,
  criarFornecedor,
  definirAtivoFornecedor,
} from './fornecedores-operacoes'
import { entradaPeca } from './pecas-esquemas'
import { atualizarPeca, criarPeca, definirAtivoPeca } from './pecas-operacoes'
import { entradaServico } from './servicos-esquemas'
import { atualizarServico, criarServico, definirAtivoServico } from './servicos-operacoes'

function objeto(formulario: FormData): Record<string, string> {
  const dados: Record<string, string> = {}
  for (const [chave, valor] of formulario.entries()) dados[chave] = String(valor)
  return dados
}

export async function acaoSalvarServico(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  const analise = entradaServico.safeParse(objeto(formulario))
  if (!analise.success) return falhaDeValidacao(analise.error)

  const id = String(formulario.get('id') ?? '')
  const r = id ? await atualizarServico(id, analise.data) : await criarServico(analise.data)
  if (!r.ok) return r

  revalidatePath('/catalogo/servicos')
  return { ok: true, dados: null }
}

export async function acaoDefinirAtivoServico(formulario: FormData): Promise<void> {
  await definirAtivoServico(
    String(formulario.get('id') ?? ''),
    formulario.get('ativo') === 'true',
  )
  revalidatePath('/catalogo/servicos')
}

export async function acaoSalvarPeca(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  const analise = entradaPeca.safeParse(objeto(formulario))
  if (!analise.success) return falhaDeValidacao(analise.error)

  const id = String(formulario.get('id') ?? '')
  const r = id ? await atualizarPeca(id, analise.data) : await criarPeca(analise.data)
  if (!r.ok) return r

  revalidatePath('/catalogo/pecas')
  return { ok: true, dados: null }
}

export async function acaoDefinirAtivoPeca(formulario: FormData): Promise<void> {
  await definirAtivoPeca(String(formulario.get('id') ?? ''), formulario.get('ativo') === 'true')
  revalidatePath('/catalogo/pecas')
}

export async function acaoSalvarFornecedor(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  const analise = entradaFornecedor.safeParse(objeto(formulario))
  if (!analise.success) return falhaDeValidacao(analise.error)

  const id = String(formulario.get('id') ?? '')
  const r = id
    ? await atualizarFornecedor(id, analise.data)
    : await criarFornecedor(analise.data)
  if (!r.ok) return r

  revalidatePath('/catalogo/fornecedores')
  return { ok: true, dados: null }
}

export async function acaoDefinirAtivoFornecedor(formulario: FormData): Promise<void> {
  await definirAtivoFornecedor(
    String(formulario.get('id') ?? ''),
    formulario.get('ativo') === 'true',
  )
  revalidatePath('/catalogo/fornecedores')
}
