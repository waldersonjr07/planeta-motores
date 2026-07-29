# Sistema de Gestão — Planeta Motores

**Data:** 29/07/2026
**Situação:** desenho aprovado, pronto para o plano de implementação

## 1. Contexto

A Planeta Motores presta serviço de conserto de motores a combustão de 2 e 4 tempos. A empresa tem duas pessoas: Lucilene, proprietária, responsável pela administração e gestão, e Ivan, mecânico, que executa os consertos. A carteira gira em torno de 50 clientes.

Hoje não existe controle sistematizado — tudo é papel e planilha. Perde-se o histórico do que foi feito em cada motor, não se sabe o que há em estoque, e o acompanhamento de quem pagou e quem deve depende de memória.

O sistema substitui esse controle manual. Usuário único: Lucilene. Ivan continua na bancada e repassa a ela o diagnóstico e as peças utilizadas.

## 2. Escopo

**Dentro do MVP**

- Cadastro de clientes e dos equipamentos de cada cliente
- Ordem de serviço com fluxo completo: recebimento, diagnóstico, orçamento, aprovação, execução, conclusão, entrega
- Fotos anexadas à ordem de serviço
- Catálogo de serviços com preço padrão, catálogo de peças e cadastro de fornecedores
- Estoque de consumíveis com saldo, compras de peças e razão de movimentos
- Financeiro de caixa: pagamentos (inclusive parciais), contas a receber, despesas e resultado do mês
- Três documentos em PDF: comprovante de recebimento, orçamento e recibo de pagamento
- Mensagens de WhatsApp pré-montadas para envio manual
- Painel com indicadores e pendências

**Fora do MVP, deliberadamente**

- Emissão de NFS-e. O modelo reserva um campo de referência da nota, sem integração.
- Envio automático pela API oficial do WhatsApp.
- Importação dos clientes existentes por planilha — os ~50 cadastros serão digitados.
- Acesso do Ivan com perfil restrito.
- Cálculo de margem por ordem de serviço.
- Aplicativo mobile. O sistema é responsivo, mas desenhado para desktop.
- Contratos com recorrência mensal. Foi levantado no início e descartado: todo atendimento é avulso, e todo pagamento se refere a serviços executados e peças utilizadas.

## 3. Decisões de produto

| Tema | Decisão |
|---|---|
| Categorias de cliente | Não existem. Todo atendimento é avulso. |
| Precificação de mão de obra | Catálogo de serviços com preço padrão, ajustável na ordem de serviço. |
| Estoque | Consumíveis (óleo, vela, filtro, graxa) com saldo controlado; peças específicas compradas sob demanda por ordem de serviço. |
| Custo de peça | Último custo conhecido, atualizado a cada compra. Sem custo médio ponderado. |
| Financeiro | Regime de caixa. Vários pagamentos por ordem de serviço. |
| Usuários | Um: Lucilene. A tabela de usuários existe para acomodar um segundo acesso sem redesenho. |
| Aviso ao cliente | Mensagem pronta aberta no WhatsApp Web; envio manual. |
| Tela inicial | Lista de ordens de serviço com filtros. O painel é uma tela própria no menu. |
| Ficha da ordem de serviço | Cabeçalho fixo com botão de próxima ação, e abas por assunto. |

## 4. Arquitetura

Monolito Next.js (App Router) em TypeScript, com Server Actions como única fronteira de escrita. Postgres como banco. Tudo hospedado numa VPS própria.

**Stack**

- Next.js (App Router) + TypeScript
- Drizzle ORM + Postgres 16, migrações versionadas
- Zod validando toda entrada nas Server Actions
- Tailwind CSS + shadcn/ui (componentes copiados para o repositório, sem dependência de biblioteca fechada)
- `@react-pdf/renderer` para os PDFs — gera arquivo real no servidor sem exigir Chromium na VPS
- Argon2id para senha, sessão própria em tabela com cookie `httpOnly`
- Vitest para regras de domínio, Playwright para o caminho ponta a ponta

**Princípios de organização**

Cada módulo é uma pasta com seu recorte de schema, suas Server Actions e suas telas. Módulos conversam por funções exportadas explícitas — nenhum módulo consulta ou escreve a tabela de outro diretamente. Arquivo que cresce demais é sinal de responsabilidade acumulada e deve ser dividido.

## 5. Módulos

