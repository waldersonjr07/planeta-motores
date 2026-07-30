# Planeta Motores — Plano 3: Financeiro, Documentos e Implantação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o sistema: pagamentos e contas a receber, despesas e resultado do mês, os três PDFs, as mensagens de WhatsApp, o painel de pendências, a exportação em CSV e o pacote de implantação na VPS.

**Architecture:** Mesmas convenções dos Planos 1 e 2. Duas coisas novas: o financeiro é **regime de caixa e derivado** — condição de cobrança e contas a receber são consulta, nunca coluna; e os PDFs são gerados no servidor com `@react-pdf/renderer`, que produz arquivo real sem exigir Chromium na VPS.

**Tech Stack:** acrescenta `@react-pdf/renderer`. Nada mais.

**Spec:** `docs/superpowers/specs/2026-07-29-planeta-motores-design.md` (seções 9, 11 e 14)

## Global Constraints

Valem todas dos planos anteriores. Mais estas:

- **Cobrança é derivada.** `em_aberto` / `parcial` / `quitada` / `sem_valor` vêm de `soma(pagamentos)` contra o total da OS. Não existe coluna de situação de pagamento.
- **Pagamento nunca excede o saldo devedor.** A mensagem de erro informa o saldo correto.
- **Resultado do mês é caixa puro:** entradas = pagamentos do período; saídas = compras + despesas do período. Compra de peça é a despesa de peça e não é lançada duas vezes.
- **A entrega com saldo devedor avisa, mas não bloqueia.** Quem decide é a Lucilene.
- Mensagem de WhatsApp é montada e aberta; o envio é manual.

## Estrutura de arquivos

**`src/db/schema/financeiro.ts`** — `pagamentos`, `despesas`, enums `formaPagamento` e `categoriaDespesa`

| Módulo | Arquivos |
|---|---|
| `financeiro/` | `cobranca.ts` (puro), `esquemas.ts`, `consultas.ts`, `operacoes.ts`, `acoes.ts` |
| `documentos/` | `comprovante.tsx`, `orcamento.tsx`, `recibo.tsx`, `pdf.ts` |
| `avisos/` | `mensagens.ts` (puro), `whatsapp.ts` |
| `painel/` | `consultas.ts` |
| `exportacao/` | `csv.ts` |

**Telas e rotas:** `(app)/painel/`, `(app)/financeiro/` (a receber, despesas, resultado), aba Pagamentos na ficha da OS, `api/documentos/[tipo]/[osId]/route.ts`, `api/exportacao/route.ts`.

**Implantação:** `Dockerfile`, `docker-compose.prod.yml`, `Caddyfile`, `docs/implantacao.md`.

---

### Task 1: Schema financeiro

**Files:** `src/db/schema/financeiro.ts`, modificar `index.ts` · **Test:** `testes/integracao/schema-financeiro.test.ts`

```ts
export const formaPagamento = pgEnum('forma_pagamento', [
  'dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia',
])

export const categoriaDespesa = pgEnum('categoria_despesa', [
  'ferramenta', 'aluguel', 'energia', 'combustivel', 'outros',
])

export const pagamentos = pgTable('pagamentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  osId: uuid('os_id').notNull().references(() => ordensServico.id, { onDelete: 'cascade' }),
  valorCentavos: integer('valor_centavos').notNull(),
  forma: formaPagamento('forma').notNull(),
  data: date('data').notNull(),
  observacao: text('observacao'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const despesas = pgTable('despesas', {
  id: uuid('id').primaryKey().defaultRandom(),
  data: date('data').notNull(),
  categoria: categoriaDespesa('categoria').notNull().default('outros'),
  descricao: text('descricao').notNull(),
  valorCentavos: integer('valor_centavos').notNull(),
  fornecedorId: uuid('fornecedor_id').references(() => fornecedores.id, { onDelete: 'set null' }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})
```

Testes: pagamento nasce com data e valor; apagar a OS apaga seus pagamentos; despesa exige descrição e valor.

