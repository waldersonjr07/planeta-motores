import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { usuarioAtual } from '@/modulos/auth/guarda'
import { lerFoto } from '@/modulos/os/fotos'

/**
 * Serve a foto só para sessão válida. Sem isso, bastaria adivinhar o
 * identificador para ver o equipamento de qualquer cliente.
 */
export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await usuarioAtual())) {
    return new NextResponse('Não autorizado', { status: 401 })
  }

  const { id } = await params
  const foto = await lerFoto(id)
  if (!foto) return new NextResponse('Não encontrada', { status: 404 })

  try {
    const conteudo = await readFile(foto.caminhoAbsoluto)
    return new NextResponse(new Uint8Array(conteudo), {
      headers: {
        'Content-Type': foto.tipo,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return new NextResponse('Arquivo não encontrado', { status: 404 })
  }
}