| Módulo | Responsabilidade | Depende de |
|---|---|---|
| `auth` | Login, sessão, hash de senha | — |
| `clientes` | Clientes e seus equipamentos | — |
| `catalogo` | Serviços, peças, fornecedores | — |
| `os` | Ordem de serviço: fluxo, itens, fotos, histórico, versões de orçamento | `clientes`, `catalogo`, `estoque` |
| `estoque` | Razão de movimentos, saldo, reposição, ajuste de inventário | `catalogo` |
| `compras` | Compra de peças com custo e vínculo opcional à OS | `catalogo`, `estoque` |
| `financeiro` | Pagamentos, contas a receber, despesas, resultado do mês | `os` |
| `documentos` | Geração dos três PDFs | `os`, `configuracoes` |
| `avisos` | Montagem das mensagens de WhatsApp | `os`, `configuracoes` |
| `painel` | Indicadores e listas de pendência | `os`, `financeiro` |
| `configuracoes` | Dados da empresa e modelos de mensagem | — |

## 6. Modelo de dados

Convenções: identificadores em `uuid`; valores monetários em **centavos como inteiro**, nunca ponto flutuante; quantidades em `numeric(12,3)` para admitir fração (0,5 L de óleo); datas e horas em `timestamptz`, exibidas no fuso `America/Sao_Paulo`; toda tabela tem `criado_em`.

**`usuarios`** — `id`, `nome`, `email` (único), `senha_hash`, `ativo`, `criado_em`

**`sessoes`** — `id`, `usuario_id`, `expira_em`, `criado_em`

**`clientes`** — `id`, `nome`, `tipo_pessoa` (`fisica` | `juridica`), `documento` (CPF/CNPJ, opcional), `telefone`, `email`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `cep`, `observacoes`, `ativo`, `criado_em`, `atualizado_em`

**`equipamentos`** — `id`, `cliente_id`, `tipo_motor` (`2T` | `4T`), `aplicacao` (roçadeira, motosserra, motobomba, gerador, soprador, outro), `marca`, `modelo`, `numero_serie`, `observacoes`, `ativo`, `criado_em`

**`ordens_servico`** — `id`, `numero` (único, formato `2026-0001`), `cliente_id`, `equipamento_id`, `situacao`, `problema_relatado`, `diagnostico`, `acessorios_recebidos`, `versao_orcamento` (inteiro, começa em 0), `desconto_centavos`, `nota_fiscal_referencia`, `observacoes`, e as datas de cada etapa: `recebido_em`, `diagnosticado_em`, `orcado_em`, `aprovado_em`, `recusado_em`, `motivo_recusa`, `concluido_em`, `entregue_em`, `cancelado_em`, `motivo_cancelamento`

Os totais **não** são colunas. São calculados a partir de `os_itens` menos o desconto, evitando divergência entre o total gravado e os itens que o compõem. O volume da operação torna o custo desse cálculo irrelevante.

**`os_itens`** — `id`, `os_id`, `tipo` (`peca` | `servico`), `peca_id`, `servico_id`, `descricao` (nome copiado no momento do lançamento, para que renomear no catálogo não altere orçamento antigo), `quantidade`, `preco_unitario_centavos`, `criado_em`. Restrição: `tipo = 'peca'` exige `peca_id`; `tipo = 'servico'` exige `servico_id`.

**`os_fotos`** — `id`, `os_id`, `momento` (`chegada` | `dano` | `conclusao`), `caminho_arquivo`, `nome_original`, `tamanho_bytes`, `legenda`, `criado_em`

**`os_historico`** — `id`, `os_id`, `situacao_anterior`, `situacao_nova`, `observacao`, `usuario_id`, `criado_em`. É a fonte da rastreabilidade que hoje se perde no papel.

**`os_orcamento_versoes`** — `id`, `os_id`, `versao`, `total_centavos`, `itens` (`jsonb`, cópia dos itens no momento do envio), `enviado_em`. Gravada quando o orçamento é enviado com itens diferentes da última versão, permitindo reproduzir exatamente o que o cliente recebeu. Reenvio sem alteração de item não cria versão nova — registra apenas uma linha no histórico. `ordens_servico.versao_orcamento` começa em `0` (nunca enviado) e passa a `1` no primeiro envio.

**`os_numeracao`** — `ano`, `ultimo_numero`. Atualizada com `UPDATE ... RETURNING` dentro da transação de criação da OS, garantindo numeração sequencial sem furo nem colisão.

