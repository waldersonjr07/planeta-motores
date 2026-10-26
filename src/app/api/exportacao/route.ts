import JSZip from 'jszip'
import { NextResponse } from 'next/server'
import { hoje } from '@/lib/periodo'
import { usuarioAtual } from '@/modulos/auth/guarda'
import { verificarLimiteDeRotas } from '@/modulos/auth/limitador-rotas'
import { gerarExportacao } from '@/modulos/exportacao/pacote'

export async function GET() {
  const usuario = await usuarioAtual()
  if (!usuario) {
    return new NextResponse('Não autorizado', { status: 401 })
  }

  // Prevenção contra DoS: limite de 10 exportações por minuto por usuário
  if (!verificarLimiteDeRotas(`export:${usuario.id}`, 10, 60_000)) {
    return new NextResponse('Muitas requisições de exportação. Aguarde um minuto.', {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }

  const arquivos = await gerarExportacao()
  const zip = new JSZip()
  for (const arquivo of arquivos) {
    // BOM na frente: sem ele o Excel abre acentuação quebrada, e é nele que a
    // Lucilene vai abrir.
    zip.file(arquivo.nome, `﻿${arquivo.conteudo}`)
  }

  const conteudo = await zip.generateAsync({ type: 'nodebuffer' })
  // `hoje()` em vez de um `Intl` montado aqui: era a segunda cópia do fuso no
  // código, e cópia de fuso é o tipo de coisa que sobrevive à correção da
  // primeira. O nome do arquivo tem de ser o dia de quem baixa.
  const data = hoje()

  return new NextResponse(new Uint8Array(conteudo), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="planeta-motores-${data}.zip"`,
    },
  })
}
