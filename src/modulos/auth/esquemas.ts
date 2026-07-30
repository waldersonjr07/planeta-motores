import { z } from 'zod'
import { textoObrigatorio } from '@/lib/validacao'

export const entradaLogin = z.object({
  email: textoObrigatorio('E-mail').email('Informe um e-mail válido'),
  senha: textoObrigatorio('Senha'),
})