**`servicos`** — `id`, `nome`, `descricao`, `preco_padrao_centavos`, `ativo`, `criado_em`

**`pecas`** — `id`, `nome`, `marca`, `unidade` (`un` | `L` | `kg` | `m`), `controla_saldo` (booleano), `quantidade_minima`, `ultimo_custo_centavos`, `preco_venda_centavos`, `ativo`, `criado_em`

**`fornecedores`** — `id`, `nome`, `telefone`, `email`, `observacoes`, `ativo`, `criado_em`

**`compras`** — `id`, `fornecedor_id`, `os_id` (opcional, a OS que motivou a compra), `data`, `numero_documento`, `observacoes`, `criado_em`

**`compra_itens`** — `id`, `compra_id`, `peca_id`, `quantidade`, `custo_unitario_centavos`

**`estoque_movimentos`** — `id`, `peca_id`, `tipo` (`entrada_compra` | `saida_os` | `estorno_os` | `ajuste`), `quantidade` (com sinal), `referencia_tipo`, `referencia_id`, `motivo`, `usuario_id`, `criado_em`

**`pagamentos`** — `id`, `os_id`, `valor_centavos`, `forma` (`dinheiro` | `pix` | `cartao_debito` | `cartao_credito` | `transferencia`), `data`, `observacao`, `criado_em`

**`despesas`** — `id`, `data`, `categoria` (`ferramenta` | `aluguel` | `energia` | `combustivel` | `outros`), `descricao`, `valor_centavos`, `fornecedor_id` (opcional), `criado_em`

**`configuracoes`** — linha única: `empresa_nome`, `empresa_cnpj`, `empresa_telefone`, `empresa_endereco`, `logo_caminho`, `orcamento_validade_dias`, `modelo_msg_orcamento`, `modelo_msg_pronto`, `modelo_msg_cobranca`

## 7. Fluxo da ordem de serviço

```
recebido ──→ em_diagnostico ──→ orcamento_enviado ──→ aprovado
                                       │                  │
                                       ↓                  ↓
                                   recusado      aguardando_peca ⇄ em_execucao
                                       │                  │
                                       ↓                  ↓
                                  devolvido ←──────── pronto ──→ entregue
```

**Transições aceitas**

| De | Para |
|---|---|
| `recebido` | `em_diagnostico`, `cancelado` |
| `em_diagnostico` | `orcamento_enviado`, `cancelado` |
| `orcamento_enviado` | `aprovado`, `recusado`, `orcamento_enviado` (reenvio) |
| `aprovado` | `aguardando_peca`, `em_execucao`, `orcamento_enviado` (revisão), `cancelado` |
| `aguardando_peca` | `em_execucao`, `orcamento_enviado` (revisão) |
| `em_execucao` | `aguardando_peca`, `pronto`, `orcamento_enviado` (revisão) |
| `pronto` | `entregue`, `em_execucao` (reabertura) |
| `recusado` | `devolvido` |
| `entregue`, `devolvido`, `cancelado` | terminais |

Qualquer salto fora dessa tabela é rejeitado no servidor. Toda transição grava uma linha em `os_historico` com situação anterior, nova, data e observação.

**Situação e cobrança são coisas separadas.** O fluxo termina em `entregue`. A condição de cobrança é calculada dos pagamentos lançados:

- `sem_valor` — total zero
- `em_aberto` — nada pago
- `parcial` — pago maior que zero e menor que o total
- `quitada` — pago igual ao total (pagamento acima do saldo é bloqueado, conforme a seção 9)

O cliente pode levar o motor devendo, e uma OS entregue não fica presa esperando pagamento. Na entrega com saldo devedor o sistema avisa, mas não bloqueia — a decisão é da Lucilene.

**Orçamento revisado.** Abrir o motor quase sempre revela mais serviço. Incluir ou remover item depois da aprovação devolve a OS para `orcamento_enviado`, incrementa `versao_orcamento` e preserva a versão anterior em `os_orcamento_versoes`. Nenhum aumento de valor chega ao cliente sem novo aceite registrado.

**Recusa com cobrança.** Uma OS recusada pode ter linha de taxa de diagnóstico e receber pagamento antes de virar `devolvido`. A avaliação do Ivan não é necessariamente gratuita.

