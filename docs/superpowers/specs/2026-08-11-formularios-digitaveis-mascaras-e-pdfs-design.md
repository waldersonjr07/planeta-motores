# Formulários digitáveis, máscaras e PDFs profissionais

Seis mudanças pedidas de uma vez. Cinco são de preenchimento — tirar atrito de
quem digita com o cliente na frente. A sexta é de saída: dar aos PDFs a
identidade da empresa e o formato que o mercado brasileiro espera.

Elas cabem num plano só porque não se cruzam: cada uma toca um formulário ou o
gerador de documento, e nenhuma depende da outra para funcionar.

## Situação que motiva

| Pedido | Como está hoje |
|---|---|
| Compras digitáveis | Fornecedor, OS e Peça são `<select>` fechados. Peça nova obriga a sair da tela, cadastrar em Estoque e voltar |
| Despesa "Outros" | `descricao` é exigida em toda despesa, mesmo quando a categoria já diz tudo ("Energia") |
| Máscara de CPF e telefone | Campos aceitam texto cru. O banco guarda só dígitos, e a tela devolve `48999999999` |
| Cadastro rápido "Outro" | Grava o enum `outro` e perde a informação. A descrição sai "Outro Husqvarna 236 (2T)" |
| Erro apaga o formulário | Reprovou a validação, a tela volta em branco e tudo é digitado de novo |
| PDFs | Cabeçalho enxuto, sem estrutura de papelaria comercial. CNPJ sai sem pontuação |

## Decisões tomadas

Registradas com o motivo, porque cada uma teve alternativa descartada.

**Peça e fornecedor nascem na tela de compra; OS não.** Peça e fornecedor
exigem só o nome no banco — o resto tem valor padrão. Já uma OS nasce de um
equipamento recebido do cliente, com problema relatado e situação inicial;
inventar uma a partir da tela de compra criaria OS órfã. Então a OS fica
digitável no sentido de "filtra enquanto digita", sem opção de criar.

**Texto livre puro na peça foi descartado.** A compra grava movimento de
estoque amarrado ao `pecaId` e atualiza o último custo da peça. Peça como texto
solto quebraria os dois.

**A unidade entra junto com a peça nova.** A oficina compra óleo em litro e a
quantidade é `numeric(12,3)`. Peça nova caindo em `un` por omissão faria 0,5 L
de óleo virar meia unidade no saldo.

**`despesas.descricao` passa a aceitar nulo, em vez de guardar o rótulo da
categoria.** Gravar a string "Outros" no lugar de vazio duplicaria no texto o
que a coluna `categoria` já diz, e apareceria como descrição de verdade na hora
de editar.

**A máquina "Outro" ganha coluna própria, não vai para `observacoes`.**
`aplicacao_outra` é dado identificador do equipamento, usado para montar a
descrição em tela, PDF e WhatsApp. Em `observacoes` viraria texto que ninguém
consegue ler de forma estruturada.

**Dizer qual é a máquina é obrigatório quando "Outro" está escolhido.** É
justamente o buraco de hoje: equipamento no cadastro sem ninguém saber o que é.

**O cabeçalho grande do PDF só sai na primeira página.** O emblema centralizado
ocupa espaço vertical; num orçamento comprido empurraria a tabela para a página
seguinte. Da segunda em diante repete-se uma faixa compacta.

**Fonte Helvetica, embutida no gerador.** Baixar arquivo de fonte quebraria a
emissão com a oficina sem internet.

## 1. Compras digitáveis

### Componente

`src/componentes/campo-combo.tsx` — cliente. Input de texto com lista filtrada
abaixo, navegável por teclado (setas, Enter, Esc), seguindo o padrão ARIA de
combobox: `role="combobox"`, `aria-expanded`, `aria-activedescendant`,
`role="listbox"` na lista.

Interface:

```ts
type OpcaoCombo = { id: string; texto: string }

type PropsCampoCombo = {
  rotulo: string
  nome: string            // prefixo dos campos ocultos
  opcoes: OpcaoCombo[]
  permiteCriar?: boolean  // false na OS
  textoCriar?: string     // 'Cadastrar "…" como peça nova'
  erro?: string
  className?: string
  aoMudar?: (estado: { id: string | null; novo: string | null }) => void
}
```

