# Formulários digitáveis, máscaras e PDFs — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendada) ou `superpowers:executing-plans` para executar tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** tirar o atrito de digitação de cinco formulários e dar aos três PDFs a identidade da Planeta Motores em formato de papelaria comercial brasileira.

**Arquitetura:** funções puras primeiro (`src/lib/`), depois os componentes de tela que as consomem (`src/componentes/`), depois a fiação de domínio (`src/modulos/`) e por último os PDFs. As seis frentes não se cruzam — a ordem existe para que cada tarefa comece com suas dependências prontas e testadas.

**Stack:** Next.js 15 (App Router) · TypeScript · Drizzle ORM · PostgreSQL 17 · Zod · Tailwind CSS v4 · `@react-pdf/renderer` · Vitest · Playwright

**Spec:** `docs/superpowers/specs/2026-08-11-formularios-digitaveis-mascaras-e-pdfs-design.md`

**Branch:** `formularios-digitaveis-mascaras-e-pdfs`

## Restrições globais

Valem para toda tarefa. Vêm do `README.md` e da spec.

- Nomes de arquivo, função, variável e coluna **em português**
- Dinheiro em **centavos inteiros**, nunca ponto flutuante
- Quantidades em `numeric(12,3)`
- Toda escrita passa por Server Action validada com Zod
- Server Action devolve `Resultado`, **não lança exceção** para a tela
- `acoes.ts` não contém regra de negócio
- Um módulo **não escreve tabela de outro** — chama função exportada pelo módulo dono
- Componente de cliente **não importa módulo de servidor** (`node:fs`, driver do Postgres)
- Campo opcional em Zod precisa de `.optional()`
- Saldo de estoque é a soma dos movimentos, nunca coluna editada
- **Não rode `npm run build` nem `npm run teste:e2e` com o `npm run dev` ligado** — os três escrevem no mesmo `.next` e a aplicação passa a devolver 500 com `Cannot find module './XXX.js'`. Se acontecer: pare o servidor, apague `.next`, suba de novo
- Mensagem de commit em português imperativo, **sem acentos** (padrão do repositório), terminando com a linha `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- Banco de desenvolvimento: `.\scripts\banco-local.ps1 start` antes de qualquer teste de integração

## Estrutura de arquivos

**Criar:**

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/texto.ts` | `normalizarTexto` — comparação sem acento e sem caixa. Puro, usado por tela e servidor |
| `src/lib/mascaras.ts` | `apenasDigitos`, `mascararDocumento`, `mascararTelefone`, `mascararCep`, `COMPRIMENTOS`. Puro, sem React, sem Zod |
| `src/lib/extenso.ts` | `valorPorExtenso` para o recibo. Puro |
| `src/componentes/campo-mascarado.tsx` | Input controlado que aplica máscara enquanto digita |
| `src/componentes/campo-combo.tsx` | Combobox com filtro e opção de cadastrar na hora |
| `testes/unidade/texto.test.ts` | |
| `testes/unidade/mascaras.test.ts` | |
| `testes/unidade/extenso.test.ts` | |
| `testes/integracao/compras-cadastro-na-hora.test.ts` | |
| `testes/e2e/mascaras.spec.ts` | |
| `testes/e2e/os-cadastro-rapido.spec.ts` | |

**Modificar:** `src/lib/validacao.ts`, `src/lib/resultado.ts`, `src/db/schema/clientes.ts`, `src/db/schema/financeiro.ts`, `src/modulos/clientes/equipamentos-descricao.ts`, `src/modulos/clientes/equipamentos-esquemas.ts`, `src/modulos/clientes/equipamentos-consultas.ts`, `src/modulos/clientes/equipamentos-operacoes.ts`, `src/modulos/os/esquemas.ts`, `src/modulos/os/acoes.ts`, `src/modulos/os/operacoes.ts`, `src/modulos/financeiro/esquemas.ts`, `src/modulos/catalogo/pecas-operacoes.ts`, `src/modulos/catalogo/fornecedores-operacoes.ts`, `src/modulos/compras/esquemas.ts`, `src/modulos/compras/operacoes.ts`, `src/modulos/compras/acoes.ts`, `src/modulos/documentos/componentes.tsx`, `src/modulos/documentos/pdf.tsx`, e os formulários de tela listados em cada tarefa.

---

### Task 1: Máscaras e normalização de texto (funções puras)

Base de tudo que vem depois. Nada de React aqui — são funções de texto testáveis sozinhas.

**Arquivos:**
- Criar: `src/lib/texto.ts`
- Criar: `src/lib/mascaras.ts`
- Modificar: `src/lib/validacao.ts` (move `apenasDigitos` para `mascaras.ts` e reexporta)
- Criar: `testes/unidade/texto.test.ts`
- Criar: `testes/unidade/mascaras.test.ts`

**Interfaces:**
- Consome: nada
- Produz:
  - `normalizarTexto(valor: string): string`
  - `apenasDigitos(valor: string): string`
  - `mascararDocumento(valor: string): string`
  - `mascararTelefone(valor: string): string`
  - `mascararCep(valor: string): string`
  - `COMPRIMENTOS: { documento: 18; telefone: 15; cep: 9 }`

**Por que mover `apenasDigitos`:** ele hoje mora em `validacao.ts`, que importa Zod. `campo-mascarado.tsx` é componente de cliente; importar `validacao.ts` arrastaria Zod para o pacote do navegador sem necessidade. `mascaras.ts` fica sem dependência nenhuma.

- [ ] **Passo 1: Escrever os testes que falham**

`testes/unidade/texto.test.ts`:

```ts
import { expect, test } from 'vitest'
import { normalizarTexto } from '../../src/lib/texto'

test('normalizarTexto tira acento, caixa e bordas', () => {
  expect(normalizarTexto('  Óleo 2T  ')).toBe('oleo 2t')
  expect(normalizarTexto('VELA NGK')).toBe('vela ngk')
  expect(normalizarTexto('Bujão')).toBe('bujao')
})

test('normalizarTexto deixa vazio quem só tem espaço', () => {
  expect(normalizarTexto('   ')).toBe('')
})
```

`testes/unidade/mascaras.test.ts`:

```ts
import { expect, test } from 'vitest'
import {
  apenasDigitos,
  mascararCep,
  mascararDocumento,
  mascararTelefone,
} from '../../src/lib/mascaras'

test('apenasDigitos remove pontuação', () => {
  expect(apenasDigitos('123.456.789-00')).toBe('12345678900')
})

test('o documento pontua o CPF conforme se digita', () => {
  expect(mascararDocumento('')).toBe('')
  expect(mascararDocumento('12')).toBe('12')
  expect(mascararDocumento('123')).toBe('123.')
  expect(mascararDocumento('1234')).toBe('123.4')
  expect(mascararDocumento('123456')).toBe('123.456.')
  expect(mascararDocumento('123456789')).toBe('123.456.789-')
  expect(mascararDocumento('12345678901')).toBe('123.456.789-01')
})

test('o documento vira CNPJ ao passar do 11º dígito', () => {
  expect(mascararDocumento('123456789012')).toBe('12.345.678/9012-')
  expect(mascararDocumento('12345678000190')).toBe('12.345.678/0001-90')
})

test('o documento trunca em 14 dígitos', () => {
  expect(mascararDocumento('123456780001901234')).toBe('12.345.678/0001-90')
})

test('o telefone abre o parêntese e fecha no segundo dígito', () => {
  expect(mascararTelefone('')).toBe('')
  expect(mascararTelefone('1')).toBe('(1')
  expect(mascararTelefone('12')).toBe('(12) ')
  expect(mascararTelefone('123')).toBe('(12) 3')
})

test('o celular de 9 dígitos põe o traço depois do quinto', () => {
  expect(mascararTelefone('12345678910')).toBe('(12) 34567-8910')
})

test('o fixo de 8 dígitos põe o traço depois do quarto', () => {
  expect(mascararTelefone('1234567890')).toBe('(12) 3456-7890')
})

test('o telefone acomoda o traço enquanto se digita', () => {
  expect(mascararTelefone('123456')).toBe('(12) 3456')
  expect(mascararTelefone('1234567')).toBe('(12) 3456-7')
  expect(mascararTelefone('123456789')).toBe('(12) 3456-789')
})

test('o telefone trunca em 11 dígitos', () => {
  expect(mascararTelefone('123456789012345')).toBe('(12) 34567-8901')
})

test('a máscara aceita texto já pontuado, sem duplicar', () => {
  expect(mascararTelefone('(12) 34567-8910')).toBe('(12) 34567-8910')
  expect(mascararDocumento('123.456.789-01')).toBe('123.456.789-01')
})

test('o CEP pontua depois do quinto dígito', () => {
  expect(mascararCep('12345')).toBe('12345-')
  expect(mascararCep('12345678')).toBe('12345-678')
})
```

- [ ] **Passo 2: Rodar e confirmar a falha**

```powershell
npm test -- testes/unidade/texto.test.ts testes/unidade/mascaras.test.ts
```

Esperado: FAIL — `Failed to resolve import "../../src/lib/texto"`.

- [ ] **Passo 3: Escrever `src/lib/texto.ts`**

```ts
/**
 * Forma canônica para comparar nome digitado com nome cadastrado. Sem isso,
 * "Óleo 2T" e "oleo 2t" virariam duas peças diferentes no cadastro na hora.
 */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    // `\p{Diacritic}` em vez da faixa U+0300–U+036F escrita à mão: o padrão
    // fica todo em ASCII, sem caractere combinante invisível no arquivo.
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
}
```

- [ ] **Passo 4: Escrever `src/lib/mascaras.ts`**

```ts
export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

/**
 * Comprimento do texto já pontuado. Serve de `maxLength` no input, para o
 * navegador barrar o dígito excedente antes de a máscara ver.
 */
export const COMPRIMENTOS = { documento: 18, telefone: 15, cep: 9 } as const

/*
 * Regra comum às três: o separador entra assim que o grupo anterior fecha, e
 * não quando o próximo dígito chega. É o que faz o próximo dígito já cair
 * depois do ponto em vez de empurrá-lo.
 */

function mascararCpf(d: string): string {
  let saida = d.slice(0, 3)
  if (d.length >= 3) saida += '.'
  if (d.length > 3) saida += d.slice(3, 6)
  if (d.length >= 6) saida += '.'
  if (d.length > 6) saida += d.slice(6, 9)
  if (d.length >= 9) saida += '-'
  if (d.length > 9) saida += d.slice(9, 11)
  return saida
}

function mascararCnpj(d: string): string {
  let saida = d.slice(0, 2)
  if (d.length >= 2) saida += '.'
  if (d.length > 2) saida += d.slice(2, 5)
  if (d.length >= 5) saida += '.'
  if (d.length > 5) saida += d.slice(5, 8)
  if (d.length >= 8) saida += '/'
  if (d.length > 8) saida += d.slice(8, 12)
  if (d.length >= 12) saida += '-'
  if (d.length > 12) saida += d.slice(12, 14)
  return saida
}

/** CPF até 11 dígitos; do 12º em diante se reorganiza como CNPJ. */
export function mascararDocumento(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 14)
  return d.length <= 11 ? mascararCpf(d) : mascararCnpj(d)
}

/**
 * Celular tem 9 dígitos fora o DDD; fixo tem 8. Como só o comprimento
 * distingue os dois, o traço fica na posição de fixo até o 11º dígito chegar.
 */
export function mascararTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11)
  if (d.length === 0) return ''

  let saida = `(${d.slice(0, 2)}`
  if (d.length >= 2) saida += ') '
  if (d.length > 2) {
    const corte = d.length > 10 ? 7 : 6
    saida += d.slice(2, corte)
    if (d.length > corte) saida += `-${d.slice(corte)}`
  }
  return saida
}

export function mascararCep(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8)
  let saida = d.slice(0, 5)
  if (d.length >= 5) saida += '-'
  if (d.length > 5) saida += d.slice(5, 8)
  return saida
}
```

- [ ] **Passo 5: Reexportar `apenasDigitos` de `validacao.ts`**

Em `src/lib/validacao.ts`, apagar a definição local e trocar o topo do arquivo por:

```ts
import { z } from 'zod'
import { apenasDigitos } from './mascaras'

// Reexportado para não quebrar quem já importava daqui.
export { apenasDigitos }
```

O resto do arquivo fica igual.

- [ ] **Passo 6: Rodar os testes**

```powershell
npm test -- testes/unidade/texto.test.ts testes/unidade/mascaras.test.ts testes/unidade/validacao.test.ts
```

Esperado: PASS nos três. `validacao.test.ts` importa `apenasDigitos` de `validacao` e precisa continuar passando pela reexportação.

- [ ] **Passo 7: Commit**

```bash
git add src/lib/texto.ts src/lib/mascaras.ts src/lib/validacao.ts testes/unidade/texto.test.ts testes/unidade/mascaras.test.ts
git commit -m "Adiciona mascaras de documento, telefone e CEP

Funcoes puras, sem React e sem Zod, para o componente de cliente poder
importar sem arrastar Zod para o pacote do navegador. apenasDigitos sai de
validacao.ts e volta reexportado, mantendo quem ja importava de la.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Valor por extenso (função pura)

Usado só pelo recibo, na Task 13. Fica aqui porque é puro e independente.

**Arquivos:**
- Criar: `src/lib/extenso.ts`
- Criar: `testes/unidade/extenso.test.ts`

**Interfaces:**
- Consome: nada
- Produz: `valorPorExtenso(centavos: number): string`

- [ ] **Passo 1: Escrever o teste que falha**

`testes/unidade/extenso.test.ts`:

```ts
import { expect, test } from 'vitest'
import { valorPorExtenso } from '../../src/lib/extenso'

test('zero e singular', () => {
  expect(valorPorExtenso(0)).toBe('zero real')
  expect(valorPorExtenso(100)).toBe('um real')
  expect(valorPorExtenso(200)).toBe('dois reais')
})

test('centavos sozinhos', () => {
  expect(valorPorExtenso(1)).toBe('um centavo')
  expect(valorPorExtenso(50)).toBe('cinquenta centavos')
})

test('reais e centavos juntos', () => {
  expect(valorPorExtenso(22050)).toBe('duzentos e vinte reais e cinquenta centavos')
  expect(valorPorExtenso(10101)).toBe('cento e um reais e um centavo')
})

test('cem contra cento', () => {
  expect(valorPorExtenso(10000)).toBe('cem reais')
  expect(valorPorExtenso(12000)).toBe('cento e vinte reais')
})

test('mil não leva "um" na frente', () => {
  expect(valorPorExtenso(100000)).toBe('mil reais')
  expect(valorPorExtenso(200000)).toBe('dois mil reais')
})

test('o "e" só entra antes de resto menor que cem ou centena redonda', () => {
  expect(valorPorExtenso(150000)).toBe('mil e quinhentos reais')
  expect(valorPorExtenso(101000)).toBe('mil e dez reais')
  expect(valorPorExtenso(235000)).toBe('dois mil trezentos e cinquenta reais')
})

test('milhão no singular e no plural', () => {
  expect(valorPorExtenso(100000000)).toBe('um milhão de reais')
  expect(valorPorExtenso(200000000)).toBe('dois milhões de reais')
})

test('dezena de onze a dezenove', () => {
  expect(valorPorExtenso(1500)).toBe('quinze reais')
  expect(valorPorExtenso(1700)).toBe('dezessete reais')
})
```

- [ ] **Passo 2: Rodar e confirmar a falha**

```powershell
npm test -- testes/unidade/extenso.test.ts
```

Esperado: FAIL — `Failed to resolve import "../../src/lib/extenso"`.

- [ ] **Passo 3: Escrever `src/lib/extenso.ts`**

```ts
const UNIDADES = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
]
const DEZ_A_DEZENOVE = [
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis',
  'dezessete', 'dezoito', 'dezenove',
]
const DEZENAS = [
  '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta',
  'oitenta', 'noventa',
]
const CENTENAS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
]

