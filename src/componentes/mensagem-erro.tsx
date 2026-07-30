export function MensagemErro({ children }: { children?: string }) {
  if (!children) return null
  return (
    <p role="alert" className="text-sm text-red-600">
      {children}
    </p>
  )
}
