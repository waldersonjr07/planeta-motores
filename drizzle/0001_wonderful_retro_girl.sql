CREATE TYPE "public"."momento_foto" AS ENUM('chegada', 'dano', 'conclusao');--> statement-breakpoint
CREATE TYPE "public"."situacao_os" AS ENUM('recebido', 'em_diagnostico', 'orcamento_enviado', 'aprovado', 'aguardando_peca', 'em_execucao', 'pronto', 'entregue', 'recusado', 'devolvido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."tipo_item_os" AS ENUM('peca', 'servico');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimento" AS ENUM('entrada_compra', 'saida_os', 'estorno_os', 'ajuste');--> statement-breakpoint
CREATE TABLE "ordens_servico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text NOT NULL,
	"cliente_id" uuid NOT NULL,
	"equipamento_id" uuid NOT NULL,
	"situacao" "situacao_os" DEFAULT 'recebido' NOT NULL,
	"problema_relatado" text,
	"diagnostico" text,
	"acessorios_recebidos" text,
	"versao_orcamento" integer DEFAULT 0 NOT NULL,
	"desconto_centavos" integer DEFAULT 0 NOT NULL,
	"nota_fiscal_referencia" text,
	"observacoes" text,
	"recebido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"diagnosticado_em" timestamp with time zone,
	"orcado_em" timestamp with time zone,
	"aprovado_em" timestamp with time zone,
	"recusado_em" timestamp with time zone,
	"motivo_recusa" text,
	"concluido_em" timestamp with time zone,
	"entregue_em" timestamp with time zone,
	"cancelado_em" timestamp with time zone,
	"motivo_cancelamento" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ordens_servico_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "os_fotos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_id" uuid NOT NULL,
	"momento" "momento_foto" DEFAULT 'chegada' NOT NULL,
	"caminho_arquivo" text NOT NULL,
	"nome_original" text,
	"tamanho_bytes" integer,
	"legenda" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "os_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_id" uuid NOT NULL,
	"situacao_anterior" "situacao_os",
	"situacao_nova" "situacao_os" NOT NULL,
	"observacao" text,
	"usuario_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "os_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_id" uuid NOT NULL,
	"tipo" "tipo_item_os" NOT NULL,
	"peca_id" uuid,
	"servico_id" uuid,
	"descricao" text NOT NULL,
	"quantidade" numeric(12, 3) NOT NULL,
	"preco_unitario_centavos" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "os_numeracao" (
	"ano" integer PRIMARY KEY NOT NULL,
	"ultimo_numero" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "os_orcamento_versoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_id" uuid NOT NULL,
	"versao" integer NOT NULL,
	"total_centavos" integer NOT NULL,
	"itens" jsonb NOT NULL,
	"enviado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compra_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compra_id" uuid NOT NULL,
	"peca_id" uuid NOT NULL,
	"quantidade" numeric(12, 3) NOT NULL,
	"custo_unitario_centavos" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fornecedor_id" uuid,
	"os_id" uuid,
	"data" date NOT NULL,
	"numero_documento" text,
	"observacoes" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estoque_movimentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"peca_id" uuid NOT NULL,
	"tipo" "tipo_movimento" NOT NULL,
	"quantidade" numeric(12, 3) NOT NULL,
	"referencia_tipo" text,
	"referencia_id" uuid,
	"motivo" text,
	"usuario_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_equipamento_id_equipamentos_id_fk" FOREIGN KEY ("equipamento_id") REFERENCES "public"."equipamentos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "os_fotos" ADD CONSTRAINT "os_fotos_os_id_ordens_servico_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "os_historico" ADD CONSTRAINT "os_historico_os_id_ordens_servico_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "os_historico" ADD CONSTRAINT "os_historico_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "os_itens" ADD CONSTRAINT "os_itens_os_id_ordens_servico_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "os_itens" ADD CONSTRAINT "os_itens_peca_id_pecas_id_fk" FOREIGN KEY ("peca_id") REFERENCES "public"."pecas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "os_itens" ADD CONSTRAINT "os_itens_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "os_orcamento_versoes" ADD CONSTRAINT "os_orcamento_versoes_os_id_ordens_servico_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_itens" ADD CONSTRAINT "compra_itens_compra_id_compras_id_fk" FOREIGN KEY ("compra_id") REFERENCES "public"."compras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra_itens" ADD CONSTRAINT "compra_itens_peca_id_pecas_id_fk" FOREIGN KEY ("peca_id") REFERENCES "public"."pecas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compras" ADD CONSTRAINT "compras_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compras" ADD CONSTRAINT "compras_os_id_ordens_servico_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estoque_movimentos" ADD CONSTRAINT "estoque_movimentos_peca_id_pecas_id_fk" FOREIGN KEY ("peca_id") REFERENCES "public"."pecas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estoque_movimentos" ADD CONSTRAINT "estoque_movimentos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "os_orcamento_versao_unica" ON "os_orcamento_versoes" USING btree ("os_id","versao");