function ateNovecentos(n: number): string {
  // "cem" é exato; 101 em diante vira "cento e …".
  if (n === 100) return 'cem'

  const partes: string[] = []
  const centena = Math.floor(n / 100)
  const resto = n % 100
  if (centena > 0) partes.push(CENTENAS[centena])

  if (resto >= 10 && resto <= 19) {
    partes.push(DEZ_A_DEZENOVE[resto - 10])
  } else {
    const dezena = Math.floor(resto / 10)
    const unidade = resto % 10
    const sub: string[] = []
    if (dezena > 0) sub.push(DEZENAS[dezena])
    if (unidade > 0) sub.push(UNIDADES[unidade])
    if (sub.length > 0) partes.push(sub.join(' e '))
  }

  return partes.join(' e ')
}

/**
 * O "e" antes do último grupo só entra quando o resto é menor que cem ou é
 * centena redonda: "mil e quinhentos", mas "dois mil trezentos e cinquenta".
 */
function ligar(resto: number): string {
  return resto < 100 || resto % 100 === 0 ? ' e ' : ' '
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return 'zero'
  if (n < 1000) return ateNovecentos(n)

  if (n < 1_000_000) {
    const milhares = Math.floor(n / 1000)
    const resto = n % 1000
    // "mil", não "um mil".
    const cabeca = milhares === 1 ? 'mil' : `${ateNovecentos(milhares)} mil`
    return resto === 0 ? cabeca : cabeca + ligar(resto) + ateNovecentos(resto)
  }

  const milhoes = Math.floor(n / 1_000_000)
  const resto = n % 1_000_000
  const cabeca =
    milhoes === 1 ? 'um milhão' : `${ateNovecentos(milhoes)} milhões`
  return resto === 0 ? cabeca : cabeca + ligar(resto) + inteiroPorExtenso(resto)
}

/**
 * O valor por extenso do recibo, como manda o costume brasileiro. Recebe
 * centavos inteiros, como todo dinheiro no sistema.
 */
export function valorPorExtenso(centavos: number): string {
  const absoluto = Math.abs(Math.trunc(centavos))
  const inteiro = Math.floor(absoluto / 100)
  const fracao = absoluto % 100

  if (inteiro === 0 && fracao === 0) return 'zero real'

  const parteCentavos =
    fracao === 1 ? 'um centavo' : `${inteiroPorExtenso(fracao)} centavos`
  if (inteiro === 0) return parteCentavos

  // Milhão redondo pede "de reais": "um milhão de reais".
  const conector =
    inteiro >= 1_000_000 && inteiro % 1_000_000 === 0 ? ' de reais' : ' reais'
  const parteReais =
    inteiro === 1 ? 'um real' : inteiroPorExtenso(inteiro) + conector

  return fracao === 0 ? parteReais : `${parteReais} e ${parteCentavos}`
}
```

- [ ] **Passo 4: Rodar o teste**

```powershell
npm test -- testes/unidade/extenso.test.ts
```

Esperado: PASS, 8 testes.

- [ ] **Passo 5: Commit**

```bash
git add src/lib/extenso.ts testes/unidade/extenso.test.ts
git commit -m "Adiciona valor por extenso para o recibo

Costume de recibo no Brasil. Cobre singular de real, centavos sozinhos,
cem contra cento, mil sem 'um' na frente e milhao com 'de reais'.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Componente de campo mascarado

**Arquivos:**
- Criar: `src/componentes/campo-mascarado.tsx`
- Modificar: `src/app/(app)/ordens-servico/nova/formulario.tsx`
- Modificar: `src/app/(app)/clientes/formulario.tsx`
- Modificar: `src/app/(app)/catalogo/fornecedores/formulario.tsx`
- Modificar: `src/app/(app)/configuracoes/formulario.tsx`
- Criar: `testes/e2e/mascaras.spec.ts`

**Interfaces:**
- Consome: `mascararDocumento`, `mascararTelefone`, `mascararCep`, `apenasDigitos`, `COMPRIMENTOS` (Task 1); `Campo` de `src/componentes/campo.tsx`
- Produz: `CampoMascarado` com as props `rotulo`, `nome`, `mascara: 'documento' | 'telefone' | 'cep'`, `defaultValue?`, `erro?`, `className?`, `required?`

**O servidor não muda.** `documentoOpcional`, `telefoneOpcional` e `cepOpcional` já passam por `apenasDigitos` antes de validar, então a pontuação é descartada e o banco continua guardando só dígitos.

- [ ] **Passo 1: Escrever o componente**

`src/componentes/campo-mascarado.tsx`:

```tsx
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
```

- [ ] **Passo 2: Trocar os campos no cadastro rápido**

Em `src/app/(app)/ordens-servico/nova/formulario.tsx`, acrescentar o import:

```tsx
import { CampoMascarado } from '@/componentes/campo-mascarado'
```

E substituir os dois campos do cadastro rápido:

```tsx
<CampoMascarado
  rotulo="CPF/CNPJ"
  nome="documentoCliente"
  mascara="documento"
  className="col-span-3"
  erro={campos.documentoCliente}
/>
<CampoMascarado
  rotulo="Telefone"
  nome="telefoneCliente"
  mascara="telefone"
  className="col-span-3"
  erro={campos.telefoneCliente}
/>
```

- [ ] **Passo 3: Trocar os campos das outras três telas**

Ler cada arquivo antes de editar e trocar apenas os campos abaixo, mantendo `rotulo`, `nome`, `className` e `erro` exatamente como já estão:

| Arquivo | Campos |
|---|---|
| `src/app/(app)/clientes/formulario.tsx` | `documento` → `mascara="documento"`; `telefone` → `mascara="telefone"`; `cep` → `mascara="cep"` |
| `src/app/(app)/catalogo/fornecedores/formulario.tsx` | `telefone` → `mascara="telefone"` |
| `src/app/(app)/configuracoes/formulario.tsx` | `empresaCnpj` → `mascara="documento"`; `empresaTelefone` → `mascara="telefone"` |

Onde houver `defaultValue` vindo do banco, passar igual — o componente pontua na montagem.

- [ ] **Passo 4: Escrever o teste ponta a ponta**

`testes/e2e/mascaras.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { prepararSessao } from './ajuda'

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)
})

test('o CPF ganha ponto e traço conforme se digita', async ({ page }) => {
  await page.goto('/clientes/novo')
  const documento = page.getByLabel('CPF/CNPJ')

  await documento.pressSequentially('123')
  await expect(documento).toHaveValue('123.')

  await documento.pressSequentially('45678901')
  await expect(documento).toHaveValue('123.456.789-01')
})

test('o documento vira CNPJ ao passar do 11º dígito', async ({ page }) => {
  await page.goto('/clientes/novo')
  const documento = page.getByLabel('CPF/CNPJ')

  await documento.pressSequentially('12345678000190')
  await expect(documento).toHaveValue('12.345.678/0001-90')
})

test('o telefone abre parêntese e põe traço antes dos 4 últimos', async ({ page }) => {
  await page.goto('/clientes/novo')
  const telefone = page.getByLabel('Telefone')

  await telefone.pressSequentially('12')
  await expect(telefone).toHaveValue('(12) ')

  await telefone.pressSequentially('345678910')
  await expect(telefone).toHaveValue('(12) 34567-8910')
})

test('backspace apaga o dígito, não trava no separador', async ({ page }) => {
  await page.goto('/clientes/novo')
  const documento = page.getByLabel('CPF/CNPJ')

  await documento.pressSequentially('123')
  await expect(documento).toHaveValue('123.')

  await documento.press('Backspace')
  await expect(documento).toHaveValue('12')
})

test('o cliente é gravado com o documento pontuado na tela', async ({ page }) => {
  await page.goto('/clientes/novo')
  await page.getByLabel('Nome').fill('João da Silva')
  await page.getByLabel('CPF/CNPJ').pressSequentially('12345678901')
  await page.getByLabel('Telefone').pressSequentially('12345678910')
  await page.getByRole('button', { name: /Salvar|Cadastrar/ }).click()

  await expect(page.getByText('João da Silva')).toBeVisible()
})
```

- [ ] **Passo 5: Rodar o teste ponta a ponta**

Confirmar que o `npm run dev` está **parado**, então:

```powershell
npm run teste:e2e -- testes/e2e/mascaras.spec.ts
```

Esperado: PASS, 5 testes. Se o último falhar por causa do rótulo do botão, abrir `src/app/(app)/clientes/formulario.tsx`, ler o texto real do botão e ajustar o seletor.

- [ ] **Passo 6: Rodar a suíte inteira e o build**

```powershell
npm test
npm run build
```

Esperado: os 206 testes passam e o build compila. O build é o que pega erro de tipo — o `next dev` não faz verificação de tipos.

- [ ] **Passo 7: Commit**

```bash
git add src/componentes/campo-mascarado.tsx "src/app/(app)" testes/e2e/mascaras.spec.ts
git commit -m "Mascara CPF/CNPJ, telefone e CEP enquanto se digita

O ponto, a barra e o traco entram assim que o grupo anterior fecha, e o
parentese do DDD fecha no segundo digito. Backspace sobre separador apaga o
digito anterior, senao travaria. O servidor nao muda: apenasDigitos ja
limpava a pontuacao antes de validar.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Coluna `aplicacao_outra` e descrição do equipamento

**Arquivos:**
- Modificar: `src/db/schema/clientes.ts`
- Modificar: `src/modulos/clientes/equipamentos-descricao.ts`
- Modificar: `src/modulos/clientes/equipamentos-esquemas.ts`
- Modificar: `src/modulos/clientes/equipamentos-consultas.ts:43-65`
- Modificar: `src/modulos/os/esquemas.ts:25-45`
- Modificar: `src/modulos/os/operacoes.ts` (repassar o campo no cadastro rápido)
- Modificar: `testes/unidade/equipamentos-descricao.test.ts`
- Modificar: `testes/integracao/equipamentos.test.ts`
- Criar: migração em `drizzle/`

**Interfaces:**
- Consome: nada das tarefas anteriores
- Produz: coluna `equipamentos.aplicacao_outra`; `descreverEquipamento` passando a aceitar `aplicacaoOutra?: string | null`; `entradaEquipamento` e `entradaOsRapida` com o campo `aplicacaoOutra` e a regra de obrigatoriedade

- [ ] **Passo 1: Escrever os testes que falham**

Acrescentar em `testes/unidade/equipamentos-descricao.test.ts`:

```ts
test('a máquina "outro" é descrita pelo que foi digitado', () => {
  expect(
    descreverEquipamento({
      aplicacao: 'outro',
      aplicacaoOutra: 'Cortador de grama',
      marca: 'Husqvarna',
      modelo: '236',
      tipoMotor: '2T',
    }),
  ).toBe('Cortador de grama Husqvarna 236 (2T)')
})

test('sem o texto, "outro" continua saindo como Outro', () => {
  expect(
    descreverEquipamento({
      aplicacao: 'outro',
      aplicacaoOutra: null,
      marca: null,
      modelo: null,
      tipoMotor: '4T',
    }),
  ).toBe('Outro (4T)')
})

test('aplicação da lista ignora o texto de "outro"', () => {
  expect(
    descreverEquipamento({
      aplicacao: 'motosserra',
      aplicacaoOutra: 'Cortador de grama',
      marca: 'Stihl',
      modelo: null,
      tipoMotor: '2T',
    }),
  ).toBe('Motosserra Stihl (2T)')
})
```

Acrescentar em `testes/integracao/equipamentos.test.ts`:

```ts
test('equipamento "outro" sem dizer qual é reprovado', () => {
  const analise = entradaEquipamento.safeParse({
    clienteId: '00000000-0000-0000-0000-000000000001',
    tipoMotor: '2T',
    aplicacao: 'outro',
  })

  expect(analise.success).toBe(false)
  if (analise.success) return
  expect(analise.error.issues[0].path).toEqual(['aplicacaoOutra'])
  expect(analise.error.issues[0].message).toBe('Diga qual é a máquina')
})

test('trocar de "outro" para a lista descarta o texto', () => {
  const analise = entradaEquipamento.safeParse({
    clienteId: '00000000-0000-0000-0000-000000000001',
    tipoMotor: '2T',
    aplicacao: 'motosserra',
    aplicacaoOutra: 'Cortador de grama',
  })

  expect(analise.success).toBe(true)
  if (!analise.success) return
  expect(analise.data.aplicacaoOutra).toBeNull()
})
```

Garantir que `entradaEquipamento` está importado no topo do arquivo de integração.

- [ ] **Passo 2: Rodar e confirmar a falha**

```powershell
.\scripts\banco-local.ps1 start
npm test -- testes/unidade/equipamentos-descricao.test.ts testes/integracao/equipamentos.test.ts
```

Esperado: FAIL — o objeto passado a `descreverEquipamento` não aceita `aplicacaoOutra`, e a validação aprova "outro" sem texto.

- [ ] **Passo 3: Acrescentar a coluna no schema**

Em `src/db/schema/clientes.ts`, dentro de `equipamentos`, logo abaixo de `aplicacao`:

```ts
  /** O que é a máquina quando `aplicacao` é 'outro'. Nula nas demais. */
  aplicacaoOutra: text('aplicacao_outra'),