**Baixa de estoque na conclusão.** As linhas de peça do orçamento são intenção, não consumo. A saída acontece na transição para `pronto`, quando a lista de peças finalmente reflete o que foi usado. Toda peça gera movimento no razão, inclusive a comprada sob demanda — que entra pela compra vinculada à OS e sai nesse momento, com saldo líquido zero e custo registrado. Reabrir uma OS que estava `pronto` gera movimentos de `estorno_os`; ao voltar a `pronto`, a baixa é refeita sobre a lista corrente.

**Numeração** sequencial por ano, no formato `2026-0001`.

## 8. Estoque e compras

`controla_saldo` distingue o consumível guardado na oficina da peça específica de compra sob demanda. Ela governa se a peça é monitorada e se aparece na tela de reposição — não se ela gera movimento, porque todo movimento de peça passa pelo razão.

O saldo é sempre a soma dos movimentos, nunca um número editável. Correção se faz por movimento de `ajuste`, com motivo obrigatório: ajuste sem explicação é como o controle se perde de novo.

**Saldo negativo é permitido** e exibido em destaque, em vez de bloquear o lançamento. Travar a baixa porque faltou registrar uma compra de óleo faria a Lucilene abandonar o sistema e voltar ao papel; apontar "está negativo, falta registrar uma entrada" resolve sem atrito.

A tela de reposição lista o que está igual ou abaixo da quantidade mínima. É consulta, não notificação — não se precisa de alerta por e-mail para uma prateleira que se olha todo dia.

Cada item de compra gera `entrada_compra` no razão e atualiza `ultimo_custo_centavos` da peça.

## 9. Financeiro

Regime de caixa, sem pretensão contábil. Responde "sobrou dinheiro esse mês?", que é a pergunta que a Lucilene faz.

- **Entradas do período** — soma dos pagamentos com data no período
- **Saídas do período** — soma das compras mais soma das despesas no período
- **Resultado** — entradas menos saídas

Compra de peça é a despesa de peça e não é lançada duas vezes. `despesas` cobre o resto: ferramenta, aluguel, energia, combustível.

**Contas a receber não é campo, é consulta:** toda OS com saldo devedor, ordenada da mais antiga, com os dias desde a entrega. A lista nunca fica defasada em relação aos pagamentos.

Um pagamento não pode exceder o saldo devedor da OS. A mensagem de erro informa o saldo correto.

## 10. Telas

Menu lateral fixo: Ordens de serviço · Painel · Clientes · Estoque · Compras · Financeiro · Catálogo · Configurações.

**Ordens de serviço** (inicial) — tabela com número, cliente, equipamento, situação, valor e condição de cobrança. Busca por cliente, número ou equipamento. Filtros de situação, período e cobrança. Botão de nova OS.

**Painel** — indicadores (na oficina, aguardando aprovação, pronto para entrega, a receber, resultado do mês) e duas listas de pendência: "precisa de ação hoje" (orçamento sem resposta, peça sem chegar, motor pronto sem retirar) e "cobranças em aberto", ambas com os dias parados em cada caso.

**Ficha da OS** — cabeçalho fixo com número, situação, cliente, equipamento, total e o botão de próxima ação, que muda conforme a situação (Enviar orçamento → Registrar aprovação → Concluir → Entregar). Abas na ordem do fluxo, com contador quando houver conteúdo: **Diagnóstico · Orçamento · Fotos · Pagamentos · Histórico**.

**Ficha do cliente** — contato, equipamentos, todas as OS e o saldo devedor. Cada equipamento abre seu histórico próprio, onde a reincidência fica visível.

**Estoque** — peças com saldo, reposição, ajuste de inventário. **Compras** — lançamento com fornecedor, itens, custo e OS opcional. **Financeiro** — pagamentos, a receber por antiguidade, despesas, resultado do mês. **Catálogo** — serviços, peças, fornecedores. **Configurações** — dados da empresa e textos das mensagens, editáveis sem programador.

## 11. Documentos e avisos

Três PDFs gerados no servidor, com cabeçalho da empresa vindo de `configuracoes`:

1. **Comprovante de recebimento** — cliente, equipamento, acessórios recebidos, problema relatado, número e data da OS
2. **Orçamento** — itens separados entre peças e serviços, quantidades, valores, desconto, total e validade
3. **Recibo de pagamento** — valor, forma, data e saldo restante quando houver

Três modelos de mensagem com dados da OS preenchidos: orçamento pronto, serviço concluído e cobrança em aberto. O sistema abre o WhatsApp com número e texto prontos; a Lucilene confere e envia.

## 12. Validação e erros

