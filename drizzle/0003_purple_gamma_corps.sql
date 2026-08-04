ALTER TABLE "pecas" ALTER COLUMN "unidade" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "pecas" ALTER COLUMN "unidade" SET DEFAULT 'un'::text;--> statement-breakpoint
DROP TYPE "public"."unidade_peca";--> statement-breakpoint
CREATE TYPE "public"."unidade_peca" AS ENUM('un', 'L', 'mL');--> statement-breakpoint
ALTER TABLE "pecas" ALTER COLUMN "unidade" SET DEFAULT 'un'::"public"."unidade_peca";--> statement-breakpoint
ALTER TABLE "pecas" ALTER COLUMN "unidade" SET DATA TYPE "public"."unidade_peca" USING "unidade"::"public"."unidade_peca";