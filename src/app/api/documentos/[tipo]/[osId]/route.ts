import { NextResponse } from 'next/server'
import { usuarioAtual } from '@/modulos/auth/guarda'
import { verificarLimiteDeRotas } from '@/modulos/auth/limitador-rotas'
import { TIPOS, gerarDocumento, type TipoDocumento } from '@/modulos/documentos/pdf'

export async function GET(
  _requisicao: Request,
  { params }: { params: Promise<{ tipo: string; osId: string }> },
) {
  const usuario = await usuarioAtual()
  if (!usuario) {
    return new NextResponse('Não autorizado', { status: 401 })
  }

  // Prevenção contra DoS: limite de 20 PDFs por minuto por usuário
  if (!verificarLimiteDeRotas(`pdf:${usuario.id}`, 20, 60_000)) {
    return new NextResponse('Muitas requisições. Aguarde um minuto antes de gerar novos documentos.', {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

  const { tipo, osId } = await params
  if (!(tipo in TIPOS)) return new NextResponse('Documento desconhecido', { status: 404 })

  const documento = await gerarDocumento(tipo as TipoDocumento, osId)
  if (!documento) return new NextResponse('Ordem de serviço não encontrada', { status: 404 })

  return new NextResponse(new Uint8Array(documento.conteudo), {
    headers: {
      'Content-Type': 'application/pdf',
      // `inline` para abrir no navegador: o caminho comum é conferir na tela
      // antes de imprimir ou mandar pelo WhatsApp.
      'Content-Disposition': `inline; filename="${documento.nomeArquivo}"`,
    },
  })
}
