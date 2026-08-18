# Separar dívida de previsão em "contas a receber"

Plano aprovado, ainda **não implementado**. Escrito para ser executado por quem
chegar sem o contexto da conversa que o gerou.

## O defeito relatado

OS cancelada continua aparecendo em "Contas a receber" e somando no total em
aberto. Serviço recusado não é dívida do cliente.

## Auditoria: toda agregação de valor de OS

Levantamento feito antes de decidir qualquer coisa. `src/modulos/financeiro/`
não tem **nenhuma** ocorrência de `situacao` — nenhuma consulta do módulo filtra
por status.

| Consulta | Onde | Filtra status? | Veredito |
|---|---|---|---|
| `listarContasAReceber()` | `financeiro/consultas.ts:81` | não | **É o defeito.** Só filtra `saldo > 0` |
| `obterPainel().aReceberCentavos` | `painel/consultas.ts:65` | não | Herda — soma o retorno da de cima |
| `obterPainel().cobrancas` | `painel/consultas.ts:68` | não | Herda — repete as canceladas na lista |
| `resumoDeCobrancaDaOs(osId)` | `financeiro/consultas.ts:40` | não | **Correto assim.** É a tela da própria OS; deve mostrar os números dela seja qual for o status |
| `resultadoDoPeriodo()` | `financeiro/consultas.ts:139` | n/a | **Não está quebrado.** Não agrega valor de OS: soma `pagamentos`, `compra_itens` e `despesas`. Regime de caixa. Pôr filtro de status aqui seria errado |
| `listarOs()` | `os/consultas.ts:53` | opcional | Aceita `situacoes`; a tela não passa nenhum |

**Conclusão que define o escopo:** a correção de agregação tem um ponto só —
`listarContasAReceber`. O painel se conserta sozinho porque deriva dela.

## A decisão: dois blocos, não uma linha de corte

O erro do desenho atual não é só a falta de filtro — é misturar **dívida** com
**previsão** numa lista só. A correção separa os dois.

### Bloco 1 — "Aguardando pagamento"

Status: **`pronto`**, **`entregue`**.

Serviço executado e não pago. É dívida de verdade. **Só este bloco soma no total
em aberto**, e só ele tem coluna DIAS.

### Bloco 2 — "Em andamento"

Status: **`aprovado`**, **`aguardando_peca`**, **`em_execucao`**.

Cliente aprovou, serviço em curso. É previsão de receita. **Não soma no total em
aberto e não tem coluna DIAS** — nada está atrasado, o trabalho ainda acontece.

### Fora dos dois — seis status

`recebido`, `em_diagnostico`, `orcamento_enviado`, `recusado`, `devolvido`,
`cancelado`.

Os três primeiros porque nada foi combinado ainda; os três últimos porque não vai
acontecer. Excluir `orcamento_enviado` conserta uma distorção que ninguém tinha
relatado: hoje todo orçamento enviado e sem resposta engorda o total em aberto
com dinheiro que ninguém prometeu pagar.

## A coluna DIAS

Referência: **`concluidoEm ?? entregueEm`**. Nulo nos dois → **mostrar vazio**.

O tipo muda para `diasEmAberto: number | null`.

**Não usar `recebidoEm` como fallback.** É a data de chegada do equipamento, e
produziria envelhecimento inflado justamente na coluna que decide quem cobrar
primeiro. Vazio é honesto; número errado não.

Onde as datas nascem (`os/operacoes.ts:254-257`):

```
case 'pronto':   return { concluidoEm: agora }
case 'entregue': return { entregueEm: agora }
```

Como `entregue` só é alcançável a partir de `pronto` (`situacoes.ts:25`), toda OS
dos dois status do bloco 1 tem `concluidoEm` preenchido pelo fluxo normal. O
fallback existe para dado que escape disso, não para o caminho comum.

## Painel

`aReceberCentavos` e a lista `cobrancas` passam a usar **só o bloco 1**. O painel
é tela de pendência: previsão de receita ali viraria ruído.

## Aviso ao cancelar OS com pagamento

Ao cancelar uma OS que tenha pagamento registrado, mostrar o valor já recebido e
exigir confirmação. **Não bloqueia** — só impede que passe despercebido.