```

- [ ] **Passo 4: Gerar e aplicar a migração**

```powershell
npm run banco:gerar
npm run banco:aplicar
```

Conferir o SQL gerado em `drizzle/` — deve ser um `ALTER TABLE "equipamentos" ADD COLUMN "aplicacao_outra" text;` e nada além disso.

- [ ] **Passo 5: Atualizar `descreverEquipamento`**

Substituir a função em `src/modulos/clientes/equipamentos-descricao.ts`:

```ts
/** Uma linha para identificar o equipamento em lista, PDF e mensagem. */
export function descreverEquipamento(equipamento: {
  aplicacao: Aplicacao
  aplicacaoOutra?: string | null
  marca: string | null
  modelo: string | null
  tipoMotor: TipoMotor
}): string {
  // "Outro Husqvarna 236" não diz o que é a máquina; o texto digitado diz.
  const nome =
    equipamento.aplicacao === 'outro' && equipamento.aplicacaoOutra
      ? equipamento.aplicacaoOutra
      : APLICACOES[equipamento.aplicacao]

  const partes = [nome, equipamento.marca, equipamento.modelo].filter(
    (parte): parte is string => Boolean(parte),
  )

  return `${partes.join(' ')} (${equipamento.tipoMotor})`
}
```

- [ ] **Passo 6: Levar a coluna ao seletor da nova OS**

Em `src/modulos/clientes/equipamentos-consultas.ts`, dentro do `.select({…})` de `listarEquipamentosParaSelecao`, acrescentar depois de `aplicacao`:

```ts
      aplicacaoOutra: equipamentos.aplicacaoOutra,
```

Sem isso a descrição no seletor da nova OS voltaria a mostrar "Outro" — a consulta escolhe colunas uma a uma.

- [ ] **Passo 7: Exigir o texto na validação**

Em `src/modulos/clientes/equipamentos-esquemas.ts`, substituir o esquema:

```ts
export const entradaEquipamento = z
  .object({
    clienteId: z.string().uuid('Selecione o cliente'),
    tipoMotor: z.enum(['2T', '4T']),
    aplicacao: z.enum([
      'rocadeira',
      'motosserra',
      'motobomba',
      'gerador',
      'soprador',
      'outro',
    ]),
    aplicacaoOutra: opcional,
    marca: opcional,
    modelo: opcional,
    numeroSerie: opcional,
    observacoes: opcional,
  })
  .superRefine((dados, ctx) => {
    // Sem isso o cadastro acumula equipamento "Outro" que ninguém identifica.
    if (dados.aplicacao === 'outro' && !dados.aplicacaoOutra) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['aplicacaoOutra'],
        message: 'Diga qual é a máquina',
      })
    }
  })
  .transform((dados) => ({
    ...dados,
    // Trocou "Outro" por uma aplicação da lista: o texto anterior não fica.
    aplicacaoOutra: dados.aplicacao === 'outro' ? dados.aplicacaoOutra : null,
  }))
```

Aplicar a mesma adição de campo, `superRefine` e `transform` em `entradaOsRapida`, em `src/modulos/os/esquemas.ts`.

- [ ] **Passo 8: Repassar o campo na criação**

Em `src/modulos/os/operacoes.ts`, na função `criarOsComClienteNovo`, incluir `aplicacaoOutra: entrada.aplicacaoOutra` no objeto do equipamento. Ler a função antes de editar e seguir a forma dos campos vizinhos (`marca`, `modelo`).

- [ ] **Passo 9: Rodar os testes**

```powershell
npm test -- testes/unidade/equipamentos-descricao.test.ts testes/integracao/equipamentos.test.ts testes/integracao/os-cliente-novo.test.ts
```

Esperado: PASS. Se `os-cliente-novo.test.ts` quebrar, é porque monta um equipamento "outro" sem texto — ajustar o caso de teste para a regra nova.

- [ ] **Passo 10: Commit**

```bash
git add src/db/schema/clientes.ts src/modulos/clientes src/modulos/os drizzle testes/unidade/equipamentos-descricao.test.ts testes/integracao/equipamentos.test.ts
git commit -m "Guarda o que e a maquina quando a aplicacao e Outro

Coluna aplicacao_outra em equipamentos, exigida quando a aplicacao e outro.
descreverEquipamento passa a usar o texto no lugar da palavra Outro, o que
corrige tela, PDF e mensagem de WhatsApp de uma vez.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Campo "Qual máquina?" nas telas

**Arquivos:**
- Modificar: `src/app/(app)/ordens-servico/nova/formulario.tsx`
- Modificar: `src/app/(app)/clientes/[id]/equipamento-formulario.tsx`

**Interfaces:**
- Consome: `entradaEquipamento` e `entradaOsRapida` com `aplicacaoOutra` (Task 4)
- Produz: campo `aplicacaoOutra` nos dois formulários, visível só quando a aplicação escolhida é "outro"

- [ ] **Passo 1: Revelar o campo no cadastro rápido**

Em `src/app/(app)/ordens-servico/nova/formulario.tsx`, acrescentar o estado abaixo do `clienteNovo` que já existe:

```tsx
const [aplicacaoOutro, setAplicacaoOutro] = useState(false)
```

Trocar o `CampoSelecao` da máquina por:

```tsx
<CampoSelecao
  rotulo="Máquina"
  nome="aplicacao"
  className="col-span-3"
  onChange={(evento) => setAplicacaoOutro(evento.target.value === 'outro')}
  opcoes={Object.entries(APLICACOES).map(([valor, texto]) => ({
    valor,
    texto,
  }))}
/>

{aplicacaoOutro && (
  <Campo
    rotulo="Qual máquina?"
    nome="aplicacaoOutra"
    required
    className="col-span-4"
    placeholder="Cortador de grama, compactador…"
    erro={campos.aplicacaoOutra}
  />
)}
```

O campo entra na mesma `GradeFormulario` dos demais, logo depois do seletor.

- [ ] **Passo 2: Fazer o mesmo na ficha do equipamento**

Ler `src/app/(app)/clientes/[id]/equipamento-formulario.tsx` e aplicar a mesma mudança: estado `aplicacaoOutro`, `onChange` no seletor de aplicação e o `Campo` condicional. O valor inicial do estado precisa considerar o equipamento em edição:

```tsx
const [aplicacaoOutro, setAplicacaoOutro] = useState(
  equipamento?.aplicacao === 'outro',
)
```

Se o componente não recebe um equipamento para edição, iniciar com `false`.

- [ ] **Passo 3: Conferir na tela**

```powershell
.\scripts\iniciar.ps1
```

Abrir `http://localhost:3000/ordens-servico/nova`, escolher "Cliente novo (digitar)", trocar Máquina para "Outro" e confirmar que o campo aparece; voltar para "Motosserra" e confirmar que some. Parar o servidor depois.

- [ ] **Passo 4: Rodar o build**

```powershell
npm run build
```

Esperado: compila sem erro de tipo.

- [ ] **Passo 5: Commit**

```bash
git add "src/app/(app)/ordens-servico/nova/formulario.tsx" "src/app/(app)/clientes/[id]/equipamento-formulario.tsx"
git commit -m "Abre o campo Qual maquina ao escolher Outro

No cadastro rapido da OS e na ficha do equipamento.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Formulário que não apaga no erro

**Arquivos:**
- Modificar: `src/lib/resultado.ts`
- Modificar: `src/modulos/os/acoes.ts:34-70`
- Modificar: `src/app/(app)/ordens-servico/nova/formulario.tsx`
- Modificar: `testes/unidade/resultado.test.ts`
- Criar: `testes/e2e/os-cadastro-rapido.spec.ts`

**Interfaces:**
- Consome: campo `aplicacaoOutra` no formulário (Task 5)
- Produz: `Resultado` de falha com `valores?: Record<string, string>`; `falhaDeValidacao(erro, valores?)`

**Causa do defeito:** não é a validação. É o React 19, que reseta os campos não controlados assim que a ação de um `<form action={…}>` termina — dando erro ou não. O `useActionState` devolve os erros certos; o que se perde são os valores no DOM.

- [ ] **Passo 1: Escrever o teste de unidade que falha**

Acrescentar em `testes/unidade/resultado.test.ts`:

```ts
test('falhaDeValidacao devolve o que foi digitado quando recebe os valores', () => {
  const esquema = z.object({ nome: z.string().min(1, 'Nome é obrigatório') })
  const analise = esquema.safeParse({ nome: '' })
  if (analise.success) throw new Error('deveria falhar')

  const r = falhaDeValidacao(analise.error, { nome: '', telefone: '11999998888' })

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.campos?.nome).toBe('Nome é obrigatório')
  expect(r.valores?.telefone).toBe('11999998888')
})

test('falhaDeValidacao sem valores não inclui a chave', () => {
  const esquema = z.object({ nome: z.string().min(1, 'Nome é obrigatório') })
  const analise = esquema.safeParse({ nome: '' })
  if (analise.success) throw new Error('deveria falhar')

  const r = falhaDeValidacao(analise.error)

  expect(r.ok).toBe(false)
  if (r.ok) return
  expect(r.valores).toBeUndefined()
})
```

Garantir que `z` e `falhaDeValidacao` estão importados no topo do arquivo.

- [ ] **Passo 2: Rodar e confirmar a falha**

```powershell
npm test -- testes/unidade/resultado.test.ts
```

Esperado: FAIL — `falhaDeValidacao` aceita um argumento só e `valores` não existe no tipo.

- [ ] **Passo 3: Estender `Resultado`**

Substituir em `src/lib/resultado.ts`:

```ts
export type Resultado<T> =
  | { ok: true; dados: T }
  | {
      ok: false
      erro: string
      campos?: Record<string, string>
      /**
       * Eco do que foi enviado. O React 19 reseta o formulário quando a ação
       * termina, então o valor só volta à tela se a própria ação o devolver.
       */
      valores?: Record<string, string>
    }
```

E a função:

```ts
export function falhaDeValidacao(
  erro: ZodError,
  valores?: Record<string, string>,
): Resultado<never> {
  const campos: Record<string, string> = {}
  for (const problema of erro.issues) {
    const campo = problema.path.join('.')
    if (campo && !(campo in campos)) campos[campo] = problema.message
  }
  return {
    ok: false,
    erro: 'Confira os campos destacados.',
    campos,
    ...(valores ? { valores } : {}),
  }
}
```

- [ ] **Passo 4: Devolver os valores na ação da OS**

Em `src/modulos/os/acoes.ts`, na `acaoCriarOs`, trocar as duas chamadas de `falhaDeValidacao(analise.error)` por `falhaDeValidacao(analise.error, dados)`. O `dados` já é montado logo acima pela função `objeto(formulario)`.

- [ ] **Passo 5: Repor os valores no formulário**

Em `src/app/(app)/ordens-servico/nova/formulario.tsx`, acrescentar `Fragment` e `useEffect` aos imports do React e, abaixo da linha do `campos`:

```tsx
const valores = resultado && !resultado.ok ? (resultado.valores ?? {}) : {}

/*
 * O React 19 reseta o formulário quando a ação termina. Repor só o
 * `defaultValue` não basta: trocar essa prop não altera um input já montado.
 * A `key` força o remonte, e aí cada campo nasce já com o valor devolvido.
 */
const [tentativa, setTentativa] = useState(0)
useEffect(() => {
  if (resultado && !resultado.ok) setTentativa((n) => n + 1)
}, [resultado])
```

Envolver o bloco de campos do cadastro rápido num `Fragment` com chave e passar `defaultValue` em cada campo:

```tsx
<Fragment key={tentativa}>
  <Campo
    rotulo="Nome do cliente"
    nome="nomeCliente"
    required={clienteNovo}
    className="col-span-6"
    defaultValue={valores.nomeCliente ?? ''}
    erro={campos.nomeCliente}
  />
  <CampoMascarado
    rotulo="CPF/CNPJ"
    nome="documentoCliente"
    mascara="documento"
    className="col-span-3"
    defaultValue={valores.documentoCliente ?? ''}
    erro={campos.documentoCliente}
  />
  <CampoMascarado
    rotulo="Telefone"
    nome="telefoneCliente"
    mascara="telefone"
    className="col-span-3"
    defaultValue={valores.telefoneCliente ?? ''}
    erro={campos.telefoneCliente}
  />
</Fragment>
```

Fazer o mesmo com `marca`, `modelo`, `aplicacaoOutra`, `problemaRelatado`, `acessoriosRecebidos` e `observacoes` — cada um recebendo `defaultValue={valores.<nome> ?? ''}` e ficando dentro de um `Fragment` com a mesma `key={tentativa}`.

Nos dois `CampoSelecao` (`aplicacao` e `tipoMotor`), passar `defaultValue={valores.aplicacao}` e `defaultValue={valores.tipoMotor}` quando houver valor.

- [ ] **Passo 6: Escrever o teste ponta a ponta**

`testes/e2e/os-cadastro-rapido.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { prepararSessao } from './ajuda'

test.beforeEach(async ({ page }) => {
  await prepararSessao(page)
})

test('erro de validação não apaga o que já foi digitado', async ({ page }) => {
  await page.goto('/ordens-servico/nova')
  await page.getByLabel('Cliente e equipamento').selectOption('novo')

  // Nome em branco reprova; o resto tem de continuar na tela.
  await page.getByLabel('CPF/CNPJ').pressSequentially('12345678901')
  await page.getByLabel('Telefone').pressSequentially('12345678910')
  await page.getByLabel('Marca').fill('Husqvarna')
  await page.getByLabel('Modelo').fill('236')
  await page.getByLabel('Problema relatado pelo cliente').fill('Não pega a frio')

  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()

  await expect(page.getByText('Nome do cliente é obrigatório')).toBeVisible()
  await expect(page.getByLabel('CPF/CNPJ')).toHaveValue('123.456.789-01')
  await expect(page.getByLabel('Telefone')).toHaveValue('(12) 34567-8910')
  await expect(page.getByLabel('Marca')).toHaveValue('Husqvarna')
  await expect(page.getByLabel('Modelo')).toHaveValue('236')
  await expect(page.getByLabel('Problema relatado pelo cliente')).toHaveValue(
    'Não pega a frio',
  )
})

