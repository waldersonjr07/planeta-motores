'use client'

import { useState } from 'react'
import {
  COMPRIMENTOS,
  apenasDigitos,
  mascararCep,
  mascararDocumento,
  mascararTelefone,
} from '@/lib/mascaras'
import { Campo } from './campo'

const MASCARAS = {
  documento: { aplicar: mascararDocumento, tamanho: COMPRIMENTOS.documento },
  telefone: { aplicar: mascararTelefone, tamanho: COMPRIMENTOS.telefone },
  cep: { aplicar: mascararCep, tamanho: COMPRIMENTOS.cep },
} as const

export function CampoMascarado({
  mascara,
  defaultValue,
  ...props
}: {
  rotulo: string
  nome: string
  mascara: keyof typeof MASCARAS
  defaultValue?: string | null
  erro?: string
  className?: string
  required?: boolean
  placeholder?: string
}) {
  const { aplicar, tamanho } = MASCARAS[mascara]
  // O banco guarda só dígitos; a montagem pontua o que veio de lá.
  const [texto, setTexto] = useState(() => aplicar(defaultValue ?? ''))

  return (
    <Campo
      {...props}
      value={texto}
      maxLength={tamanho}
      inputMode="numeric"
      autoComplete="off"
      onChange={(evento) => {
        const digitado = evento.target.value
        const digitos = apenasDigitos(digitado)

        /*
         * Apagar em cima de um separador tira só o separador, e a máscara o
         * devolveria na hora — o backspace travaria. Quando o texto encurtou
         * mas os dígitos não, tiramos um dígito à mão.
         */
        const encurtou = digitado.length < texto.length
        const alvo =
          encurtou && digitos === apenasDigitos(texto)
            ? digitos.slice(0, -1)
            : digitos

        setTexto(aplicar(alvo))
      }}
    />
  )
}