Reaproveitar o padrão que já existe em
`app/(app)/ordens-servico/[id]/acoes-situacao.tsx`: o `PEDE_MOTIVO` já abre uma
caixa de atenção com campo e botão de confirmar antes de a transição acontecer.
O aviso de cancelamento é o mesmo desenho, disparado por
`destino === 'cancelado' && pagoCentavos > 0`.

Não precisa de consulta nova: a tela da OS já calcula `cobranca`
(`[id]/page.tsx:69-72`) e já renderiza `AcoesSituacao` (`:111`) — basta passar
`pagoCentavos` como prop.

## Listagem de OS

Esconder **`cancelado`** por padrão, com opção de mostrar. Hoje o filtro é
`undefined` por omissão (`app/(app)/ordens-servico/page.tsx:44-51`), o que traz
todos os status.

`devolvido` e `recusado` **continuam visíveis**.

## Onde fica o valor de uma OS cancelada com pagamento parcial

Pergunta levantada e respondida de propósito, porque o valor não pode
simplesmente sumir. Com o desenho acima ele aparece em **dois** lugares:

1. **Resultado do período.** `resultadoDoPeriodo` soma a tabela `pagamentos` por
   data, sem olhar situação nenhuma. O sinal entrou como receita no mês em que
   foi recebido e continua lá. Cancelar a OS não mexe nisso.
2. **A tela da própria OS**, via `resumoDeCobrancaDaOs`.

**Onde não aparece:** não existe lista que agrupe "canceladas que têm dinheiro
dentro". Para achar uma, é preciso abrir a OS.

Limitação aceita conscientemente: a política da oficina é que depois da
confirmação do orçamento não há cancelamento, e nunca aconteceu de cancelar
serviço com pagamento parcial — a interseção é vazia por processo. O aviso de
cancelamento é o que cobre o caso raro.

## Fora de escopo, por decisão

- **Botão de excluir OS.** Cancelamento com filtro resolve e preserva o
  histórico. Há um motivo técnico a mais: `pagamentos.osId` tem `onDelete:
  'cascade'` (`db/schema/financeiro.ts:26`), então apagar uma OS levaria os
  pagamentos junto e alteraria o resultado de meses já fechados.
- **Registro de devolução de dinheiro.** Hoje é impossível:
  `entradaPagamento` exige `valorCentavos` positivo
  (`financeiro/esquemas.ts:7`). A coluna é `integer` e aceitaria negativo, mas a
  validação barra. Só vale abrir isso se a oficina passar a devolver sinal.

## Duas descobertas da auditoria, registradas para não se perderem

**`devolvido` não é retrabalho.** O único caminho até ele é
`recusado: ['devolvido']` (`situacoes.ts:26`). Significa equipamento entregue de
volta porque o cliente recusou o orçamento. Foi o que garantiu que escondê-lo não
esconderia serviço com defeito.

**Não existe estado de retrabalho no sistema.** `entregue` é terminal
(`situacoes.ts:27`). Motor que volta com defeito depois de entregue não tem para
onde ir — hoje vira OS nova. Não é defeito, é lacuna; fica registrado para
decidir depois se vira trabalho.

## Como implementar

TDD, como o resto do repositório: teste que falha primeiro, e a falha conferida
antes de escrever a implementação.

Os testes de integração do módulo ficam em `testes/integracao/financeiro.test.ts`
e têm os helpers prontos (`cenarioOs`, `osComValor`, `entregar`). Dois testes de
lá exercitam a função antiga e precisam acompanhar a mudança de nome e de forma:

- `'contas a receber traz só OS com saldo, e some quando quita'` (linha 145)
- `'OS sem valor nenhum não aparece em contas a receber'` (linha 165)

Toda mudança que toque tela pede a suíte e2e **completa** antes do commit, não só
o spec focado — lição registrada nas armadilhas do `README.md`.

## Prioridade

Depois disto, **backup é a próxima coisa, antes de qualquer outra
funcionalidade**: `docs/backup.md`, rclone, cron e a restauração testada de
verdade num banco descartável. `scripts/backup.sh` e `scripts/restaurar.sh` já
existem no repositório, mas sem documento, sem agendamento e sem ensaio de
restauração — não estão prontos.
