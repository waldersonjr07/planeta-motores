CREATE TABLE `sessoes` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` text NOT NULL,
	`expira_em` integer NOT NULL,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`email` text NOT NULL,
	`senha_hash` text NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_email_unique` ON `usuarios` (`email`);--> statement-breakpoint
CREATE TABLE `configuracoes` (
	`id` integer PRIMARY KEY NOT NULL,
	`empresa_nome` text DEFAULT 'Planeta Motores' NOT NULL,
	`empresa_cnpj` text,
	`empresa_telefone` text,
	`empresa_endereco` text,
	`logo_caminho` text,
	`orcamento_validade_dias` integer DEFAULT 15 NOT NULL,
	`modelo_msg_orcamento` text DEFAULT 'Olá {{cliente}}, o orçamento da OS {{numero}} ({{equipamento}}) ficou em {{total}}. Posso seguir com o serviço?' NOT NULL,
	`modelo_msg_pronto` text DEFAULT 'Olá {{cliente}}, o serviço da OS {{numero}} ({{equipamento}}) está pronto para retirada. Valor: {{total}}.' NOT NULL,
	`modelo_msg_cobranca` text DEFAULT 'Olá {{cliente}}, consta em aberto o valor de {{saldo}} referente à OS {{numero}}. Podemos combinar o pagamento?' NOT NULL,
	`atualizado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`tipo_pessoa` text DEFAULT 'fisica' NOT NULL,
	`documento` text,
	`telefone` text,
	`email` text,
	`logradouro` text,
	`numero` text,
	`complemento` text,
	`bairro` text,
	`cidade` text,
	`uf` text,
	`cep` text,
	`observacoes` text,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`atualizado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clientes_documento_unico` ON `clientes` (`documento`) WHERE "clientes"."documento" is not null;--> statement-breakpoint
CREATE TABLE `equipamentos` (
	`id` text PRIMARY KEY NOT NULL,
	`cliente_id` text NOT NULL,
	`tipo_motor` text NOT NULL,
	`aplicacao` text NOT NULL,
	`aplicacao_outra` text,
	`marca` text,
	`modelo` text,
	`numero_serie` text,
	`observacoes` text,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `fornecedores` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`telefone` text,
	`email` text,
	`observacoes` text,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pecas` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`marca` text,
	`unidade` text DEFAULT 'un' NOT NULL,
	`controla_saldo` integer DEFAULT false NOT NULL,
	`quantidade_minima` numeric DEFAULT '0' NOT NULL,
	`ultimo_custo_centavos` integer,
	`preco_venda_centavos` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `servicos` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`descricao` text,
	`preco_padrao_centavos` integer DEFAULT 0 NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ordens_servico` (
	`id` text PRIMARY KEY NOT NULL,
	`numero` text NOT NULL,
	`cliente_id` text NOT NULL,
	`equipamento_id` text NOT NULL,
	`situacao` text DEFAULT 'recebido' NOT NULL,
	`problema_relatado` text,
	`diagnostico` text,
	`acessorios_recebidos` text,
	`versao_orcamento` integer DEFAULT 0 NOT NULL,
	`desconto_centavos` integer DEFAULT 0 NOT NULL,
	`nota_fiscal_referencia` text,
	`observacoes` text,
	`recebido_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`diagnosticado_em` integer,
	`orcado_em` integer,
	`aprovado_em` integer,
	`recusado_em` integer,
	`motivo_recusa` text,
	`concluido_em` integer,
	`entregue_em` integer,
	`cancelado_em` integer,
	`motivo_cancelamento` text,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`equipamento_id`) REFERENCES `equipamentos`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ordens_servico_numero_unique` ON `ordens_servico` (`numero`);--> statement-breakpoint
CREATE TABLE `os_fotos` (
	`id` text PRIMARY KEY NOT NULL,
	`os_id` text NOT NULL,
	`momento` text DEFAULT 'chegada' NOT NULL,
	`caminho_arquivo` text NOT NULL,
	`nome_original` text,
	`tamanho_bytes` integer,
	`legenda` text,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`os_id`) REFERENCES `ordens_servico`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `os_historico` (
	`id` text PRIMARY KEY NOT NULL,
	`os_id` text NOT NULL,
	`situacao_anterior` text,
	`situacao_nova` text NOT NULL,
	`observacao` text,
	`usuario_id` text,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`os_id`) REFERENCES `ordens_servico`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `os_itens` (
	`id` text PRIMARY KEY NOT NULL,
	`os_id` text NOT NULL,
	`tipo` text NOT NULL,
	`peca_id` text,
	`servico_id` text,
	`descricao` text NOT NULL,
	`quantidade` numeric NOT NULL,
	`preco_unitario_centavos` integer NOT NULL,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`os_id`) REFERENCES `ordens_servico`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`peca_id`) REFERENCES `pecas`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`servico_id`) REFERENCES `servicos`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `os_numeracao` (
	`ano` integer PRIMARY KEY NOT NULL,
	`ultimo_numero` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `os_orcamento_versoes` (
	`id` text PRIMARY KEY NOT NULL,
	`os_id` text NOT NULL,
	`versao` integer NOT NULL,
	`total_centavos` integer NOT NULL,
	`itens` text NOT NULL,
	`enviado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`os_id`) REFERENCES `ordens_servico`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `os_orcamento_versao_unica` ON `os_orcamento_versoes` (`os_id`,`versao`);--> statement-breakpoint
CREATE TABLE `compra_itens` (
	`id` text PRIMARY KEY NOT NULL,
	`compra_id` text NOT NULL,
	`peca_id` text NOT NULL,
	`quantidade` numeric NOT NULL,
	`custo_unitario_centavos` integer NOT NULL,
	FOREIGN KEY (`compra_id`) REFERENCES `compras`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`peca_id`) REFERENCES `pecas`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `compras` (
	`id` text PRIMARY KEY NOT NULL,
	`fornecedor_id` text,
	`os_id` text,
	`data` text NOT NULL,
	`numero_documento` text,
	`observacoes` text,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`os_id`) REFERENCES `ordens_servico`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `estoque_movimentos` (
	`id` text PRIMARY KEY NOT NULL,
	`peca_id` text NOT NULL,
	`tipo` text NOT NULL,
	`quantidade` numeric NOT NULL,
	`referencia_tipo` text,
	`referencia_id` text,
	`motivo` text,
	`usuario_id` text,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`peca_id`) REFERENCES `pecas`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `despesas` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`categoria` text DEFAULT 'outros' NOT NULL,
	`descricao` text,
	`valor_centavos` integer NOT NULL,
	`fornecedor_id` text,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`fornecedor_id`) REFERENCES `fornecedores`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `pagamentos` (
	`id` text PRIMARY KEY NOT NULL,
	`os_id` text NOT NULL,
	`valor_centavos` integer NOT NULL,
	`forma` text NOT NULL,
	`data` text NOT NULL,
	`observacao` text,
	`criado_em` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`os_id`) REFERENCES `ordens_servico`(`id`) ON UPDATE no action ON DELETE cascade
);
