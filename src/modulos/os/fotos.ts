import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { osFotos } from '@/db/schema'
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

export async function salvarFoto(
  osId: string,
  arquivo: File,
  momento: MomentoFoto,
  legenda?: string,
): Promise<Resultado<{ id: string }>> {
  if (!arquivo || arquivo.size === 0) return falha('Selecione uma foto.')

  const extensao = EXTENSAO_POR_TIPO[arquivo.type]
  if (!extensao) return falha('Formato não aceito. Envie JPEG, PNG ou WebP.')

  if (arquivo.size > LIMITE_BYTES) {
    return falha('A foto passa de 8 MB. Reduza o tamanho antes de enviar.')
  }

  // Nome gerado, nunca o do usuário: nome de arquivo enviado pode carregar
  // caminho e escapar do diretório.
  const nomeGerado = `${randomUUID()}.${extensao}`
  const diretorio = path.join(RAIZ, osId)
  await mkdir(diretorio, { recursive: true })
  await writeFile(
    path.join(diretorio, nomeGerado),
    Buffer.from(await arquivo.arrayBuffer()),
  )

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
}

export async function lerFoto(
  id: string,
): Promise<{ caminhoAbsoluto: string; tipo: string } | null> {
  const [foto] = await db.select().from(osFotos).where(eq(osFotos.id, id)).limit(1)
  if (!foto) return null

  const extensao = path.extname(foto.caminhoArquivo).replace('.', '')
  const tipo =
    Object.entries(EXTENSAO_POR_TIPO).find(([, ext]) => ext === extensao)?.[0] ??
    'application/octet-stream'

  return { caminhoAbsoluto: path.join(RAIZ, foto.caminhoArquivo), tipo }
}

export async function removerFoto(id: string): Promise<Resultado<null>> {
  const [foto] = await db.select().from(osFotos).where(eq(osFotos.id, id)).limit(1)
  if (!foto) return falha('Foto não encontrada.')

  await db.delete(osFotos).where(eq(osFotos.id, id))
  // Registro apagado é o que importa; arquivo órfão não quebra nada.
  await unlink(path.join(RAIZ, foto.caminhoArquivo)).catch(() => {})

  return sucesso(null)
}