Emite dois campos ocultos por instância:

- `<nome>Id` — o uuid, quando a escolha veio da lista
- `<nome>Nome` — o texto digitado, quando não casou com nada e `permiteCriar`

Nunca os dois preenchidos ao mesmo tempo. Digitar exatamente o nome de uma
opção existente casa com ela em vez de propor criação, comparando sem
acento e sem diferenciar maiúscula.

`aoMudar` existe para a linha de item revelar o seletor de unidade quando a
peça for nova.

### Tela

`src/app/(app)/compras/nova/formulario.tsx`:

| Campo | `permiteCriar` | Observação |
|---|---|---|
| Fornecedor | sim | Cadastra com o nome apenas |
| OS que motivou a compra | **não** | Só filtra o que existe |
| Peça (por linha) | sim | Revela o seletor `un / L / mL` quando nova |

O seletor de unidade da linha chama-se `unidadeNova` e só é enviado quando há
`pecaNome` na mesma linha. Padrão `un`.

### Servidor

`src/modulos/catalogo/pecas-operacoes.ts` ganha:

```ts
export async function criarPecaMinima(
  nome: string,
  unidade: 'un' | 'L' | 'mL',
  tx?: Transacao,
): Promise<{ id: string }>
```

`src/modulos/catalogo/fornecedores-operacoes.ts` ganha:

```ts
export async function criarFornecedorMinimo(
  nome: string,
  tx?: Transacao,
): Promise<{ id: string }>
```

Ambas seguem o formato de `registrarMovimento`: recebem transação opcional e
usam `tx ?? db`. Devolvem o id direto, não `Resultado` — quem valida o nome é o
esquema Zod de quem chama.

`registrarCompra` em `src/modulos/compras/operacoes.ts` passa a resolver, dentro
da transação que já existe e **antes** de inserir a compra:

1. `fornecedorNome` preenchido → `criarFornecedorMinimo(nome, tx)`
2. Para cada item com `pecaNome` → `criarPecaMinima(nome, unidade, tx)`

Peça nova repetida em duas linhas da mesma compra é criada uma vez só, casando
pelo nome normalizado.

A regra do projeto — módulo não escreve tabela de outro — se mantém: o `compras`
chama função exportada pelo `catalogo`, como já chama `registrarMovimento` do
`estoque`.

### Esquema

`src/modulos/compras/esquemas.ts`: cada item aceita `pecaId` **ou** `pecaNome` +
`unidade`, e a compra aceita `fornecedorId` **ou** `fornecedorNome`. Validado
com `z.union` mais `superRefine` para a mensagem "Selecione a peça ou digite o
nome de uma nova".

## 2. Despesa "Outros"

**Migração:** `despesas.descricao` deixa de ser `not null`.

**Esquema** (`src/modulos/financeiro/esquemas.ts`): `descricao` vira opcional,
com `trim`, virando `null` quando vazia.

**Formulário** (`src/app/(app)/financeiro/despesa-formulario.tsx`): campo
Descrição só é renderizado quando `categoria === 'outros'`, com o rótulo
"Especifique (opcional)". Trocar a categoria de volta limpa o campo, para não
enviar texto invisível.

**Listagem** (`src/app/(app)/financeiro/page.tsx`): descrição nula mostra `—`.

## 3. Máscaras de CPF/CNPJ e telefone

### Funções puras

`src/lib/mascaras.ts` — sem React, testáveis em Vitest:

```ts
export function mascararDocumento(valor: string): string
export function mascararTelefone(valor: string): string
export function mascararCep(valor: string): string
```

Recebem qualquer texto, extraem os dígitos com o `apenasDigitos` que já existe
em `src/lib/validacao.ts`, e devolvem o texto pontuado.

Comportamento, dígito a dígito:

| Dígitos | `mascararDocumento` | `mascararTelefone` |
|---|---|---|
| 2 | `12.` | `(12) ` |
| 3 | `123.` | `(12) 3` |
| 6 | `123.456.` | `(12) 3456` |
| 9 | `123.456.789-` | `(12) 3456-789` |
| 10 | `123.456.789-0` | `(12) 3456-7890` |
| 11 | `123.456.789-01` (CPF) | `(12) 34567-8901` |
| 12 | `12.345.678/9012-` | trunca em 11 |
| 14 | `12.345.678/9012-34` (CNPJ) | trunca em 11 |