test('máquina "Outro" sem dizer qual acusa o erro e mantém os dados', async ({
  page,
}) => {
  await page.goto('/ordens-servico/nova')
  await page.getByLabel('Cliente e equipamento').selectOption('novo')

  await page.getByLabel('Nome do cliente').fill('João da Silva')
  await page.getByLabel('Máquina').selectOption('outro')
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()

  await expect(page.getByText('Diga qual é a máquina')).toBeVisible()
  await expect(page.getByLabel('Nome do cliente')).toHaveValue('João da Silva')
})

test('corrigido o erro, a OS abre', async ({ page }) => {
  await page.goto('/ordens-servico/nova')
  await page.getByLabel('Cliente e equipamento').selectOption('novo')

  await page.getByLabel('Máquina').selectOption('outro')
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()
  await expect(page.getByText('Diga qual é a máquina')).toBeVisible()

  await page.getByLabel('Nome do cliente').fill('João da Silva')
  await page.getByLabel('Qual máquina?').fill('Cortador de grama')
  await page.getByRole('button', { name: 'Abrir ordem de serviço' }).click()

  await expect(page).toHaveURL(/\/ordens-servico\/[0-9a-f-]{36}$/)
  await expect(page.getByText('Cortador de grama')).toBeVisible()
})
```

- [ ] **Passo 7: Rodar os testes**

Com o `npm run dev` parado:

```powershell
npm test -- testes/unidade/resultado.test.ts
npm run teste:e2e -- testes/e2e/os-cadastro-rapido.spec.ts
```

Esperado: PASS nos dois. Se o primeiro teste ponta a ponta ainda mostrar campo vazio, o remonte não aconteceu — conferir se a `key={tentativa}` está no `Fragment` que envolve os campos e não num elemento acima do `<form>`.

- [ ] **Passo 8: Commit**

```bash
git add src/lib/resultado.ts src/modulos/os/acoes.ts "src/app/(app)/ordens-servico/nova/formulario.tsx" testes/unidade/resultado.test.ts testes/e2e/os-cadastro-rapido.spec.ts
git commit -m "Mantem o formulario preenchido quando a validacao reprova

O React 19 reseta os campos nao controlados quando a acao termina. A falha
passa a devolver os valores enviados, e o bloco de campos remonta com eles.
A tela de login fica de fora: senha nao se devolve.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Despesa "Outros" com descrição opcional

**Arquivos:**
- Modificar: `src/db/schema/financeiro.ts:39`
- Modificar: `src/modulos/financeiro/esquemas.ts:20-26`
- Modificar: `src/app/(app)/financeiro/despesa-formulario.tsx`
- Modificar: `src/app/(app)/financeiro/page.tsx:124`
- Modificar: `testes/integracao/financeiro.test.ts`
- Modificar: `testes/e2e/financeiro.spec.ts`
- Criar: migração em `drizzle/`

**Interfaces:**
- Consome: nada
- Produz: `entradaDespesa` com `descricao: string | null`

- [ ] **Passo 1: Escrever os testes que falham**

Acrescentar em `testes/integracao/financeiro.test.ts`:

```ts
test('despesa "outros" sem descrição é aceita e grava nulo', async () => {
  const r = await registrarDespesa({
    data: '2026-08-11',
    categoria: 'outros',
    descricao: null,
    valorCentavos: 18000,
    fornecedorId: null,
  })

  expect(r.ok).toBe(true)
  const [lancada] = await listarDespesas({ de: '2026-08-01', ate: '2026-08-31' })
  expect(lancada.descricao).toBeNull()
  expect(lancada.valorCentavos).toBe(18000)
})

test('despesa de categoria conhecida também dispensa descrição', async () => {
  const r = await registrarDespesa({
    data: '2026-08-11',
    categoria: 'energia',
    descricao: null,
    valorCentavos: 34000,
    fornecedorId: null,
  })

  expect(r.ok).toBe(true)
})

test('descrição em branco vira nulo, não string vazia', () => {
  const analise = entradaDespesa.safeParse({
    data: '2026-08-11',
    categoria: 'outros',
    descricao: '   ',
    valorCentavos: 1000,
  })

  expect(analise.success).toBe(true)
  if (!analise.success) return
  expect(analise.data.descricao).toBeNull()
})
```

Garantir os imports de `entradaDespesa`, `registrarDespesa` e `listarDespesas` no topo.

- [ ] **Passo 2: Rodar e confirmar a falha**

```powershell
npm test -- testes/integracao/financeiro.test.ts
```

Esperado: FAIL — `descricao` é `textoObrigatorio` e a coluna é `not null`.

- [ ] **Passo 3: Tornar a coluna anulável**

Em `src/db/schema/financeiro.ts`, na tabela `despesas`:

```ts
  /** Só faz sentido em "outros"; nas demais a categoria já descreve. */
  descricao: text('descricao'),
```

- [ ] **Passo 4: Gerar e aplicar a migração**

```powershell
npm run banco:gerar
npm run banco:aplicar
```

Conferir que o SQL é um `ALTER TABLE "despesas" ALTER COLUMN "descricao" DROP NOT NULL;`.

- [ ] **Passo 5: Afrouxar a validação**

Em `src/modulos/financeiro/esquemas.ts`, trocar a linha da descrição em `entradaDespesa`:

```ts
  descricao: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
```

Remover o import de `textoObrigatorio` se ele não for mais usado no arquivo.

- [ ] **Passo 6: Revelar o campo só em "Outros"**

Em `src/app/(app)/financeiro/despesa-formulario.tsx`, acrescentar `useState` ao import do React e trocar o miolo do formulário:

```tsx
const [categoria, setCategoria] = useState('ferramenta')
const ehOutros = categoria === 'outros'
```

```tsx
<CampoSelecao
  rotulo="Categoria"
  nome="categoria"
  className="col-span-2"
  onChange={(evento) => setCategoria(evento.target.value)}
  opcoes={Object.entries(CATEGORIAS_DESPESA).map(([valor, texto]) => ({
    valor,
    texto,
  }))}
/>

{ehOutros && (
  <Campo
    rotulo="Especifique (opcional)"
    nome="descricao"
    className="col-span-4"
    placeholder="Conserto do portão…"
  />
)}
```

O campo Descrição obrigatório sai. As colunas restantes precisam somar 12 nas duas situações: sem o campo, o Valor passa a `col-span-4` e o botão a `col-span-4`; com o campo, ambos voltam a `col-span-2`. Calcular pelas classes:

```tsx
<Campo
  rotulo="Valor"
  nome="valor"
  required
  placeholder="0,00"
  className={ehOutros ? 'col-span-2' : 'col-span-4'}
/>
<div className={ehOutros ? 'col-span-2' : 'col-span-4'}>
  <Botao type="submit" disabled={pendente} className="w-full">
    {pendente ? 'Lançando…' : 'Lançar despesa'}
  </Botao>
</div>
```

- [ ] **Passo 7: Tratar o nulo na listagem**

Em `src/app/(app)/financeiro/page.tsx`, na célula da descrição:

```tsx
<Celula>{despesa.descricao ?? '—'}</Celula>
```

- [ ] **Passo 8: Escrever o teste ponta a ponta**

Acrescentar em `testes/e2e/financeiro.spec.ts`:

```ts
test('o campo de descrição só aparece na categoria Outros', async ({ page }) => {
  await page.goto('/financeiro')
  const secao = page.getByRole('region', { name: 'Despesas' })

  await expect(secao.getByLabel('Especifique (opcional)')).toHaveCount(0)

  await secao.getByLabel('Categoria').selectOption('outros')
  await expect(secao.getByLabel('Especifique (opcional)')).toBeVisible()

  await secao.getByLabel('Categoria').selectOption('energia')
  await expect(secao.getByLabel('Especifique (opcional)')).toHaveCount(0)
})

test('despesa de energia sem descrição é lançada e listada com travessão', async ({
  page,
}) => {
  await page.goto('/financeiro')
  const secao = page.getByRole('region', { name: 'Despesas' })

  await secao.getByLabel('Categoria').selectOption('energia')
  await secao.getByLabel('Valor').fill('340,00')
  await secao.getByRole('button', { name: 'Lançar despesa' }).click()

  const linha = page.getByRole('row').filter({ hasText: 'Energia' })
  await expect(linha.getByRole('cell', { name: '—' })).toBeVisible()
  await expect(linha.getByRole('cell', { name: 'R$ 340,00' })).toBeVisible()
})
```

Se a seção de Despesas não tiver `role="region"` acessível pelo nome, usar o mesmo escopo que os testes já existentes no arquivo usam.

- [ ] **Passo 9: Rodar os testes**

```powershell
npm test -- testes/integracao/financeiro.test.ts
npm run teste:e2e -- testes/e2e/financeiro.spec.ts
```

Esperado: PASS nos dois.

- [ ] **Passo 10: Commit**

```bash
git add src/db/schema/financeiro.ts src/modulos/financeiro/esquemas.ts "src/app/(app)/financeiro" drizzle testes/integracao/financeiro.test.ts testes/e2e/financeiro.spec.ts
git commit -m "Torna a descricao da despesa opcional e exclusiva de Outros

Nas categorias conhecidas a categoria ja descreve o gasto, entao o campo
some. Em Outros ele abre como Especifique, sem obrigatoriedade. A coluna
passa a aceitar nulo e a listagem mostra travessao.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Criar peça e fornecedor mínimos

**Arquivos:**
- Modificar: `src/modulos/catalogo/pecas-operacoes.ts`
- Modificar: `src/modulos/catalogo/fornecedores-operacoes.ts`
- Modificar: `testes/integracao/catalogo-pecas.test.ts`
- Modificar: `testes/integracao/catalogo-fornecedores.test.ts`

**Interfaces:**
- Consome: `Transacao` de `src/modulos/estoque/operacoes.ts`
- Produz:
  - `criarPecaMinima(nome: string, unidade: 'un' | 'L' | 'mL', tx?: Transacao): Promise<{ id: string }>`
  - `criarFornecedorMinimo(nome: string, tx?: Transacao): Promise<{ id: string }>`

**Por que devolvem o id cru, e não `Resultado`:** quem chama já validou o nome pelo esquema Zod. Embrulhar em `Resultado` obrigaria a desembrulhar dentro de uma transação, onde a saída em caso de erro é lançar mesmo — que é o que faz a transação voltar atrás.

- [ ] **Passo 1: Escrever os testes que falham**

Acrescentar em `testes/integracao/catalogo-pecas.test.ts`:

```ts
test('criarPecaMinima cria com o nome e a unidade, e o resto no padrão', async () => {
  const { id } = await criarPecaMinima('Vela NGK BPMR7A', 'un')

  const [peca] = await db.select().from(pecas).where(eq(pecas.id, id))
  expect(peca.nome).toBe('Vela NGK BPMR7A')
  expect(peca.unidade).toBe('un')
  expect(peca.controlaSaldo).toBe(false)
  expect(peca.ativo).toBe(true)
  expect(peca.ultimoCustoCentavos).toBeNull()
})

test('criarPecaMinima respeita a unidade de volume', async () => {
  const { id } = await criarPecaMinima('Óleo 2T Motul', 'L')

  const [peca] = await db.select().from(pecas).where(eq(pecas.id, id))
  expect(peca.unidade).toBe('L')
})

test('criarPecaMinima apara o nome', async () => {
  const { id } = await criarPecaMinima('  Bujão  ', 'un')

  const [peca] = await db.select().from(pecas).where(eq(pecas.id, id))
  expect(peca.nome).toBe('Bujão')
})
```

Acrescentar em `testes/integracao/catalogo-fornecedores.test.ts`:

```ts
test('criarFornecedorMinimo cria só com o nome', async () => {
  const { id } = await criarFornecedorMinimo('Peças Rio Claro')

  const [fornecedor] = await db
    .select()
    .from(fornecedores)
    .where(eq(fornecedores.id, id))
  expect(fornecedor.nome).toBe('Peças Rio Claro')
  expect(fornecedor.ativo).toBe(true)
  expect(fornecedor.telefone).toBeNull()
})
```

Garantir os imports de `criarPecaMinima`, `criarFornecedorMinimo`, `db`, `pecas`, `fornecedores` e `eq` nos dois arquivos.

- [ ] **Passo 2: Rodar e confirmar a falha**

```powershell
npm test -- testes/integracao/catalogo-pecas.test.ts testes/integracao/catalogo-fornecedores.test.ts
```

Esperado: FAIL — as funções não existem.

- [ ] **Passo 3: Escrever `criarPecaMinima`**

Acrescentar em `src/modulos/catalogo/pecas-operacoes.ts` (e importar `Transacao` de `@/modulos/estoque/operacoes`):

```ts
/**
 * Cadastro na hora, feito de dentro da compra. Só o nome e a unidade — o resto
 * tem valor padrão na tabela, e a Lucilene completa depois em Estoque se a
 * peça passar a controlar saldo. Aceita transação para que a peça e a compra
 * entrem juntas ou não entrem.
 */
export async function criarPecaMinima(
  nome: string,
  unidade: 'un' | 'L' | 'mL',
  tx?: Transacao,
): Promise<{ id: string }> {
  const executor = tx ?? db
  const [criada] = await executor
    .insert(pecas)
    .values({ nome: nome.trim(), unidade })
    .returning({ id: pecas.id })
  return { id: criada.id }
}
```

- [ ] **Passo 4: Escrever `criarFornecedorMinimo`**

Acrescentar em `src/modulos/catalogo/fornecedores-operacoes.ts`, seguindo os imports que o arquivo já tem e acrescentando `Transacao`:

```ts
/** Cadastro na hora, feito de dentro da compra. Ver `criarPecaMinima`. */
export async function criarFornecedorMinimo(
  nome: string,
  tx?: Transacao,
): Promise<{ id: string }> {
  const executor = tx ?? db
  const [criado] = await executor
    .insert(fornecedores)
    .values({ nome: nome.trim() })
    .returning({ id: fornecedores.id })
  return { id: criado.id }
}
```

- [ ] **Passo 5: Rodar os testes**

```powershell
npm test -- testes/integracao/catalogo-pecas.test.ts testes/integracao/catalogo-fornecedores.test.ts
```

Esperado: PASS, 4 testes novos.

- [ ] **Passo 6: Commit**

```bash
git add src/modulos/catalogo testes/integracao/catalogo-pecas.test.ts testes/integracao/catalogo-fornecedores.test.ts
git commit -m "Permite criar peca e fornecedor com o minimo, dentro de transacao

