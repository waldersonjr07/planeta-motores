import JSZip from 'jszip'
import { NextResponse } from 'next/server'
import { usuarioAtual } from '@/modulos/auth/guarda'
import { gerarExportacao } from '@/modulos/exportacao/pacote'

export async function GET() {
  if (!(await usuarioAtual())) {
    return new NextResponse('Não autorizado', { status: 401 })
  }

  const arquivos = await gerarExportacao()
  const zip = new JSZip()
  for (const arquivo of arquivos) {
    // BOM na frente: sem ele o Excel abre acentuação quebrada, e é nele que a
    // Lucilene vai abrir.
    zip.file(arquivo.nome, `﻿${arquivo.conteudo}`)
  }

  const conteudo = await zip.generateAsync({ type: 'nodebuffer' })
  const data = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  return new NextResponse(new Uint8Array(conteudo), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="planeta-motores-${data}.zip"`,
    },
  })
}
