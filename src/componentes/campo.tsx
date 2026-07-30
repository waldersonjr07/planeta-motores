import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const BORDA = 'rounded border border-gray-300 px-3 py-2 text-sm'

type Base = { rotulo: string; nome: string; erro?: string }

function Envelope({
  rotulo,
  erro,
  children,
}: {
  rotulo: string
  erro?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-700">{rotulo}</span>
      {children}
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </label>
  )
}

export function Campo({
  rotulo,
  nome,
  erro,
  ...props
}: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Envelope rotulo={rotulo} erro={erro}>
      <input {...props} name={nome} className={BORDA} />
    </Envelope>
  )
}

export function CampoTexto({
  rotulo,
  nome,
  erro,
  ...props
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Envelope rotulo={rotulo} erro={erro}>
      <textarea {...props} name={nome} rows={3} className={BORDA} />
    </Envelope>
  )
}

export function CampoSelecao({
  rotulo,
  nome,
  erro,
  opcoes,
  ...props
}: Base &
  SelectHTMLAttributes<HTMLSelectElement> & {
    opcoes: { valor: string; texto: string }[]
  }) {
  return (
    <Envelope rotulo={rotulo} erro={erro}>
      <select {...props} name={nome} className={BORDA}>
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.texto}
          </option>
        ))}
      </select>
    </Envelope>
  )
}
