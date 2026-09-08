-- Multiempresa (fase 1/2): aditiva, tudo nullable, backfill pra "Empresa padrão".
-- Espelha o padrão já usado em 20260825023932_endereco_estrutura.

-- Novo valor de enum precisa commitar sozinho antes de ser referenciado
-- em qualquer outra instrução desta mesma migração/transação.
ALTER TYPE "Papel" ADD VALUE 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "empresa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

INSERT INTO "empresa" ("nome") VALUES ('Empresa padrão');

-- AlterTable: empresa_id nullable em todas as 11 tabelas (fica NOT NULL
-- na migração seguinte, exceto usuario/auditoria que permanecem nullable).
ALTER TABLE "produto" ADD COLUMN "empresa_id" INTEGER;
ALTER TABLE "deposito" ADD COLUMN "empresa_id" INTEGER;
ALTER TABLE "endereco" ADD COLUMN "empresa_id" INTEGER;
ALTER TABLE "saldo_estoque" ADD COLUMN "empresa_id" INTEGER;
ALTER TABLE "movimento_estoque" ADD COLUMN "empresa_id" INTEGER;
ALTER TABLE "escopo_inventario" ADD COLUMN "empresa_id" INTEGER;
ALTER TABLE "escopo_item" ADD COLUMN "empresa_id" INTEGER;
ALTER TABLE "contagem" ADD COLUMN "empresa_id" INTEGER;
ALTER TABLE "usuario" ADD COLUMN "empresa_id" INTEGER;
ALTER TABLE "auditoria" ADD COLUMN "empresa_id" INTEGER;
ALTER TABLE "exportacao_job" ADD COLUMN "empresa_id" INTEGER;

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "produto_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deposito" ADD CONSTRAINT "deposito_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "endereco" ADD CONSTRAINT "endereco_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "saldo_estoque" ADD CONSTRAINT "saldo_estoque_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "escopo_inventario" ADD CONSTRAINT "escopo_inventario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "escopo_item" ADD CONSTRAINT "escopo_item_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contagem" ADD CONSTRAINT "contagem_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "exportacao_job" ADD CONSTRAINT "exportacao_job_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: tudo que já existe vira da "Empresa padrão" (inclusive todos
-- os usuários — a promoção pontual a SUPER_ADMIN é feita depois, fora da
-- migração, via scripts/promote-super-admin.ts).
UPDATE "produto" SET "empresa_id" = (SELECT "id" FROM "empresa" WHERE "nome" = 'Empresa padrão' LIMIT 1) WHERE "empresa_id" IS NULL;
UPDATE "deposito" SET "empresa_id" = (SELECT "id" FROM "empresa" WHERE "nome" = 'Empresa padrão' LIMIT 1) WHERE "empresa_id" IS NULL;
UPDATE "endereco" SET "empresa_id" = (SELECT "id" FROM "empresa" WHERE "nome" = 'Empresa padrão' LIMIT 1) WHERE "empresa_id" IS NULL;
UPDATE "saldo_estoque" SET "empresa_id" = (SELECT "id" FROM "empresa" WHERE "nome" = 'Empresa padrão' LIMIT 1) WHERE "empresa_id" IS NULL;
UPDATE "movimento_estoque" SET "empresa_id" = (SELECT "id" FROM "empresa" WHERE "nome" = 'Empresa padrão' LIMIT 1) WHERE "empresa_id" IS NULL;
UPDATE "escopo_inventario" SET "empresa_id" = (SELECT "id" FROM "empresa" WHERE "nome" = 'Empresa padrão' LIMIT 1) WHERE "empresa_id" IS NULL;
UPDATE "escopo_item" SET "empresa_id" = (SELECT "id" FROM "empresa" WHERE "nome" = 'Empresa padrão' LIMIT 1) WHERE "empresa_id" IS NULL;
UPDATE "contagem" SET "empresa_id" = (SELECT "id" FROM "empresa" WHERE "nome" = 'Empresa padrão' LIMIT 1) WHERE "empresa_id" IS NULL;
UPDATE "usuario" SET "empresa_id" = (SELECT "id" FROM "empresa" WHERE "nome" = 'Empresa padrão' LIMIT 1) WHERE "empresa_id" IS NULL;
UPDATE "auditoria" SET "empresa_id" = (SELECT "id" FROM "empresa" WHERE "nome" = 'Empresa padrão' LIMIT 1) WHERE "empresa_id" IS NULL;
UPDATE "exportacao_job" SET "empresa_id" = (SELECT "id" FROM "empresa" WHERE "nome" = 'Empresa padrão' LIMIT 1) WHERE "empresa_id" IS NULL;

-- Índices novos (não conflitam com os antigos globais, que só são
-- derrubados na migração seguinte) — seguros de criar já aqui.
CREATE INDEX "auditoria_empresa_id_criado_em_idx" ON "auditoria"("empresa_id", "criado_em");
CREATE INDEX "contagem_empresa_id_contado_por_idx" ON "contagem"("empresa_id", "contado_por");
CREATE UNIQUE INDEX "deposito_empresa_id_nome_key" ON "deposito"("empresa_id", "nome");
CREATE UNIQUE INDEX "endereco_empresa_id_codigo_key" ON "endereco"("empresa_id", "codigo");
CREATE UNIQUE INDEX "escopo_inventario_empresa_id_codigo_key" ON "escopo_inventario"("empresa_id", "codigo");
CREATE INDEX "exportacao_job_empresa_id_idx" ON "exportacao_job"("empresa_id");
CREATE INDEX "movimento_estoque_empresa_id_produto_id_criado_em_idx" ON "movimento_estoque"("empresa_id", "produto_id", "criado_em");
CREATE INDEX "produto_empresa_id_nome_idx" ON "produto"("empresa_id", "nome");
CREATE UNIQUE INDEX "produto_empresa_id_sku_key" ON "produto"("empresa_id", "sku");
CREATE UNIQUE INDEX "produto_empresa_id_codigo_barras_key" ON "produto"("empresa_id", "codigo_barras");
CREATE INDEX "saldo_estoque_empresa_id_idx" ON "saldo_estoque"("empresa_id");
CREATE INDEX "usuario_empresa_id_idx" ON "usuario"("empresa_id");