Base do cadastro na hora da tela de compras. Aceitam transacao como o
registrarMovimento do estoque, para que nada entre pela metade.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Componente de combobox

**Arquivos:**
- Criar: `src/componentes/campo-combo.tsx`

**Interfaces:**
- Consome: `normalizarTexto` (Task 1)
- Produz:

```ts
export type OpcaoCombo = { id: string; texto: string }

export function CampoCombo(props: {
  rotulo: string
  nome: string
  opcoes: OpcaoCombo[]
  permiteCriar?: boolean
  rotuloCriar?: (texto: string) => string
  placeholder?: string
  erro?: string
  className?: string
  'aria-label'?: string
  aoMudar?: (estado: { id: string | null; nome: string | null }) => void
}): JSX.Element
```

**Campos ocultos emitidos:** `<nome>Id` e `<nome>Nome`. **Os dois são sempre renderizados**, mesmo vazios — a tela de compras repete linhas, e a ação lê `formulario.getAll('pecaId')` e `getAll('pecaNome')` contando com listas do mesmo tamanho e na mesma ordem. Se um campo sumisse quando vazio, as listas desalinhariam e a linha 2 pegaria o valor da linha 3.

- [ ] **Passo 1: Escrever o componente**

`src/componentes/campo-combo.tsx`:

