import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Space_Mono } from 'next/font/google'
import { ProvedorTema } from '@/componentes/provedor-tema'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
})

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-mono',
})

export const metadata: Metadata = {
  title: 'Planeta Motores',
  description: 'Controle de clientes, ordens de serviço e estoque',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
}

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${spaceMono.variable}`}
    >
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <ProvedorTema>{children}</ProvedorTema>
      </body>
    </html>
  )
}