O documento se reorganiza sozinho de CPF para CNPJ ao passar do 11º dígito. O
telefone acomoda 10 e 11 dígitos movendo o traço: com 10, ele fica depois do
quarto dígito do número; com 11, depois do quinto.

Regra do separador à direita: o ponto, a barra e o traço aparecem **assim que**
o grupo anterior fecha, para o próximo dígito já cair depois deles. O parêntese
do DDD abre no primeiro dígito e fecha, com espaço, assim que o segundo é
digitado — o terceiro dígito já entra como início do número.

### Componente

`src/componentes/campo-mascarado.tsx` — cliente. Envolve o `Campo` existente,
guarda o texto em estado e aplica a máscara em cada tecla.

```ts
type PropsCampoMascarado = {
  rotulo: string
  nome: string
  mascara: 'documento' | 'telefone' | 'cep'
  defaultValue?: string
  erro?: string
  className?: string
  required?: boolean
}
```

Detalhes que precisam estar certos:

- `inputMode="numeric"` — teclado numérico no celular
- Cursor no fim quando se digita no fim; apagar sobre um separador apaga o
  dígito anterior junto, para o backspace não travar
- `defaultValue` vindo do banco (só dígitos) é mascarado na montagem
- `maxLength` calculado pela máscara

**O servidor não muda.** `documentoOpcional`, `telefoneOpcional` e `cepOpcional`
já passam por `apenasDigitos` antes de validar, então a pontuação é descartada
sozinha e o banco continua guardando dígitos limpos.

### Onde entra

Digitação:

- `src/app/(app)/ordens-servico/nova/formulario.tsx` — cadastro rápido
- `src/app/(app)/clientes/formulario.tsx` — CPF/CNPJ, telefone, CEP
- `src/app/(app)/catalogo/fornecedores/formulario.tsx` — telefone
- `src/app/(app)/configuracoes/formulario.tsx` — CNPJ e telefone da empresa

Exibição (as mesmas funções, agora que existem):

- Cabeçalho dos PDFs — CNPJ e telefone da empresa
- Ficha e listagem de clientes
- Bloco de dados do cliente nos PDFs

## 4. Cadastro rápido — máquina "Outro"

**Migração:** `alter table equipamentos add column aplicacao_outra text`.

**Schema Drizzle** (`src/db/schema/clientes.ts`): `aplicacaoOutra: text('aplicacao_outra')`.

**Validação** (`src/modulos/clientes/equipamentos-esquemas.ts` e o
`entradaOsRapida` de `src/modulos/os/esquemas.ts`): `superRefine` exigindo
`aplicacaoOutra` não vazia quando `aplicacao === 'outro'`, com a mensagem
"Diga qual é a máquina" presa ao caminho `aplicacaoOutra` — assim
`falhaDeValidacao` a entrega ao campo certo.

Quando a aplicação não é "outro", `aplicacaoOutra` é gravada como nula, mesmo
que o formulário mande texto de uma escolha anterior.

**Descrição** (`src/modulos/clientes/equipamentos-descricao.ts`):

```ts
descreverEquipamento({ aplicacao: 'outro', aplicacaoOutra: 'Cortador de grama',
                       marca: 'Husqvarna', modelo: '236', tipoMotor: '2T' })
// → 'Cortador de grama Husqvarna 236 (2T)'
```

Sem `aplicacaoOutra`, cai em "Outro" como hoje — registros antigos continuam
funcionando.

Como tela, PDF e mensagem de WhatsApp já chamam essa função, os três se
corrigem juntos.

**Telas:** o campo "Qual máquina?" aparece logo abaixo do seletor, no cadastro
rápido e em `src/app/(app)/clientes/[id]/equipamento-formulario.tsx`.

## 5. Erro que não apaga o formulário

### Causa

Não é a validação. É o React 19: ao terminar a ação de um `<form action={…}>`,
ele reseta os campos não controlados — dê erro ou não. O `useActionState`
devolve os erros corretamente; o que se perde são os valores no DOM.

### Correção

`src/lib/resultado.ts` — a falha passa a poder carregar o que foi digitado:

