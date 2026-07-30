CREATE TYPE "public"."aplicacao_equipamento" AS ENUM('rocadeira', 'motosserra', 'motobomba', 'gerador', 'soprador', 'outro');--> statement-breakpoint
CREATE TYPE "public"."tipo_motor" AS ENUM('2T', '4T');--> statement-breakpoint
CREATE TYPE "public"."tipo_pessoa" AS ENUM('fisica', 'juridica');--> statement-breakpoint
CREATE TYPE "public"."unidade_peca" AS ENUM('un', 'L', 'kg', 'm');--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "configuracoes" (
	"id" integer PRIMARY KEY NOT NULL,
	"empresa_nome" text DEFAULT 'Planeta Motores' NOT NULL,
	"empresa_cnpj" text,
	"empresa_telefone" text,
	"empresa_endereco" text,
	"logo_caminho" text,
	"orcamento_validade_dias" integer DEFAULT 15 NOT NULL,
	"modelo_msg_orcamento" text DEFAULT 'Olá {{cliente}}, o orçamento da OS {{numero}} ({{equipamento}}) ficou em {{total}}. Posso seguir com o serviço?' NOT NULL,
	"modelo_msg_pronto" text DEFAULT 'Olá {{cliente}}, o serviço da OS {{numero}} ({{equipamento}}) está pronto para retirada. Valor: {{total}}.' NOT NULL,
	"modelo_msg_cobranca" text DEFAULT 'Olá {{cliente}}, consta em aberto o valor de {{saldo}} referente à OS {{numero}}. Podemos combinar o pagamento?' NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"tipo_pessoa" "tipo_pessoa" DEFAULT 'fisica' NOT NULL,
	"documento" text,
	"telefone" text,
	"email" text,
	"logradouro" text,
	"numero" text,
	"complemento" text,
	"bairro" text,
	"cidade" text,
	"uf" text,
	"cep" text,
	"observacoes" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"tipo_motor" "tipo_motor" NOT NULL,
	"aplicacao" "aplicacao_equipamento" NOT NULL,
	"marca" text,
	"modelo" text,
	"numero_serie" text,
	"observacoes" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fornecedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"telefone" text,
	"email" text,
	"observacoes" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pecas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"marca" text,
	"unidade" "unidade_peca" DEFAULT 'un' NOT NULL,
	"controla_saldo" boolean DEFAULT false NOT NULL,
	"quantidade_minima" numeric(12, 3) DEFAULT '0' NOT NULL,
	"ultimo_custo_centavos" integer,
	"preco_venda_centavos" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servicos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"preco_padrao_centavos" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clientes_documento_unico" ON "clientes" USING btree ("documento") WHERE "clientes"."documento" is not null;