- [ ] Escrever o teste, ver falhar, implementar, migrar, rodar, commitar

---

### Task 2: Condição de cobrança (pura)

**Files:** `src/modulos/financeiro/cobranca.ts` · **Test:** `testes/unidade/cobranca.test.ts`

**Interfaces:**
- `type CondicaoCobranca = 'sem_valor' | 'em_aberto' | 'parcial' | 'quitada'`
- `CONDICOES: Record<CondicaoCobranca, string>` — rótulos
- `condicaoDeCobranca(totalCentavos: number, pagoCentavos: number): CondicaoCobranca`
- `saldoDevedor(totalCentavos: number, pagoCentavos: number): number`

```ts
export function condicaoDeCobranca(total: number, pago: number): CondicaoCobranca {
  if (total <= 0) return 'sem_valor'
  if (pago <= 0) return 'em_aberto'
  if (pago >= total) return 'quitada'
  return 'parcial'
}

export function saldoDevedor(total: number, pago: number): number {
  return Math.max(0, total - pago)
}
```

Testes: total zero é `sem_valor` mesmo com pagamento; nada pago é `em_aberto`; pago parcial é `parcial`; pago igual ao total é `quitada`; saldo nunca é negativo.

- [ ] Escrever o teste, ver falhar, implementar, rodar, commitar

---

### Task 3: Pagamentos e contas a receber

**Files:** `src/modulos/financeiro/esquemas.ts`, `consultas.ts`, `operacoes.ts` · **Test:** `testes/integracao/financeiro-pagamentos.test.ts`

**Interfaces:**
- `registrarPagamento(entrada: { osId; valorCentavos; forma; data; observacao? }): Promise<Resultado<{ id }>>`
- `removerPagamento(id): Promise<Resultado<null>>`
- `listarPagamentosDaOs(osId)`
- `resumoDeCobrancaDaOs(osId): Promise<{ totalCentavos; pagoCentavos; saldoCentavos; condicao }>`
- `listarContasAReceber(): Promise<{ osId; numero; clienteNome; totalCentavos; pagoCentavos; saldoCentavos; entregueEm; diasEmAberto }[]>`

Regras cobertas por teste:
1. Pagamento reduz o saldo e muda a condição para `parcial`
2. Pagamento igual ao saldo deixa a OS `quitada`
3. Pagamento acima do saldo é recusado, com o saldo na mensagem
4. Vários pagamentos somam (sinal + saldo na entrega)
5. Remover pagamento devolve o saldo
6. Contas a receber traz só OS com saldo > 0, ordenada da mais antiga
7. OS entregue e quitada não aparece em contas a receber
8. Os dias em aberto contam a partir da entrega, não da abertura

---

### Task 4: Despesas e resultado do mês

**Files:** acrescentar a `financeiro/consultas.ts` e `operacoes.ts` · **Test:** `testes/integracao/financeiro-resultado.test.ts`

**Interfaces:**
- `registrarDespesa(entrada)`, `removerDespesa(id)`, `listarDespesas(periodo)`
- `resultadoDoPeriodo(de: string, ate: string): Promise<{ entradasCentavos; comprasCentavos; despesasCentavos; saidasCentavos; resultadoCentavos }>`

Regras cobertas por teste: entradas somam só pagamentos do período; saídas somam compras e despesas do período; lançamento fora do período fica de fora; compra não é contada duas vezes; período sem movimento devolve zeros; resultado é entradas menos saídas e pode ser negativo.

---

### Task 5: Aba de pagamentos e telas do financeiro

**Files:** `financeiro/acoes.ts`, `(app)/ordens-servico/[id]/aba-pagamentos.tsx`, `(app)/financeiro/page.tsx`, `a-receber/`, `despesas/` · **Test:** `testes/e2e/financeiro.spec.ts`

A aba Pagamentos mostra os pagamentos lançados, o saldo devedor e o formulário de lançamento. A tela Financeiro tem três seções: contas a receber por antiguidade, despesas do mês e o resultado do período.