```ts
export type EcoDoFormulario = {
  valores?: Record<string, string>
  listas?: Record<string, string[]>
}

export type Resultado<T> =
  | { ok: true; dados: T }
  | ({ ok: false; erro: string
       campos?: Record<string, string> } & EcoDoFormulario)

export function falha(
  erro: string,
  extras?: { campos?: Record<string, string> } & EcoDoFormulario,
): Resultado<never>

export function falhaDeValidacao(
  erro: ZodError,
  eco?: EcoDoFormulario,
): Resultado<never>
```

`campos` continua sendo mensagem por campo; `valores` é o eco do que foi
enviado. Todos são opcionais.

**`listas` existe por causa da compra.** Aquele formulário repete `pecaId`,
`pecaNome`, `unidadeNova`, `quantidade` e `custo` uma vez por linha de item, e
montar o eco com `Object.fromEntries(formData)` colapsaria as repetições na
última linha. O cabeçalho vai em `valores`; as linhas vão em `listas`, na ordem
em que o navegador as entrega — a mesma ordem em que a ação as lê para formar
os itens, e a mesma em que a tela as devolve aos campos.

O eco também viaja nas falhas que não são de esquema — "Informe o custo da
linha 2." é a reprovação mais comum da compra, e é justamente sobre uma linha
de item; devolvê-la sem o eco apagaria o que causou o erro.

`acaoCriarOs` e `acaoRegistrarCompra` passam o `dados` que já montam a partir do
`FormData`.

No formulário, os campos leem `resultado.valores?.<nome>` como `defaultValue`, e
o elemento raiz recebe uma `key` que muda a cada tentativa. A `key` é necessária
porque trocar `defaultValue` não altera um input já montado — o remonte é o que
faz o valor voltar. Na compra, cada linha de item recebe
`key={`${tentativa}:${linha}`}` e lê `resultado.listas?.<nome>?.[linha]`.

O `CampoCombo` não tem `defaultValue`: guarda o texto em estado. Para participar
do remonte ele recebe `idInicial` e `textoInicial`, lidos só na montagem.

Aplicado em:

- `src/app/(app)/ordens-servico/nova/formulario.tsx` — o pedido
- `src/app/(app)/compras/nova/formulario.tsx` — mesmo defeito, formulário longo

**Fora, de propósito:** `src/app/(auth)/entrar/formulario.tsx`. Senha não se
devolve para a tela.

## 6. PDFs com a identidade da empresa

Reescreve `src/modulos/documentos/componentes.tsx` e ajusta
`src/modulos/documentos/pdf.tsx`. Os três documentos passam a compartilhar a
mesma moldura.

### Paleta e tipografia

Do tema do sistema (`src/app/globals.css`), para papel e tela combinarem:

| Uso | Cor |
|---|---|
| Títulos, réguas, TOTAL | marinho `#16283f` |
| Fundo do cabeçalho da tabela | realce `#eef1f5` |
| Filete acima do total | teal `#5fb3b8` |
| Texto secundário e rodapé | `#5b6976` |
| Linhas da tabela | borda `#dde2e8` |

Helvetica e Helvetica-Bold, já embutidas no `@react-pdf/renderer`. Corpo em
9,5 pt; título do documento em 13 pt; rodapé em 7,5 pt.

### Moldura

**Primeira página** — emblema circular centralizado (56 pt), `PLANETA MOTORES`
em caixa alta com espaçamento entre letras, `Atendimento Especializado`, uma
linha com CNPJ formatado e telefone formatado, outra com o endereço. Régua
marinho de 2 pt fechando o bloco.

**Páginas seguintes** — faixa compacta repetida (`fixed`): emblema de 18 pt,
nome da empresa e, à direita, o tipo e o número do documento.

**Faixa do documento** — título à esquerda (`ORÇAMENTO Nº 2026-0184`), emissão
à direita; validade abaixo, no orçamento.

**Blocos emoldurados** — `DADOS DO CLIENTE` (nome, CPF/CNPJ formatado, telefone
formatado, endereço quando houver) e `EQUIPAMENTO` (descrição, número de série,
marca e modelo). Borda fina, rótulo em caixa alta pequena sobre a moldura.

