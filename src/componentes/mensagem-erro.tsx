export function MensagemErro({ children }: { children?: string }) {
  if (!children) return null
  return (
    <p
      role="alert"
      className="rounded-md border border-alerta/30 bg-alerta-fundo px-3 py-2 text-sm text-alerta"
    >
      {children}
    </p>
  )
}

/** Confirmação curta depois de salvar. Some na próxima navegação. */
export function MensagemOk({ children }: { children?: string }) {
  if (!children) return null
  return (
    <p className="rounded-md border border-ok/30 bg-ok-fundo px-3 py-2 text-sm text-ok">
      {children}
    </p>
  )
}
