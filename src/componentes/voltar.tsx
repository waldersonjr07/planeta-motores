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
      className="inline-flex items-center gap-1 text-sm text-tinta-suave hover:text-acao hover:underline"
    >
      <span aria-hidden="true">←</span> {texto}
    </Link>
  )
}