**Tabela de itens** — colunas `IT` (sequencial com dois dígitos), `DESCRIÇÃO`,
`UN`, `QTD`, `V. UNIT.`, `TOTAL`. Cabeçalho com fundo de realce. Zebra sutil
nas linhas pares. Cabeçalho repetido em quebra de página.

**Caixa de totais** — alinhada à direita, 200 pt: subtotal de peças, subtotal de
serviços, desconto quando houver, e o TOTAL separado pelo filete teal, em
negrito marinho.

**Condições** — o texto que hoje mora no rodapé, agora sob o título `CONDIÇÕES`.

**Assinaturas** — duas linhas lado a lado. À esquerda, o cliente, com nome e
CPF abaixo; à direita, `Planeta Motores` e `Responsável técnico`.

**Rodapé fixo** — razão social, CNPJ e telefone à esquerda; `Página X de Y`
à direita, pelo `render` de página do `@react-pdf/renderer`.

### Por documento

| Documento | Particularidade |
|---|---|
| Comprovante de recebimento | Sem valores. Blocos `PROBLEMA RELATADO` e `ACESSÓRIOS RECEBIDOS`. Assinatura só do cliente |
| Orçamento | Tabela dividida em Peças e Serviços, totais, validade e linha de aceite: `De acordo — assinatura e data` |
| Recibo | Valor pago em algarismos e **por extenso**. Saldo em aberto quando houver |

### Valor por extenso

`src/lib/extenso.ts`:

```ts
export function valorPorExtenso(centavos: number): string
// 22000 → 'duzentos e vinte reais'
// 22050 → 'duzentos e vinte reais e cinquenta centavos'
//     0 → 'zero real'
//   100 → 'um real'
```

Função pura, sem dependência nova. Casos que o teste precisa cobrir: um real no
singular, centavos sozinhos, "e" antes da centena final, cento contra cem, mil
sem "um" na frente, e plural de milhão.

## Testes

Seguindo a divisão que o projeto já usa.

**Unidade** (Vitest, funções puras):

- `mascararDocumento`, `mascararTelefone`, `mascararCep` — cada comprimento da
  tabela acima, texto sujo, campo vazio, e a virada de CPF para CNPJ
- `valorPorExtenso` — os casos listados
- `descreverEquipamento` — com e sem `aplicacaoOutra`, e aplicação diferente de
  "outro" ignorando o texto

**Integração** (contra Postgres real):

- Compra criando peça e fornecedor novos: a compra entra, a peça existe com a
  unidade escolhida, o movimento de estoque foi gravado e o último custo subiu
- Peça nova repetida em duas linhas cria **uma** peça
- Falha no meio da transação não deixa peça nem fornecedor órfão
- Compra com peça existente continua funcionando como antes
- Despesa "Outros" sem descrição grava nulo e aparece na listagem
- Equipamento com aplicação "outro" sem texto é reprovado, com a mensagem no
  caminho `aplicacaoOutra`

**Ponta a ponta** (Playwright):

- Cadastro rápido reprovado mantém nome, CPF e telefone preenchidos, e mostra o
  erro no campo que falhou
- Nova compra: digitar peça inexistente, escolher "Cadastrar", concluir, e ver o
  saldo somado na tela de Estoque
- Trocar a categoria da despesa para "Outros" revela o campo; voltar esconde

**PDF** — teste de fumaça por documento: gera o buffer, confirma que não está
vazio e que começa com `%PDF`. Layout de PDF não se testa bem em automação; a
conferência é visual, abrindo os três.

## Migrações

Duas, geradas com `npm run banco:gerar`:

1. `equipamentos.aplicacao_outra` — coluna nova, texto, aceita nulo
2. `despesas.descricao` — deixa de ser `not null`

Nenhuma apaga dado nem exige preencher registro antigo.

## Fora de escopo

- Validar dígito verificador de CPF e CNPJ. A máscara é de digitação; conferir
  se o documento existe é outro assunto, e a oficina cadastra cliente com o
  documento que o cliente informa
- Trocar os `<select>` de outras telas por combobox. Só a tela de compras foi
  pedida
- Editar compra depois de registrada
- Máscara de moeda nos campos de valor. `parsearReais` já aceita o que a
  Lucilene digita
