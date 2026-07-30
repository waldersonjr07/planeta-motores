'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { parsearReais } from '@/lib/dinheiro'
import { parsearQuantidade } from '@/lib/quantidade'
import { falha, falhaDeValidacao, type Resultado } from '@/lib/resultado'
import { usuarioAtual } from '@/modulos/auth/guarda'
import { entradaItemOs, entradaOs } from './esquemas'
import { removerFoto, salvarFoto } from './fotos'
import type { MomentoFoto } from './momentos'
import {
  adicionarItem,
  atualizarDiagnostico,
  criarOs,
  definirDesconto,
  mudarSituacao,
  removerItem,
} from './operacoes'
import type { SituacaoOs } from './situacoes'

function objeto(formulario: FormData): Record<string, string> {
  const dados: Record<string, string> = {}
  for (const [chave, valor] of formulario.entries()) dados[chave] = String(valor)
  return dados
}

function revalidarOs(osId: string) {
  revalidatePath('/ordens-servico')
  revalidatePath(`/ordens-servico/${osId}`)
}

export async function acaoCriarOs(
  _anterior: Resultado<{ id: string }> | null,
  formulario: FormData,
): Promise<Resultado<{ id: string }>> {
  // O seletor entrega "clienteId:equipamentoId" numa opção só, agrupada por
  // cliente — evita dois selects dependentes por um ganho que não existe.
  const par = String(formulario.get('equipamento') ?? '').split(':')
  const analise = entradaOs.safeParse({
    ...objeto(formulario),
    clienteId: par[0] ?? '',
    equipamentoId: par[1] ?? '',
  })
  if (!analise.success) return falhaDeValidacao(analise.error)

  const r = await criarOs(analise.data)
  if (!r.ok) return r

  revalidatePath('/ordens-servico')
  redirect(`/ordens-servico/${r.dados.id}`)
}

export async function acaoAdicionarItem(
  _anterior: Resultado<{ id: string }> | null,
  formulario: FormData,
): Promise<Resultado<{ id: string }>> {
  const osId = String(formulario.get('osId') ?? '')
  const quantidade = parsearQuantidade(String(formulario.get('quantidade') ?? '1'))
  if (quantidade === null) return falha('Informe uma quantidade como 0,5.')

  const precoTexto = String(formulario.get('precoUnitario') ?? '').trim()
  let precoUnitarioCentavos: number | undefined
  if (precoTexto) {
    const centavos = parsearReais(precoTexto)
    if (centavos === null) return falha('Informe um valor como 1.250,50.')
    precoUnitarioCentavos = centavos
  }

  const par = String(formulario.get('item') ?? '').split(':')
  const analise = entradaItemOs.safeParse({
    tipo: par[0],
    referenciaId: par[1] ?? '',
    quantidade,
    precoUnitarioCentavos,
  })
  if (!analise.success) return falhaDeValidacao(analise.error)

  const r = await adicionarItem(osId, analise.data)
  if (r.ok) revalidarOs(osId)
  return r
}

export async function acaoRemoverItem(formulario: FormData): Promise<void> {
  await removerItem(String(formulario.get('itemId') ?? ''))
  revalidarOs(String(formulario.get('osId') ?? ''))
}

export async function acaoDefinirDesconto(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  const osId = String(formulario.get('osId') ?? '')
  const texto = String(formulario.get('desconto') ?? '').trim()
  const centavos = texto ? parsearReais(texto) : 0
  if (centavos === null) return falha('Informe um valor como 1.250,50.')

  const r = await definirDesconto(osId, centavos)
  if (r.ok) revalidarOs(osId)
  return r
}

export async function acaoSalvarDiagnostico(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  const osId = String(formulario.get('osId') ?? '')
  const r = await atualizarDiagnostico(osId, String(formulario.get('diagnostico') ?? ''))
  if (r.ok) revalidarOs(osId)
  return r
}

export async function acaoEnviarFoto(
  _anterior: Resultado<{ id: string }> | null,
  formulario: FormData,
): Promise<Resultado<{ id: string }>> {
  const osId = String(formulario.get('osId') ?? '')
  const arquivo = formulario.get('arquivo')
  if (!(arquivo instanceof File)) return falha('Selecione uma foto.')

  const r = await salvarFoto(
    osId,
    arquivo,
    (String(formulario.get('momento') ?? 'chegada') as MomentoFoto) ?? 'chegada',
    String(formulario.get('legenda') ?? ''),
  )
  if (r.ok) revalidarOs(osId)
  return r
}

export async function acaoRemoverFoto(formulario: FormData): Promise<void> {
  await removerFoto(String(formulario.get('fotoId') ?? ''))
  revalidarOs(String(formulario.get('osId') ?? ''))
}

export async function acaoMudarSituacao(
  _anterior: Resultado<null> | null,
  formulario: FormData,
): Promise<Resultado<null>> {
  const osId = String(formulario.get('osId') ?? '')
  const para = String(formulario.get('para') ?? '') as SituacaoOs
  const usuario = await usuarioAtual()

  const r = await mudarSituacao(osId, para, {
    observacao: String(formulario.get('observacao') ?? '').trim() || undefined,
    motivo: String(formulario.get('motivo') ?? '').trim() || undefined,
    usuarioId: usuario?.id,
  })
  if (r.ok) revalidarOs(osId)
  return r
}