**Aviso na entrega:** ao entregar uma OS com saldo devedor, a ficha exibe o alerta com o valor em aberto — sem impedir a transição.

---

### Task 6: Os três PDFs

**Files:** `src/modulos/documentos/*`, `api/documentos/[tipo]/[osId]/route.ts` · **Test:** `testes/integracao/documentos.test.ts`

```bash
npm install @react-pdf/renderer
```

Três documentos com cabeçalho vindo de `configuracoes`: **comprovante de recebimento** (equipamento, acessórios, problema relatado, número e data), **orçamento** (itens separados entre peças e serviços, desconto, total, validade) e **recibo de pagamento** (valor, forma, data, saldo restante).

A rota exige sessão, como a de fotos. Teste: gera os três, confere que o retorno começa com `%PDF` e que o total impresso bate com o da OS.

---

### Task 7: Mensagens de WhatsApp

**Files:** `src/modulos/avisos/mensagens.ts` (puro), `whatsapp.ts` · **Test:** `testes/unidade/mensagens.test.ts`

- `preencherModelo(modelo: string, valores: Record<string, string>): string` — troca `{{cliente}}`, `{{numero}}`, `{{equipamento}}`, `{{total}}`, `{{saldo}}`
- `linkDoWhatsapp(telefone: string, mensagem: string): string` — `https://wa.me/55XXXXXXXXXXX?text=…`

Testes: substitui todas as ocorrências; marcador sem valor vira texto vazio em vez de aparecer cru; telefone sem DDI recebe `55`; telefone já com `55` não duplica; a mensagem é codificada para URL.

Na ficha da OS, um botão por situação (orçamento pronto, serviço pronto, cobrança) abre o WhatsApp com o texto montado.

---

### Task 8: Painel

**Files:** `src/modulos/painel/consultas.ts`, `(app)/painel/page.tsx` · **Test:** `testes/integracao/painel.test.ts`

Indicadores: na oficina, aguardando aprovação, pronto para entrega, a receber, resultado do mês. Listas: "precisa de ação hoje" (orçamento sem resposta, peça sem chegar, motor pronto sem retirar, com os dias parados) e "cobranças em aberto". Acrescentar Painel ao menu.

---

### Task 9: Exportação em CSV

**Files:** `src/modulos/exportacao/csv.ts`, `api/exportacao/route.ts` · **Test:** `testes/unidade/csv.test.ts`, `testes/integracao/exportacao.test.ts`

Um `.zip` com um CSV por tabela: clientes, equipamentos, ordens de serviço, itens, pagamentos, despesas, compras e movimentos de estoque.

Testes do serializador: campo com vírgula é aspeado; aspas internas são duplicadas; quebra de linha dentro do campo é preservada; nulo vira vazio; o cabeçalho sai na primeira linha.

Botão em Configurações. Oficina que perde a carteira de clientes não reabre — e os dados não podem ficar reféns de provedor nenhum.

---

### Task 10: Pacote de implantação

**Files:** `Dockerfile`, `docker-compose.prod.yml`, `Caddyfile`, `.dockerignore`, `docs/implantacao.md`, ajuste em `next.config.ts` (`output: 'standalone'`)

Três serviços: **app** (Next.js), **postgres** (volume próprio) e **caddy** (proxy reverso com HTTPS automático). As fotos em volume montado. O `docs/implantacao.md` traz o passo a passo na VPS: criar usuário sem privilégio, instalar Docker, clonar, preencher `.env`, subir, criar o usuário da Lucilene, apontar o DNS e **contratar o snapshot do provedor**.

Verificação: `docker compose -f docker-compose.prod.yml config` valida a composição sem subir nada.

---

## Verificação final

- [ ] `npm test`, `npx playwright test`, `npm run build`
- [ ] Conferência à mão: OS com sinal e saldo, cobrança na lista de a receber, os três PDFs, mensagem de WhatsApp e resultado do mês fechando com os lançamentos
