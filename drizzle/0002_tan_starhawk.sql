CREATE TYPE "public"."categoria_despesa" AS ENUM('ferramenta', 'aluguel', 'energia', 'combustivel', 'outros');--> statement-breakpoint
CREATE TYPE "public"."forma_pagamento" AS ENUM('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia');--> statement-breakpoint
CREATE TABLE "despesas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data" date NOT NULL,
	"categoria" "categoria_despesa" DEFAULT 'outros' NOT NULL,
	"descricao" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"fornecedor_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_id" uuid NOT NULL,
	"valor_centavos" integer NOT NULL,
	"forma" "forma_pagamento" NOT NULL,
	"data" date NOT NULL,
	"observacao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_os_id_ordens_servico_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id") ON DELETE cascade ON UPDATE no action;