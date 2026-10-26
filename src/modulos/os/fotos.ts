import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { ordensServico, osFotos } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import type { MomentoFoto } from './momentos'

/** Fora de `public/`: foto de cliente não pode ser servida sem verificar sessão. */
const RAIZ = path.join(process.cwd(), 'uploads', 'os')

const EXTENSAO_POR_TIPO: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const LIMITE_BYTES = 8 * 1024 * 1024

/**
 * Valida a assinatura real dos bytes do arquivo (magic numbers) para garantir
 * que se trata de uma imagem JPEG, PNG ou WebP legítima, impedindo arquivos
 * maliciosos com MIME type forjado.
 */
function detectarTipoImagem(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png'
  }
  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

export async function salvarFoto(
  osId: string,
  arquivo: File,
  momento: MomentoFoto,
  legenda?: string,
): Promise<Resultado<{ id: string }>> {
  // 1. Validação estrita de UUID para evitar Path Traversal e injeção de caminho
  const validacaoOsId = z.string().uuid().safeParse(osId)
  if (!validacaoOsId.success) {
    return falha('Identificador de ordem de serviço inválido.')
  }

  if (!arquivo || arquivo.size === 0) return falha('Selecione uma foto.')

  if (arquivo.size > LIMITE_BYTES) {
    return falha('A foto passa de 8 MB. Reduza o tamanho antes de enviar.')
  }

  // 2. Conferir no banco se a OS existe ANTES de gravar qualquer arquivo no disco.
  // Evita arquivos órfãos no sistema de arquivos caso a OS não exista.
  const [osExiste] = await db
    .select({ id: ordensServico.id })
    .from(ordensServico)
    .where(eq(ordensServico.id, osId))
    .limit(1)

  if (!osExiste) {
    return falha('Ordem de serviço não encontrada.')
  }

  // 3. Validação dos magic bytes da imagem
  const buffer = Buffer.from(await arquivo.arrayBuffer())
  const tipoDetectado = detectarTipoImagem(buffer)
  if (!tipoDetectado) {
    return falha('Formato não aceito ou arquivo corrompido. Envie JPEG, PNG ou WebP válido.')
  }

  const extensao = EXTENSAO_POR_TIPO[tipoDetectado]

  // Nome gerado com UUID, nunca o do usuário: nome enviado pode carregar caminho
  const nomeGerado = `${randomUUID()}.${extensao}`
  const diretorio = path.join(RAIZ, osId)
  await mkdir(diretorio, { recursive: true })
  const caminhoAbsoluto = path.join(diretorio, nomeGerado)
  await writeFile(caminhoAbsoluto, buffer)

  try {
    const [criada] = await db
      .insert(osFotos)
      .values({
        osId,
        momento,
        caminhoArquivo: path.posix.join(osId, nomeGerado),
        nomeOriginal: arquivo.name || null,
        tamanhoBytes: arquivo.size,
        legenda: legenda?.trim() || null,
      })
      .returning({ id: osFotos.id })

    return sucesso({ id: criada.id })
  } catch (erro) {
    // Se a inserção no banco falhar, limpa o arquivo físico gravado
    await unlink(caminhoAbsoluto).catch(() => {})
    throw erro
  }
}

export async function lerFoto(
  id: string,
): Promise<{ caminhoAbsoluto: string; tipo: string } | null> {
  if (!z.string().uuid().safeParse(id).success) return null

  const [foto] = await db.select().from(osFotos).where(eq(osFotos.id, id)).limit(1)
  if (!foto) return null

  const extensao = path.extname(foto.caminhoArquivo).replace('.', '')
  const tipo =
    Object.entries(EXTENSAO_POR_TIPO).find(([, ext]) => ext === extensao)?.[0] ??
    'application/octet-stream'

  return { caminhoAbsoluto: path.join(RAIZ, foto.caminhoArquivo), tipo }
}

export async function removerFoto(id: string): Promise<Resultado<null>> {
  if (!z.string().uuid().safeParse(id).success) return falha('Foto não encontrada.')

  const [foto] = await db.select().from(osFotos).where(eq(osFotos.id, id)).limit(1)
  if (!foto) return falha('Foto não encontrada.')

  await db.delete(osFotos).where(eq(osFotos.id, id))
  // Registro apagado é o que importa; arquivo órfão não quebra nada.
  await unlink(path.join(RAIZ, foto.caminhoArquivo)).catch(() => {})

  return sucesso(null)
}
