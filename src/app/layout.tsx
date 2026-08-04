import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Planeta Motores',
  description: 'Controle de clientes, ordens de serviço e estoque',
}

export const viewport = {
  // O marinho do emblema pinta a barra do navegador no celular.
  themeColor: '#16283f',
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
