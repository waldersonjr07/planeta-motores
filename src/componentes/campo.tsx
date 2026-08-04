import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const CONTROLE =
  'w-full rounded-md border border-borda-forte bg-superficie px-3 py-2 text-sm placeholder:text-tinta-fraca'

type Base = { rotulo: string; nome: string; erro?: string; className?: string }

function Envelope({
  rotulo,
  erro,
  className = '',
  children,
}: {
  rotulo: string
  erro?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-tinta-suave">
        {rotulo}
      </span>
      {children}
      {erro && <span className="text-xs text-alerta">{erro}</span>}
    </label>
  )
}

export function Campo({
  rotulo,
  nome,
  erro,
  className,
  ...props
}: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Envelope rotulo={rotulo} erro={erro} className={className}>
      <input {...props} name={nome} className={CONTROLE} />
    </Envelope>
  )
}

export function CampoTexto({
  rotulo,
  nome,
  erro,
  className,
  ...props
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Envelope rotulo={rotulo} erro={erro} className={className}>
      <textarea {...props} name={nome} rows={props.rows ?? 3} className={CONTROLE} />
    </Envelope>
  )
}

export function CampoSelecao({
  rotulo,
  nome,
  erro,
  className,
  opcoes,
  children,
  ...props
}: Base &
  SelectHTMLAttributes<HTMLSelectElement> & {
    opcoes?: { valor: string; texto: string }[]
  }) {
  return (
    <Envelope rotulo={rotulo} erro={erro} className={className}>
      <select {...props} name={nome} className={CONTROLE}>
        {children}
        {opcoes?.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.texto}
          </option>
        ))}
      </select>
    </Envelope>
  )
}

/**
 * Formulário em grade de 12 colunas. Substitui o `flex flex-wrap` que fazia os
 * campos quebrarem em ordem imprevisível e o botão subir para o meio da linha.
 */
export function GradeFormulario({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`grid grid-cols-12 items-end gap-x-4 gap-y-4 ${className}`}>
      {children}
    </div>
  )
}