```tsx
'use client'

import { useId, useState } from 'react'
import { normalizarTexto } from '@/lib/texto'

export type OpcaoCombo = { id: string; texto: string }

const CONTROLE =
  'w-full rounded-md border border-borda-forte bg-superficie px-3 py-2 text-sm placeholder:text-tinta-fraca'

export function CampoCombo({
  rotulo,
  nome,
  opcoes,
  permiteCriar = false,
  rotuloCriar = (texto) => `Cadastrar “${texto}”`,
  placeholder,
  erro,
  className = '',
  'aria-label': rotuloAcessivel,
  aoMudar,
}: {
  rotulo: string
  nome: string
  opcoes: OpcaoCombo[]
  permiteCriar?: boolean
  rotuloCriar?: (texto: string) => string
  placeholder?: string
  erro?: string
  className?: string
  'aria-label'?: string
  aoMudar?: (estado: { id: string | null; nome: string | null }) => void
}) {
  const [texto, setTexto] = useState('')
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [aberto, setAberto] = useState(false)
  const [indice, setIndice] = useState(0)
  const idBase = useId()

  const alvo = normalizarTexto(texto)
  const filtradas = alvo
    ? opcoes.filter((opcao) => normalizarTexto(opcao.texto).includes(alvo))
    : opcoes

  // Digitar exatamente o nome de algo que existe casa com ele, em vez de
  // propor criar uma segunda peça com o mesmo nome.
  const exata = opcoes.find((opcao) => normalizarTexto(opcao.texto) === alvo)
  const id = escolhido ?? exata?.id ?? null
  const podeCriar = permiteCriar && alvo.length > 0 && !exata
  const nomeNovo = id ? '' : podeCriar ? texto.trim() : ''

  const linhas = podeCriar ? filtradas.length + 1 : filtradas.length

  function avisar(novoId: string | null, novoNome: string | null) {
    aoMudar?.({ id: novoId, nome: novoNome })
  }

  function selecionar(posicao: number) {
    if (podeCriar && posicao === filtradas.length) {
      setEscolhido(null)
      setAberto(false)
      avisar(null, texto.trim())
      return
    }
    const opcao = filtradas[posicao]
    if (!opcao) return
    setTexto(opcao.texto)
    setEscolhido(opcao.id)
    setAberto(false)
    avisar(opcao.id, null)
  }

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={`${idBase}-entrada`}
        className="text-xs font-medium uppercase tracking-wide text-tinta-suave"
      >
        {rotulo}
      </label>

      <div className="relative">
        <input
          id={`${idBase}-entrada`}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={`${idBase}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={
            aberto && linhas > 0 ? `${idBase}-opcao-${indice}` : undefined
          }
          aria-label={rotuloAcessivel}
          autoComplete="off"
          className={CONTROLE}
          placeholder={placeholder}
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value)
            setEscolhido(null)
            setAberto(true)
            setIndice(0)
            avisar(null, evento.target.value.trim() || null)
          }}
          onFocus={() => setAberto(true)}
          // `onBlur` atrasado: o clique numa opção só chega depois do blur, e
          // fechar antes cancelaria a escolha.
          onBlur={() => window.setTimeout(() => setAberto(false), 120)}
          onKeyDown={(evento) => {
            if (evento.key === 'ArrowDown') {
              evento.preventDefault()
              setAberto(true)
              setIndice((n) => (linhas === 0 ? 0 : (n + 1) % linhas))
            } else if (evento.key === 'ArrowUp') {
              evento.preventDefault()
              setIndice((n) => (linhas === 0 ? 0 : (n - 1 + linhas) % linhas))
            } else if (evento.key === 'Enter' && aberto) {
              evento.preventDefault()
              selecionar(indice)
            } else if (evento.key === 'Escape') {
              setAberto(false)
            }
          }}
        />

        {aberto && linhas > 0 && (
          <ul
            id={`${idBase}-lista`}
            role="listbox"
            className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-borda-forte bg-superficie py-1 text-sm shadow-lg"
          >
            {filtradas.map((opcao, posicao) => (
              <li
                key={opcao.id}
                id={`${idBase}-opcao-${posicao}`}
                role="option"
                aria-selected={posicao === indice}
                className={`cursor-pointer px-3 py-1.5 ${
                  posicao === indice ? 'bg-acao-fundo' : ''
                }`}
                onMouseDown={() => selecionar(posicao)}
                onMouseEnter={() => setIndice(posicao)}
              >
                {opcao.texto}
              </li>
            ))}

            {podeCriar && (
              <li
                id={`${idBase}-opcao-${filtradas.length}`}
                role="option"
                aria-selected={indice === filtradas.length}
                className={`cursor-pointer border-t border-borda px-3 py-1.5 font-medium text-acao ${
                  indice === filtradas.length ? 'bg-acao-fundo' : ''
                }`}
                onMouseDown={() => selecionar(filtradas.length)}
                onMouseEnter={() => setIndice(filtradas.length)}
              >
                {rotuloCriar(texto.trim())}
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Sempre os dois, mesmo vazios: a tela de compras repete linhas e a
          ação casa as listas por posição. */}
      <input type="hidden" name={`${nome}Id`} value={id ?? ''} />
      <input type="hidden" name={`${nome}Nome`} value={nomeNovo} />

      {erro && <span className="text-xs text-alerta">{erro}</span>}
    </div>
  )
}
```

- [ ] **Passo 2: Conferir que compila**

```powershell
npm run build
```

Esperado: compila. O componente ainda não é usado por ninguém — a Task 11 o liga na tela.

- [ ] **Passo 3: Commit**

```bash
git add src/componentes/campo-combo.tsx
git commit -m "Adiciona combobox com filtro e cadastro na hora

Emite sempre os dois campos ocultos, Id e Nome, mesmo vazios: a tela de
compras repete linhas e a acao casa as listas por posicao.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Compra que cria peça e fornecedor

**Arquivos:**
- Modificar: `src/modulos/compras/esquemas.ts`
- Modificar: `src/modulos/compras/operacoes.ts`
- Modificar: `src/modulos/compras/acoes.ts`
- Criar: `testes/integracao/compras-cadastro-na-hora.test.ts`

**Interfaces:**
- Consome: `criarPecaMinima`, `criarFornecedorMinimo` (Task 8); `normalizarTexto` (Task 1)
- Produz: `entradaCompra` aceitando `fornecedorNome` e, por item, `pecaNome` + `unidade`

- [ ] **Passo 1: Escrever os testes que falham**

`testes/integracao/compras-cadastro-na-hora.test.ts`:

```ts
import { eq } from 'drizzle-orm'
import { beforeEach, expect, test } from 'vitest'
import { db } from '../../src/db'
import { fornecedores, pecas } from '../../src/db/schema'
import { listarCompras, obterCompra } from '../../src/modulos/compras/consultas'
import { registrarCompra } from '../../src/modulos/compras/operacoes'
import { saldoDaPeca } from '../../src/modulos/estoque/consultas'
import { limparBanco } from '../ajuda/banco'

beforeEach(limparBanco)

test('peça nova entra no cadastro, no estoque e com o último custo', async () => {
  const r = await registrarCompra({
    fornecedorNome: 'Peças Rio Claro',
    data: '2026-08-11',
    itens: [
      { pecaNome: 'Vela NGK BPMR7A', unidade: 'un', quantidade: 4, custoUnitarioCentavos: 2800 },
    ],
  })

  expect(r.ok).toBe(true)

  const [peca] = await db.select().from(pecas)
  expect(peca.nome).toBe('Vela NGK BPMR7A')
  expect(peca.unidade).toBe('un')
  expect(peca.ultimoCustoCentavos).toBe(2800)
  expect(await saldoDaPeca(peca.id)).toBe(4)

  const [fornecedor] = await db.select().from(fornecedores)
  expect(fornecedor.nome).toBe('Peças Rio Claro')
})

test('a unidade escolhida vale para a peça nova', async () => {
  await registrarCompra({
    data: '2026-08-11',
    itens: [
      { pecaNome: 'Óleo 2T Motul', unidade: 'L', quantidade: 0.5, custoUnitarioCentavos: 4500 },
    ],
  })

  const [peca] = await db.select().from(pecas)
  expect(peca.unidade).toBe('L')
  expect(await saldoDaPeca(peca.id)).toBe(0.5)
})

test('a mesma peça nova em duas linhas é criada uma vez só', async () => {
  const r = await registrarCompra({
    data: '2026-08-11',
    itens: [
      { pecaNome: 'Óleo 2T', unidade: 'L', quantidade: 1, custoUnitarioCentavos: 4500 },
      { pecaNome: 'óleo 2t', unidade: 'L', quantidade: 2, custoUnitarioCentavos: 4500 },
    ],
  })
  if (!r.ok) throw new Error('compra falhou')

  const todas = await db.select().from(pecas)
  expect(todas).toHaveLength(1)
  expect(await saldoDaPeca(todas[0].id)).toBe(3)
  expect((await obterCompra(r.dados.id))?.itens).toHaveLength(2)
})

test('peça existente e peça nova convivem na mesma compra', async () => {
  const [existente] = await db.insert(pecas).values({ nome: 'Kit cilindro' }).returning()

  await registrarCompra({
    data: '2026-08-11',
    itens: [
      { pecaId: existente.id, quantidade: 1, custoUnitarioCentavos: 23000 },
      { pecaNome: 'Retentor', unidade: 'un', quantidade: 2, custoUnitarioCentavos: 1500 },
    ],
  })

  expect(await db.select().from(pecas)).toHaveLength(2)
  expect(await saldoDaPeca(existente.id)).toBe(1)
})

test('fornecedor existente não é duplicado quando vem por id', async () => {
  const [fornecedor] = await db
    .insert(fornecedores)
    .values({ nome: 'Peças Rio Claro' })
    .returning()

  await registrarCompra({
    fornecedorId: fornecedor.id,
    data: '2026-08-11',
    itens: [
      { pecaNome: 'Vela', unidade: 'un', quantidade: 1, custoUnitarioCentavos: 2800 },
    ],
  })

  expect(await db.select().from(fornecedores)).toHaveLength(1)
})

test('falha no meio não deixa peça nem fornecedor órfão', async () => {
  const r = await registrarCompra({
    fornecedorNome: 'Peças Rio Claro',
    data: '2026-08-11',
    itens: [
      { pecaNome: 'Vela', unidade: 'un', quantidade: 1, custoUnitarioCentavos: 2800 },
      {
        pecaId: '00000000-0000-0000-0000-000000000000',
        quantidade: 1,
        custoUnitarioCentavos: 100,
      },
    ],
  })

  expect(r.ok).toBe(false)
  expect(await db.select().from(pecas)).toHaveLength(0)
  expect(await db.select().from(fornecedores)).toHaveLength(0)
  expect(await listarCompras()).toHaveLength(0)
})
```

- [ ] **Passo 2: Rodar e confirmar a falha**

```powershell
npm test -- testes/integracao/compras-cadastro-na-hora.test.ts
```

Esperado: FAIL — `pecaNome` e `fornecedorNome` não existem no tipo de entrada.

- [ ] **Passo 3: Atualizar o esquema**

Substituir em `src/modulos/compras/esquemas.ts`:

```ts
export const entradaItemCompra = z
  .object({
    pecaId: z.string().uuid('Selecione a peça').optional(),
    /** Peça digitada na hora, cadastrada junto com a compra. */
    pecaNome: z.string().trim().min(1).optional(),
    unidade: z.enum(['un', 'L', 'mL']).default('un'),
    quantidade: z.number().positive('A quantidade precisa ser maior que zero'),
    custoUnitarioCentavos: z.number().int().min(0),
  })
  .refine((item) => item.pecaId || item.pecaNome, {
    message: 'Selecione a peça ou digite o nome de uma nova',
    path: ['pecaId'],
  })

export const entradaCompra = z.object({
  fornecedorId: z.string().uuid().nullable().optional(),
  /** Fornecedor digitado na hora. */
  fornecedorNome: z.string().trim().min(1).nullable().optional(),
  /** A OS que motivou a compra, quando a peça foi comprada sob demanda. */
  osId: z.string().uuid().nullable().optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data da compra'),
  numeroDocumento: opcional,
  observacoes: opcional,
  itens: z.array(entradaItemCompra).min(1, 'Inclua ao menos uma peça na compra'),
})
```

- [ ] **Passo 4: Resolver as peças dentro da transação**

Substituir `registrarCompra` em `src/modulos/compras/operacoes.ts`:

```ts
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { compraItens, compras, pecas } from '@/db/schema'
import { falha, sucesso, type Resultado } from '@/lib/resultado'
import { normalizarTexto } from '@/lib/texto'
import { criarFornecedorMinimo } from '@/modulos/catalogo/fornecedores-operacoes'
import { criarPecaMinima } from '@/modulos/catalogo/pecas-operacoes'
import { registrarMovimento } from '@/modulos/estoque/operacoes'
import type { EntradaCompra } from './esquemas'

export async function registrarCompra(
  entrada: EntradaCompra,
): Promise<Resultado<{ id: string }>> {
  if (entrada.itens.length === 0) return falha('Inclua ao menos uma peça na compra.')

  // Só os que vieram por id precisam existir; os digitados nascem aqui.
  const idsDePeca = [
    ...new Set(
      entrada.itens
        .map((item) => item.pecaId)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  if (idsDePeca.length > 0) {
    const encontradas = await db
      .select({ id: pecas.id })
      .from(pecas)
      .where(inArray(pecas.id, idsDePeca))
    if (encontradas.length !== idsDePeca.length) return falha('Peça não encontrada.')
  }

  return db.transaction(async (tx) => {
    const fornecedorId = entrada.fornecedorNome
      ? (await criarFornecedorMinimo(entrada.fornecedorNome, tx)).id
      : (entrada.fornecedorId ?? null)

    /*
     * A mesma peça digitada em duas linhas da compra é uma peça só. Sem esta
     * memória sairiam dois cadastros iguais e o saldo ficaria repartido.
     */
    const criadasPorNome = new Map<string, string>()
    const resolvidos: {
      pecaId: string
      quantidade: number
      custoUnitarioCentavos: number
    }[] = []

    for (const item of entrada.itens) {
      let pecaId = item.pecaId ?? null

      if (!pecaId && item.pecaNome) {
        const chave = normalizarTexto(item.pecaNome)
        pecaId = criadasPorNome.get(chave) ?? null
        if (!pecaId) {
          pecaId = (await criarPecaMinima(item.pecaNome, item.unidade, tx)).id
          criadasPorNome.set(chave, pecaId)
        }
      }

      if (!pecaId) throw new Error('Item de compra sem peça resolvida.')

      resolvidos.push({
        pecaId,
        quantidade: item.quantidade,
        custoUnitarioCentavos: item.custoUnitarioCentavos,
      })
    }

    const [compra] = await tx
      .insert(compras)
      .values({
        fornecedorId,
        osId: entrada.osId ?? null,
        data: entrada.data,
        numeroDocumento: entrada.numeroDocumento ?? null,
        observacoes: entrada.observacoes ?? null,
      })
      .returning({ id: compras.id })

    for (const item of resolvidos) {
      await tx.insert(compraItens).values({
        compraId: compra.id,
        pecaId: item.pecaId,
        quantidade: item.quantidade.toFixed(3),
        custoUnitarioCentavos: item.custoUnitarioCentavos,
      })

      await registrarMovimento(
        {
          pecaId: item.pecaId,
          tipo: 'entrada_compra',
          quantidade: item.quantidade,
          referenciaTipo: 'compra',
          referenciaId: compra.id,
        },
        tx,
      )

      // Último custo conhecido: responde "quanto essa peça me custa hoje" sem
      // a complicação de custo médio ponderado, que este volume não justifica.
      await tx
        .update(pecas)
        .set({ ultimoCustoCentavos: item.custoUnitarioCentavos })
        .where(eq(pecas.id, item.pecaId))
    }

    return sucesso({ id: compra.id })
  })
}
```

- [ ] **Passo 5: Ler os campos novos na ação**

Substituir o miolo de `acaoRegistrarCompra` em `src/modulos/compras/acoes.ts`:

```ts
  const idsDePeca = formulario.getAll('pecaId').map(String)
  const nomesDePeca = formulario.getAll('pecaNome').map(String)
  const unidades = formulario.getAll('unidadeNova').map(String)
  const quantidades = formulario.getAll('quantidade').map(String)
  const custos = formulario.getAll('custo').map(String)

  const itens = []
  for (let i = 0; i < quantidades.length; i++) {
    const pecaId = idsDePeca[i] ?? ''
    const pecaNome = (nomesDePeca[i] ?? '').trim()
    // Linha em branco: nem escolheu, nem digitou. Ignora sem reclamar.
    if (!pecaId && !pecaNome) continue

    const quantidade = parsearQuantidade(quantidades[i] ?? '')
    if (quantidade === null) return falha(`Informe a quantidade da linha ${i + 1}.`)

    const custo = parsearReais(custos[i] ?? '')
    if (custo === null) return falha(`Informe o custo da linha ${i + 1}.`)

    itens.push({
      ...(pecaId ? { pecaId } : { pecaNome }),
      unidade: (unidades[i] || 'un') as 'un' | 'L' | 'mL',
      quantidade,
      custoUnitarioCentavos: custo,
    })
  }

  const fornecedorId = String(formulario.get('fornecedorId') ?? '')
  const fornecedorNome = String(formulario.get('fornecedorNome') ?? '').trim()
  const osId = String(formulario.get('osId') ?? '')

  const analise = entradaCompra.safeParse({
    fornecedorId: fornecedorId || null,
    fornecedorNome: fornecedorNome || null,
    osId: osId || null,
    data: String(formulario.get('data') ?? ''),
    numeroDocumento: String(formulario.get('numeroDocumento') ?? ''),
    observacoes: String(formulario.get('observacoes') ?? ''),
    itens,
  })
  if (!analise.success) return falhaDeValidacao(analise.error, objetoDoFormulario(formulario))
```

O laço agora percorre `quantidades`, não `idsDePeca`: com o combobox, `pecaId` pode vir vazio numa linha que tem `pecaNome`, e contar pelo id perderia linhas.

Acrescentar no topo do arquivo o utilitário usado no eco de valores:

```ts
function objetoDoFormulario(formulario: FormData): Record<string, string> {
  const dados: Record<string, string> = {}
  for (const [chave, valor] of formulario.entries()) dados[chave] = String(valor)
  return dados
}
```

- [ ] **Passo 6: Rodar os testes**

```powershell
npm test -- testes/integracao/compras-cadastro-na-hora.test.ts testes/integracao/compras.test.ts
```

Esperado: PASS nos dois. `compras.test.ts` é o teste antigo, que usa só `pecaId` — precisa continuar passando sem alteração.

- [ ] **Passo 7: Commit**

```bash
git add src/modulos/compras testes/integracao/compras-cadastro-na-hora.test.ts
git commit -m "Cria peca e fornecedor digitados junto com a compra

Tudo na mesma transacao que ja gravava a compra: falhou no meio, nao sobra
peca nem fornecedor orfao. A mesma peca digitada em duas linhas vira um
cadastro so, casando pelo nome sem acento e sem caixa.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Tela de nova compra com os campos digitáveis

**Arquivos:**
- Modificar: `src/app/(app)/compras/nova/formulario.tsx`
- Modificar: `testes/e2e/estoque-compras.spec.ts`

**Interfaces:**
- Consome: `CampoCombo` (Task 9); `acaoRegistrarCompra` lendo `pecaNome`/`fornecedorNome`/`unidadeNova` (Task 10); `Resultado.valores` (Task 6)
- Produz: nada para tarefas seguintes

**Atenção:** o teste `compra entra no estoque`, em `testes/e2e/estoque-compras.spec.ts:63`, usa `selectOption` nos campos que deixam de ser `<select>`. Ele **vai quebrar** e precisa ser reescrito nesta tarefa.

- [ ] **Passo 1: Reescrever o formulário**

Substituir `src/app/(app)/compras/nova/formulario.tsx`:

```tsx
'use client'

import { useActionState, useState } from 'react'
import { Botao } from '@/componentes/botao'
import { Campo, CampoSelecao, CampoTexto, GradeFormulario } from '@/componentes/campo'
import { CampoCombo } from '@/componentes/campo-combo'
import { MensagemErro } from '@/componentes/mensagem-erro'
import { acaoRegistrarCompra } from '@/modulos/compras/acoes'

type Opcao = { id: string; texto: string }

export function FormularioCompra({
  pecas,
  fornecedores,
  ordens,
  hoje,
}: {
  pecas: Opcao[]
  fornecedores: Opcao[]
  ordens: Opcao[]
  hoje: string
}) {
  const [resultado, enviar, pendente] = useActionState(acaoRegistrarCompra, null)
  const [linhas, setLinhas] = useState([0])
  // Guarda quais linhas estão criando peça nova, para revelar a unidade.
  const [pecaNova, setPecaNova] = useState<Record<number, boolean>>({})

  return (
    <form action={enviar} className="flex flex-col gap-6">
      <GradeFormulario>
        <CampoCombo
          rotulo="Fornecedor"
          nome="fornecedor"
          opcoes={fornecedores}
          permiteCriar
          rotuloCriar={(texto) => `Cadastrar “${texto}” como fornecedor novo`}
          placeholder="Digite para procurar ou cadastrar"
          className="col-span-4"
        />

        <Campo
          rotulo="Data"
          nome="data"
          type="date"
          required
          defaultValue={hoje}
          className="col-span-2"
        />

        {/*
          A OS filtra enquanto se digita, mas não se cria daqui: uma OS nasce
          de um equipamento recebido, com problema relatado e situação inicial.
        */}
        <CampoCombo
          rotulo="OS que motivou a compra"
          nome="os"
          opcoes={ordens}
          placeholder="Nenhuma (reposição de estoque)"
          className="col-span-4"
        />

        <Campo rotulo="Nota / documento" nome="numeroDocumento" className="col-span-2" />
      </GradeFormulario>

      <div className="flex flex-col gap-3 border-t border-borda pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">
          Itens da compra
        </p>

        {linhas.map((linha) => (
          <GradeFormulario key={linha}>
            <CampoCombo
              rotulo="Peça"
              nome="peca"
              opcoes={pecas}
              permiteCriar
              rotuloCriar={(texto) => `Cadastrar “${texto}” como peça nova`}
              placeholder="Digite para procurar ou cadastrar"
              className={pecaNova[linha] ? 'col-span-4' : 'col-span-6'}
              aria-label={`Peça da linha ${linha + 1}`}
              aoMudar={({ id, nome }) =>
                setPecaNova((atual) => ({ ...atual, [linha]: !id && Boolean(nome) }))
              }
            />

            {/*
              A oficina compra óleo em litro. Peça nova caindo em "un" por
              omissão faria 0,5 L virar meia unidade no saldo.
            */}
            {pecaNova[linha] && (
              <CampoSelecao
                rotulo="Unidade"
                nome="unidadeNova"
                className="col-span-2"
                aria-label={`Unidade da linha ${linha + 1}`}
                opcoes={[
                  { valor: 'un', texto: 'Unidade' },
                  { valor: 'L', texto: 'Litro' },
                  { valor: 'mL', texto: 'Mililitro' },
                ]}
              />
            )}

            <Campo
              rotulo="Quantidade"
              nome="quantidade"
              defaultValue="1"
              className="col-span-3"
              aria-label={`Quantidade da linha ${linha + 1}`}
            />

            <Campo
              rotulo="Custo unitário"
              nome="custo"
              placeholder="0,00"
              className="col-span-3"
              aria-label={`Custo unitário da linha ${linha + 1}`}
            />
          </GradeFormulario>
        ))}

        <Botao
          type="button"
          variante="secundario"
          className="self-start"
          onClick={() => setLinhas((atual) => [...atual, atual.length])}
        >
          Adicionar linha
        </Botao>
      </div>

      <CampoTexto rotulo="Observações" nome="observacoes" rows={2} />

      {resultado && !resultado.ok && <MensagemErro>{resultado.erro}</MensagemErro>}

      <Botao type="submit" disabled={pendente} className="self-start">
        {pendente ? 'Registrando…' : 'Registrar compra'}
      </Botao>
    </form>
  )
}
```

**Cuidado com o `unidadeNova`:** ele só é renderizado nas linhas que criam peça, então `getAll('unidadeNova')` **não** fica alinhado com as demais listas quando há mistura de linhas. Para manter o alinhamento, trocar o `CampoSelecao` condicional por um sempre renderizado, escondido quando não se aplica:

```tsx
<div className={pecaNova[linha] ? 'col-span-2' : 'hidden'}>
  <CampoSelecao
    rotulo="Unidade"
    nome="unidadeNova"
    aria-label={`Unidade da linha ${linha + 1}`}
    opcoes={[
      { valor: 'un', texto: 'Unidade' },
      { valor: 'L', texto: 'Litro' },
      { valor: 'mL', texto: 'Mililitro' },
    ]}
  />
</div>
```

E a classe da peça volta a ser fixa: `className="col-span-4"`. Usar esta versão, não a condicional acima.

- [ ] **Passo 2: Reescrever o teste ponta a ponta existente**

Em `testes/e2e/estoque-compras.spec.ts`, substituir o teste `compra entra no estoque`:

```ts
test('compra entra no estoque', async ({ page }) => {
  await page.goto('/compras')
  await expect(page.getByText('Nenhuma compra registrada ainda.')).toBeVisible()

  await page.getByRole('link', { name: 'Nova compra' }).click()

  await page.getByLabel('Fornecedor').fill('Peças Rio')
  await page.getByRole('option', { name: 'Peças Rio Claro' }).click()

  await page.getByLabel('Peça da linha 1').fill('Óleo 2 tempos')
  await page.getByRole('option', { name: 'Óleo 2 tempos (L)' }).click()

  await page.getByLabel('Quantidade da linha 1').fill('4')
  await page.getByLabel('Custo unitário da linha 1').fill('30,00')
  await page.getByRole('button', { name: 'Registrar compra' }).click()

  await expect(page.getByRole('cell', { name: 'Peças Rio Claro' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'R$ 120,00' })).toBeVisible()

  await page.goto('/estoque')
  const linha = page.getByRole('row').filter({ hasText: 'Óleo 2 tempos' })
  await expect(linha.getByRole('cell', { name: '4', exact: true })).toBeVisible()
})
```

E acrescentar dois testes novos:

```ts
test('peça digitada na hora entra no cadastro e no estoque', async ({ page }) => {
  await page.goto('/compras/nova')

  await page.getByLabel('Fornecedor').fill('Peças Rio Claro')
  await page.getByRole('option', { name: 'Peças Rio Claro' }).click()

  await page.getByLabel('Peça da linha 1').fill('Vela NGK BPMR7A')
  await page.getByRole('option', { name: /Cadastrar .*Vela NGK BPMR7A/ }).click()

  await page.getByLabel('Quantidade da linha 1').fill('4')
  await page.getByLabel('Custo unitário da linha 1').fill('28,00')
  await page.getByRole('button', { name: 'Registrar compra' }).click()

  await expect(page.getByRole('cell', { name: 'R$ 112,00' })).toBeVisible()

  await page.goto('/estoque')
  const linha = page.getByRole('row').filter({ hasText: 'Vela NGK BPMR7A' })
  await expect(linha.getByRole('cell', { name: '4', exact: true })).toBeVisible()
})

test('peça nova em litro respeita a unidade escolhida', async ({ page }) => {
  await page.goto('/compras/nova')

  await page.getByLabel('Peça da linha 1').fill('Óleo Motul 800')
  await page.getByRole('option', { name: /Cadastrar .*Óleo Motul 800/ }).click()
  await page.getByLabel('Unidade da linha 1').selectOption('L')

  await page.getByLabel('Quantidade da linha 1').fill('0,5')
  await page.getByLabel('Custo unitário da linha 1').fill('45,00')
  await page.getByRole('button', { name: 'Registrar compra' }).click()

  await page.goto('/estoque')
  const linha = page.getByRole('row').filter({ hasText: 'Óleo Motul 800' })
  await expect(linha.getByRole('cell', { name: '0,5', exact: true })).toBeVisible()
})
```

- [ ] **Passo 3: Rodar os testes**

Com o `npm run dev` parado:

```powershell
npm run teste:e2e -- testes/e2e/estoque-compras.spec.ts
```

Esperado: PASS, 7 testes. Se `getByRole('option', …)` não achar nada, conferir se o `role="option"` está nos `li` do `campo-combo.tsx` e se a lista abre ao digitar.

- [ ] **Passo 4: Rodar a suíte inteira e o build**

```powershell
npm test
npm run build
npm run teste:e2e
```

Esperado: tudo verde. Se aparecer `Cannot find module './XXX.js'`, é sobra de build — apagar `.next` e repetir.

- [ ] **Passo 5: Commit**

```bash
git add "src/app/(app)/compras/nova/formulario.tsx" testes/e2e/estoque-compras.spec.ts
git commit -m "Torna fornecedor, OS e peca digitaveis na nova compra

Fornecedor e peca filtram enquanto se digita e cadastram na hora quando nao
existem; peca nova revela o seletor de unidade. A OS so filtra, porque OS
nasce de equipamento recebido e nao se inventa da tela de compra.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Moldura dos PDFs

**Arquivos:**
- Modificar: `src/modulos/documentos/componentes.tsx` (reescrita)

**Interfaces:**
- Consome: `mascararDocumento`, `mascararTelefone` (Task 1)
- Produz, exportado de `componentes.tsx`:
  - `estilos` (`StyleSheet`)
  - `DadosEmpresa` — inalterado
  - `Cabecalho({ empresa })`
  - `CabecalhoCompacto({ empresa, documento })`
  - `FaixaDocumento({ titulo, numero, emissao, validadeDias? })`
  - `Bloco({ rotulo, children })`
  - `Campo({ rotulo, valor })` — inalterado
  - `TabelaDeItens({ titulo, itens })`
  - `CaixaDeTotais({ linhas, total })`
  - `Condicoes({ children })`
  - `Assinaturas({ cliente, documento })`
  - `Rodape({ empresa })`
  - Reexporta `Document`, `Image`, `Page`, `Text`, `View`, `formatarData`, `formatarReais`

- [ ] **Passo 1: Reescrever `componentes.tsx`**

```tsx
import path from 'node:path'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { formatarData } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { mascararDocumento, mascararTelefone } from '@/lib/mascaras'
import { formatarQuantidade } from '@/lib/quantidade'

/** Lido do disco: o PDF é gerado no servidor, sem passar pelo navegador. */
const CAMINHO_EMBLEMA = path.join(process.cwd(), 'public', 'logo-planeta-motores.jpeg')

/*
 * Cores tiradas de src/app/globals.css, para papel e tela combinarem. O
 * marinho é o campo do emblema; o teal vem dos continentes do planeta e
 * aparece uma vez só, no filete acima do total.
 */
const MARINHO = '#16283f'
const REALCE = '#eef1f5'
const TEAL = '#5fb3b8'
const TINTA_SUAVE = '#5b6976'
const BORDA = '#dde2e8'

export const estilos = StyleSheet.create({
  pagina: {
    paddingTop: 34,
    paddingBottom: 46,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: '#16202a',
  },

  cabecalho: { alignItems: 'center', marginBottom: 4 },
  emblema: { width: 56, height: 56, borderRadius: 28, marginBottom: 6 },
  empresa: { fontSize: 15, fontFamily: 'Helvetica-Bold', letterSpacing: 1.6, color: MARINHO },
  lema: { fontSize: 8.5, color: TINTA_SUAVE, letterSpacing: 0.6, marginTop: 1 },
  contato: { fontSize: 8.5, color: TINTA_SUAVE, marginTop: 3 },
  regua: { height: 2, backgroundColor: MARINHO, marginTop: 8, marginBottom: 14 },

  compacto: {
    position: 'absolute',
    top: 14,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: TINTA_SUAVE,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDA,
    paddingBottom: 4,
  },

  faixa: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  tituloDocumento: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: MARINHO },
  faixaDireita: { alignItems: 'flex-end' },

  bloco: {
    borderWidth: 0.5,
    borderColor: BORDA,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 5,
    marginBottom: 10,
  },
  rotuloBloco: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8,
    color: MARINHO,
    marginBottom: 4,
  },

  linha: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2.5 },
  rotulo: { color: TINTA_SUAVE },

  titulo: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: MARINHO, marginBottom: 5, letterSpacing: 0.6 },

  tabelaCabecalho: {
    flexDirection: 'row',
    backgroundColor: REALCE,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: MARINHO,
    letterSpacing: 0.4,
  },
  tabelaLinha: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BORDA,
    paddingVertical: 3.5,
    paddingHorizontal: 4,
  },
  colItem: { flex: 0.5 },
  colDescricao: { flex: 4.6 },
  colUnidade: { flex: 0.7, textAlign: 'center' },
  colQuantidade: { flex: 0.9, textAlign: 'right' },
  colValor: { flex: 1.4, textAlign: 'right' },

  totais: { marginTop: 10, alignSelf: 'flex-end', width: 210 },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: TEAL,
    paddingTop: 4,
    marginTop: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: MARINHO,
  },

  condicoes: { marginTop: 16 },
  textoCondicoes: { fontSize: 8, color: TINTA_SUAVE, lineHeight: 1.4 },

  assinaturas: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 44 },
  assinatura: { width: 210, borderTopWidth: 0.75, borderTopColor: '#8b97a3', paddingTop: 4 },
  nomeAssinatura: { fontSize: 8.5 },
  papelAssinatura: { fontSize: 7.5, color: TINTA_SUAVE, marginTop: 1 },

  rodape: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: BORDA,
    paddingTop: 5,
    fontSize: 7.5,
    color: TINTA_SUAVE,
  },
})

export type DadosEmpresa = {
  empresaNome: string
  empresaCnpj: string | null
  empresaTelefone: string | null
  empresaEndereco: string | null
}

function linhaDeContato(empresa: DadosEmpresa): string {
  return [
    empresa.empresaCnpj && `CNPJ ${mascararDocumento(empresa.empresaCnpj)}`,
    empresa.empresaTelefone && mascararTelefone(empresa.empresaTelefone),
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Cabeçalho grande, só na primeira página. */
export function Cabecalho({ empresa }: { empresa: DadosEmpresa }) {
  const contato = linhaDeContato(empresa)

  return (
    <View style={estilos.cabecalho}>
      {/*
        O emblema no papel que o cliente leva embora. Recortado em círculo,
        como na tela — o arquivo é quadrado com o campo marinho embutido.
      */}
      <Image src={CAMINHO_EMBLEMA} style={estilos.emblema} />
      <Text style={estilos.empresa}>{empresa.empresaNome.toUpperCase()}</Text>
      <Text style={estilos.lema}>Atendimento Especializado</Text>
      {contato ? <Text style={estilos.contato}>{contato}</Text> : null}
      {empresa.empresaEndereco ? (
        <Text style={estilos.contato}>{empresa.empresaEndereco}</Text>
      ) : null}
      <View style={estilos.regua} />
    </View>
  )
}

/**
 * Faixa repetida da segunda página em diante. Só texto: o `render` é avaliado
 * a cada página durante a diagramação, e uma imagem ali seria remedida toda
 * vez. O cabeçalho grande só faz sentido uma vez, senão empurraria a tabela.
 */
export function CabecalhoCompacto({
  empresa,
  documento,
}: {
  empresa: DadosEmpresa
  documento: string
}) {
  return (
    <View
      fixed
      style={estilos.compacto}
      render={({ pageNumber }) =>
        pageNumber === 1 ? null : (
          <>
            <Text>{empresa.empresaNome.toUpperCase()}</Text>
            <Text>{documento}</Text>
          </>
        )
      }
    />
  )
}

export function FaixaDocumento({
  titulo,
  numero,
  emissao,
  validadeDias,
}: {
  titulo: string
  numero: string
  emissao: Date | string
  validadeDias?: number
}) {
  return (
    <View style={estilos.faixa}>
      <Text style={estilos.tituloDocumento}>
        {titulo.toUpperCase()} Nº {numero}
      </Text>
      <View style={estilos.faixaDireita}>
        <Text>Emissão {formatarData(emissao)}</Text>
        {validadeDias !== undefined ? (
          <Text style={estilos.rotulo}>Validade {validadeDias} dias</Text>
        ) : null}
      </View>
    </View>
  )
}

export function Bloco({
  rotulo,
  children,
}: {
  rotulo: string
  children: React.ReactNode
}) {
  return (
    <View style={estilos.bloco}>
      <Text style={estilos.rotuloBloco}>{rotulo.toUpperCase()}</Text>
      {children}
    </View>
  )
}

export function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilos.linha}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text>{valor}</Text>
    </View>
  )
}

export type ItemDoDocumento = {
  tipo: 'peca' | 'servico'
  descricao: string
  quantidade: string
  precoUnitarioCentavos: number
  unidade?: string
}

export function TabelaDeItens({
  titulo,
  itens,
}: {
  titulo: string
  itens: ItemDoDocumento[]
}) {
  if (itens.length === 0) return null

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={estilos.titulo}>{titulo.toUpperCase()}</Text>

      <View style={estilos.tabelaCabecalho} fixed>
        <Text style={estilos.colItem}>IT</Text>
        <Text style={estilos.colDescricao}>DESCRIÇÃO</Text>
        <Text style={estilos.colUnidade}>UN</Text>
        <Text style={estilos.colQuantidade}>QTD</Text>
        <Text style={estilos.colValor}>V. UNIT.</Text>
        <Text style={estilos.colValor}>TOTAL</Text>
      </View>

      {itens.map((item, indice) => (
        <View
          key={indice}
          style={[
            estilos.tabelaLinha,
            // Zebra sutil: ajuda a seguir a linha até a coluna de valor.
            indice % 2 === 1 ? { backgroundColor: '#fafbfc' } : {},
          ]}
          wrap={false}
        >
          <Text style={estilos.colItem}>{String(indice + 1).padStart(2, '0')}</Text>
          <Text style={estilos.colDescricao}>{item.descricao}</Text>
          <Text style={estilos.colUnidade}>{item.unidade ?? 'un'}</Text>
          <Text style={estilos.colQuantidade}>{formatarQuantidade(item.quantidade)}</Text>
          <Text style={estilos.colValor}>{formatarReais(item.precoUnitarioCentavos)}</Text>
          <Text style={estilos.colValor}>
            {formatarReais(
              Math.round(Number(item.quantidade) * item.precoUnitarioCentavos),
            )}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function CaixaDeTotais({
  linhas,
  total,
}: {
  linhas: { rotulo: string; valor: string }[]
  total: number
}) {
  return (
    <View style={estilos.totais}>
      {linhas.map((linha) => (
        <View key={linha.rotulo} style={estilos.linha}>
          <Text style={estilos.rotulo}>{linha.rotulo}</Text>
          <Text>{linha.valor}</Text>
        </View>
      ))}
      <View style={estilos.total}>
        <Text>TOTAL</Text>
        <Text>{formatarReais(total)}</Text>
      </View>
    </View>
  )
}

export function Condicoes({ children }: { children: React.ReactNode }) {
  return (
    <View style={estilos.condicoes}>
      <Text style={estilos.titulo}>CONDIÇÕES</Text>
      <Text style={estilos.textoCondicoes}>{children}</Text>
    </View>
  )
}

export function Assinaturas({
  cliente,
  documento,
  empresaNome,
}: {
  cliente: string
  documento: string | null
  empresaNome: string
}) {
  return (
    <View style={estilos.assinaturas}>
      <View style={estilos.assinatura}>
        <Text style={estilos.nomeAssinatura}>{cliente}</Text>
        <Text style={estilos.papelAssinatura}>
          {documento ? `CPF/CNPJ ${mascararDocumento(documento)}` : 'Cliente'}
        </Text>
      </View>
      <View style={estilos.assinatura}>
        <Text style={estilos.nomeAssinatura}>{empresaNome}</Text>
        <Text style={estilos.papelAssinatura}>Responsável técnico</Text>
      </View>
    </View>
  )
}

export function Rodape({ empresa }: { empresa: DadosEmpresa }) {
  const contato = linhaDeContato(empresa)

  return (
    <View style={estilos.rodape} fixed>
      <Text>{[empresa.empresaNome, contato].filter(Boolean).join(' · ')}</Text>
      <Text
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  )
}

export { Document, Image, Page, Text, View, formatarData, formatarReais }
```

- [ ] **Passo 2: Conferir que compila**

```powershell
npm run build
```

Esperado: compila. `pdf.tsx` ainda usa a interface antiga do `Cabecalho` — se o build reclamar de `titulo` faltando, seguir para a Task 13 antes de tentar de novo; as duas tarefas fecham juntas.

Se preferir manter o build verde entre as duas, fazer as Tasks 12 e 13 num commit só.

- [ ] **Passo 3: Commit**

```bash
git add src/modulos/documentos/componentes.tsx
git commit -m "Da aos PDFs a moldura de papelaria comercial

Emblema centralizado e regua marinho na primeira pagina, faixa compacta nas
seguintes, blocos emoldurados, tabela numerada com coluna de unidade, caixa
de totais com filete teal, assinaturas e rodape com paginacao. Cores tiradas
do tema da tela.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Os três documentos

**Arquivos:**
- Modificar: `src/modulos/documentos/pdf.tsx`
- Modificar: `testes/integracao/documentos.test.ts`

**Interfaces:**
- Consome: tudo o que a Task 12 exporta; `valorPorExtenso` (Task 2)
- Produz: nada para tarefas seguintes

- [ ] **Passo 1: Escrever os testes que falham**

Acrescentar em `testes/integracao/documentos.test.ts`:

```ts
test('os três documentos saem como PDF válido', async () => {
  const { osId } = await cenarioOs()

  for (const tipo of ['comprovante', 'orcamento', 'recibo'] as const) {
    const documento = await gerarDocumento(tipo, osId)
    expect(documento).not.toBeNull()
    expect(documento?.conteudo.subarray(0, 4).toString()).toBe('%PDF')
    expect(documento?.conteudo.length).toBeGreaterThan(2000)
    expect(documento?.nomeArquivo).toMatch(/\.pdf$/)
  }
})

test('OS inexistente não gera documento', async () => {
  const documento = await gerarDocumento(
    'orcamento',
    '00000000-0000-0000-0000-000000000000',
  )
  expect(documento).toBeNull()
})
```

Manter os testes que o arquivo já tem.

- [ ] **Passo 2: Rodar e confirmar o estado atual**

```powershell
npm test -- testes/integracao/documentos.test.ts
```

Se passar já, tudo bem — são testes de fumaça, e servem de rede para a reescrita a seguir.

- [ ] **Passo 3: Reescrever `pdf.tsx`**

```tsx
import { renderToBuffer } from '@react-pdf/renderer'
import { formatarData } from '@/lib/datas'
import { formatarReais } from '@/lib/dinheiro'
import { valorPorExtenso } from '@/lib/extenso'
import { mascararTelefone } from '@/lib/mascaras'
import { obterConfiguracoes } from '@/modulos/configuracoes/consultas'
import { resumoDeCobrancaDaOs } from '@/modulos/financeiro/consultas'
import { obterOs, type OsCompleta } from '@/modulos/os/consultas'
import {
  Assinaturas,
  Bloco,
  Cabecalho,
  CabecalhoCompacto,
  CaixaDeTotais,
  Campo,
  Condicoes,
  Document,
  FaixaDocumento,
  Page,
  Rodape,
  TabelaDeItens,
  Text,
  View,
  estilos,
  type DadosEmpresa,
} from './componentes'

export type TipoDocumento = 'comprovante' | 'orcamento' | 'recibo'

export const TIPOS: Record<TipoDocumento, string> = {
  comprovante: 'Comprovante de recebimento',
  orcamento: 'Orçamento',
  recibo: 'Recibo de pagamento',
}

function BlocoCliente({ os }: { os: OsCompleta }) {
  return (
    <Bloco rotulo="Dados do cliente">
      <Campo rotulo="Nome" valor={os.cliente.nome} />
      {os.cliente.telefone ? (
        <Campo rotulo="Telefone" valor={mascararTelefone(os.cliente.telefone)} />
      ) : null}
    </Bloco>
  )
}

function BlocoEquipamento({ os }: { os: OsCompleta }) {
  return (
    <Bloco rotulo="Equipamento">
      <Campo rotulo="Descrição" valor={os.equipamento.descricao} />
      {os.equipamento.numeroSerie ? (
        <Campo rotulo="Número de série" valor={os.equipamento.numeroSerie} />
      ) : null}
    </Bloco>
  )
}

function Comprovante({ os, empresa }: { os: OsCompleta; empresa: DadosEmpresa }) {
  const documento = `Comprovante ${os.numero}`

  return (
    <Document>
      <Page size="A4" style={estilos.pagina}>
        <CabecalhoCompacto empresa={empresa} documento={documento} />
        <Cabecalho empresa={empresa} />
        <FaixaDocumento
          titulo="Comprovante de recebimento"
          numero={os.numero}
          emissao={os.recebidoEm}
        />

        <BlocoCliente os={os} />
        <BlocoEquipamento os={os} />

        <Bloco rotulo="Problema relatado">
          <Text>{os.problemaRelatado ?? 'Não informado.'}</Text>
        </Bloco>

        <Bloco rotulo="Acessórios recebidos">
          <Text>{os.acessoriosRecebidos ?? 'Nenhum.'}</Text>
        </Bloco>

        <Condicoes>
          Este comprovante atesta apenas o recebimento do equipamento. O orçamento é
          enviado depois do diagnóstico e o serviço só começa após a aprovação do
          cliente.
        </Condicoes>

        <Assinaturas
          cliente={os.cliente.nome}
          documento={os.cliente.documento ?? null}
          empresaNome={empresa.empresaNome}
        />

        <Rodape empresa={empresa} />
      </Page>
    </Document>
  )
}

function Orcamento({
  os,
  empresa,
  validadeDias,
}: {
  os: OsCompleta
  empresa: DadosEmpresa
  validadeDias: number
}) {
  const pecas = os.itens.filter((item) => item.tipo === 'peca')
  const servicos = os.itens.filter((item) => item.tipo === 'servico')
  const documento = `Orçamento ${os.numero}`

  const linhas = [
    { rotulo: 'Peças', valor: formatarReais(os.totais.pecasCentavos) },
    { rotulo: 'Serviços', valor: formatarReais(os.totais.servicosCentavos) },
  ]
  if (os.totais.descontoCentavos > 0) {
    linhas.push({
      rotulo: 'Desconto',
      valor: `-${formatarReais(os.totais.descontoCentavos)}`,
    })
  }

  return (
    <Document>
      <Page size="A4" style={estilos.pagina}>
        <CabecalhoCompacto empresa={empresa} documento={documento} />
        <Cabecalho empresa={empresa} />
        <FaixaDocumento
          titulo="Orçamento"
          numero={os.numero}
          emissao={os.orcadoEm ?? new Date()}
          validadeDias={validadeDias}
        />

        <BlocoCliente os={os} />
        <BlocoEquipamento os={os} />

        {os.diagnostico ? (
          <Bloco rotulo="Diagnóstico">
            <Text>{os.diagnostico}</Text>
          </Bloco>
        ) : null}

        <TabelaDeItens titulo="Peças" itens={pecas} />
        <TabelaDeItens titulo="Serviços" itens={servicos} />

        <CaixaDeTotais linhas={linhas} total={os.totais.totalCentavos} />

        <Condicoes>
          Orçamento sujeito a revisão caso o desmonte revele defeito não visível no
          diagnóstico. Qualquer alteração é comunicada antes da execução. Validade de{' '}
          {validadeDias} dias a contar da emissão.
        </Condicoes>

        <View style={{ marginTop: 12 }}>
          <Text style={estilos.titulo}>DE ACORDO — ASSINATURA E DATA</Text>
        </View>

        <Assinaturas
          cliente={os.cliente.nome}
          documento={os.cliente.documento ?? null}
          empresaNome={empresa.empresaNome}
        />

        <Rodape empresa={empresa} />
      </Page>
    </Document>
  )
}

function Recibo({
  os,
  empresa,
  pagoCentavos,
  saldoCentavos,
}: {
  os: OsCompleta
  empresa: DadosEmpresa
  pagoCentavos: number
  saldoCentavos: number
}) {
  const documento = `Recibo ${os.numero}`

  const linhas = [
    { rotulo: 'Total do serviço', valor: formatarReais(os.totais.totalCentavos) },
  ]
  if (saldoCentavos > 0) {
    linhas.push({ rotulo: 'Saldo em aberto', valor: formatarReais(saldoCentavos) })
  }

  return (
    <Document>
      <Page size="A4" style={estilos.pagina}>
        <CabecalhoCompacto empresa={empresa} documento={documento} />
        <Cabecalho empresa={empresa} />
        <FaixaDocumento titulo="Recibo" numero={os.numero} emissao={new Date()} />

        <BlocoCliente os={os} />
        <BlocoEquipamento os={os} />

        <CaixaDeTotais linhas={linhas} total={pagoCentavos} />

        {/* Valor por extenso: costume de recibo no Brasil. */}
        <Bloco rotulo="Valor recebido por extenso">
          <Text>{valorPorExtenso(pagoCentavos)}.</Text>
        </Bloco>

        <Condicoes>
          {saldoCentavos > 0
            ? `Recibo parcial: consta saldo em aberto de ${formatarReais(saldoCentavos)} referente a esta ordem de serviço.`
            : 'Recebemos o valor acima, dando plena quitação desta ordem de serviço.'}
        </Condicoes>

        <Assinaturas
          cliente={os.cliente.nome}
          documento={os.cliente.documento ?? null}
          empresaNome={empresa.empresaNome}
        />

        <Rodape empresa={empresa} />
      </Page>
    </Document>
  )
}

/** Gera o PDF pedido. `null` quando a OS não existe. */
export async function gerarDocumento(
  tipo: TipoDocumento,
  osId: string,
): Promise<{ conteudo: Buffer; nomeArquivo: string } | null> {
  const os = await obterOs(osId)
  if (!os) return null

  const configuracoes = await obterConfiguracoes()
  const empresa: DadosEmpresa = {
    empresaNome: configuracoes.empresaNome,
    empresaCnpj: configuracoes.empresaCnpj,
    empresaTelefone: configuracoes.empresaTelefone,
    empresaEndereco: configuracoes.empresaEndereco,
  }

  let documento
  if (tipo === 'comprovante') {
    documento = <Comprovante os={os} empresa={empresa} />
  } else if (tipo === 'orcamento') {
    documento = (
      <Orcamento
        os={os}
        empresa={empresa}
        validadeDias={configuracoes.orcamentoValidadeDias}
      />
    )
  } else {
    const cobranca = await resumoDeCobrancaDaOs(osId)
    documento = (
      <Recibo
        os={os}
        empresa={empresa}
        pagoCentavos={cobranca.pagoCentavos}
        saldoCentavos={cobranca.saldoCentavos}
      />
    )
  }

  return {
    conteudo: await renderToBuffer(documento),
    nomeArquivo: `${tipo}-${os.numero}.pdf`,
  }
}
```

**Se `os.cliente.documento` não existir em `OsCompleta`:** abrir `src/modulos/os/consultas.ts`, achar o `.select({…})` que monta o cliente e acrescentar `documento: clientes.documento`. A consulta escolhe colunas uma a uma.

- [ ] **Passo 4: Rodar os testes**

```powershell
npm test -- testes/integracao/documentos.test.ts
npm run build
```

Esperado: PASS e build limpo.

- [ ] **Passo 5: Conferir os três PDFs a olho**

Layout de PDF não se testa bem em automação. Subir a aplicação, abrir uma OS com peças, serviços e desconto, e baixar os três documentos:

```powershell
.\scripts\iniciar.ps1
```

Conferir, em cada um:

- Emblema centralizado, nítido e redondo — não esticado
- Nome da empresa em caixa alta, com a régua marinho abaixo
- CNPJ e telefone **pontuados**
- Blocos de cliente e equipamento emoldurados e alinhados
- Tabela com a coluna IT numerada, cabeçalho cinza e zebra
- Filete teal acima do TOTAL
- Duas linhas de assinatura lado a lado, sem estourar a margem
- Rodapé com `Página 1 de 1`

Depois, um orçamento com **muitos itens** (acrescentar itens até passar de uma página) para conferir que a segunda página traz a faixa compacta, repete o cabeçalho da tabela e numera `Página 2 de 2`.

Parar o servidor no fim.

- [ ] **Passo 6: Rodar a suíte inteira**

```powershell
npm test
npm run teste:e2e
npm run build
```

Esperado: tudo verde.

- [ ] **Passo 7: Commit**

```bash
git add src/modulos/documentos/pdf.tsx testes/integracao/documentos.test.ts
git commit -m "Reescreve comprovante, orcamento e recibo na moldura nova

Comprovante sem valores, com problema e acessorios. Orcamento com tabela por
tipo, totais, validade e linha de aceite. Recibo com o valor por extenso,
como manda o costume brasileiro. CNPJ e telefone saem pontuados.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Auto-revisão do plano

**Cobertura da spec** — cada seção tem tarefa:

| Seção da spec | Tarefa |
|---|---|
| 1. Compras digitáveis — componente | Task 9 |
| 1. Compras digitáveis — servidor | Tasks 8 e 10 |
| 1. Compras digitáveis — tela | Task 11 |
| 2. Despesa "Outros" | Task 7 |
| 3. Máscaras — funções | Task 1 |
| 3. Máscaras — componente e telas | Task 3 |
| 3. Máscaras — exibição nos PDFs | Task 12 |
| 4. Máquina "Outro" — domínio | Task 4 |
| 4. Máquina "Outro" — telas | Task 5 |
| 5. Erro que não apaga | Task 6 |
| 6. PDFs — moldura | Task 12 |
| 6. PDFs — por documento | Task 13 |
| 6. PDFs — valor por extenso | Tasks 2 e 13 |
| Migrações | Tasks 4 e 7 |

**Consistência de nomes entre tarefas** — conferidos: `normalizarTexto`, `apenasDigitos`, `mascararDocumento`, `mascararTelefone`, `mascararCep`, `COMPRIMENTOS`, `valorPorExtenso`, `CampoMascarado`, `CampoCombo`, `criarPecaMinima`, `criarFornecedorMinimo`, `aplicacaoOutra`, `Resultado.valores`, `falhaDeValidacao(erro, valores?)`. Os campos ocultos do combobox são `<nome>Id` e `<nome>Nome`, e a Task 10 lê exatamente `pecaId`, `pecaNome`, `fornecedorId`, `fornecedorNome`, `unidadeNova`.

**Riscos anotados nas tarefas:**

- Task 3 muda quatro formulários de uma vez — o build é o que pega erro de tipo
- Task 11 **quebra** um teste ponta a ponta existente; a reescrita está no plano
- Task 12 deixa o build vermelho até a Task 13; as duas podem virar um commit só
- Task 13 depende de `os.cliente.documento` existir em `OsCompleta` — o passo diz o que fazer se não existir
- O `unidadeNova` precisa ser sempre renderizado (escondido por CSS) para as listas do `getAll` não desalinharem
