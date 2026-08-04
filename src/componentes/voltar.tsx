import Link from 'next/link'

/**
 * Volta para a lista de onde a ficha foi aberta. Link, e não histórico do
 * navegador: o destino é sempre o mesmo, independentemente de como se chegou
 * aqui — inclusive vindo de um link do painel ou do financeiro.
 */
export function Voltar({ href, texto }: { href: string; texto: string }) {
  return (
    <Link
      href={href}
      className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
    >
      ← {texto}
    </Link>
  )
}