Toda entrada passa pelas Server Actions, validada com Zod e mensagens em português. As regras de domínio moram no servidor, não na tela:

- Transição de situação fora da tabela de transições é rejeitada
- OS `entregue`, `devolvido` ou `cancelado` não aceita item novo
- Pagamento acima do saldo devedor é bloqueado, com o saldo na mensagem
- Item de OS não aceita quantidade nem preço unitário zero ou negativo; o desconto aceita zero, mas não pode superar a soma dos itens
- Ajuste de estoque exige motivo, e é o único lançamento que aceita quantidade negativa

Erro de infraestrutura (banco indisponível, upload falho) não descarta o que foi digitado: a tela repõe os dados e informa o que aconteceu.

Fotos são redimensionadas no navegador antes do envio (lado maior de 1600 px, JPEG) e servidas por rota que verifica sessão, para que foto de cliente não seja acessível por URL adivinhada.

## 13. Testes

O alvo são as regras, não as telas. Vitest contra um Postgres de teste:

- Máquina de transições da OS, incluindo revisão de orçamento e reabertura
- Cálculo de totais com desconto
- Saldo de estoque a partir dos movimentos, incluindo estorno e ajuste
- Condição de cobrança nos quatro estados
- Resultado do mês com pagamentos, compras e despesas no período e fora dele

Um teste ponta a ponta em Playwright cobre o caminho completo: recebe, diagnostica, orça, aprova, conclui com baixa de estoque, entrega e paga. É a espinha dorsal — se ele passa, o sistema serve.

Telas de cadastro não recebem teste exaustivo: custa manutenção e pega pouco.

## 14. Infraestrutura e operação

VPS em São Paulo, a contratar: 2 vCPU, 4 GB de memória, ~60 GB de disco, faixa de R$ 40 a 100 por mês. Região brasileira por desempenho — o sistema faz uma ida ao servidor a cada salvamento, e VPS na Europa adiciona cerca de 200 ms por clique, o que dá sensação de lentidão.

Docker Compose com três serviços:

- **app** — Next.js em produção
- **postgres** — banco com volume próprio
- **caddy** — proxy reverso com HTTPS automático e renovação sem intervenção

As fotos ficam em volume montado no disco da VPS. Não há serviço de object storage contratado, por decisão explícita de manter uma fatura única. CDN não entra: para dois usuários e algumas fotos por OS, servir pelo Caddy é suficiente. Se um dia fizer sentido cache na frente do domínio, o plano gratuito da Cloudflare cobre isso sem custo.

Um ambiente só, produção, com Postgres local para desenvolvimento. Manter homologação para um usuário é custo sem retorno; a proteção equivalente é backup verificado antes de cada migração.

**Backup:** snapshot automático da VPS oferecido pelo provedor, tipicamente 20% do valor mensal. Restaura a máquina inteira e não depende de script mantido à mão. É o único ponto onde economizar sai caro: backup guardado no mesmo disco que deveria proteger não é backup.

Além disso, um botão de exportar tudo em CSV. Oficina que perde a carteira de clientes não reabre, e os dados não podem ficar reféns de provedor nenhum.

Acesso por e-mail e senha, sem cadastro público. Recuperação de senha é manual, por comando administrativo — não vale contratar serviço de e-mail para um usuário.

**Assumido como responsabilidade do operador**, por escolher VPS em vez de plataforma gerenciada: atualização de sistema operacional, monitoramento do serviço e conferência periódica de que o snapshot está sendo gerado.

## 15. Critérios de aceite

1. Uma OS percorre recebimento até pagamento, e cada etapa aparece no histórico com data.
2. Tentar pular uma etapa do fluxo é recusado com mensagem clara.
3. Concluir uma OS baixa do estoque exatamente as peças lançadas; reabrir estorna.
4. O saldo de uma peça é igual à soma dos seus movimentos, sempre.
5. Incluir item numa OS aprovada devolve ao orçamento, incrementa a versão e preserva a anterior.
6. Uma OS entregue com pagamento parcial aparece em contas a receber com o saldo e os dias corretos.
7. O resultado do mês fecha com pagamentos menos compras e despesas do período.
8. Os três PDFs saem com dados da empresa e da OS corretos.
9. A mensagem de WhatsApp abre com número do cliente e texto preenchido.
10. A exportação em CSV traz clientes, equipamentos, OS, itens, pagamentos e movimentos de estoque.
