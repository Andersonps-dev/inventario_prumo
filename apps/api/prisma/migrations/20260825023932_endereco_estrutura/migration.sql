-- AlterTable
ALTER TABLE "escopo_item" ADD COLUMN     "endereco_id" INTEGER;

-- AlterTable
ALTER TABLE "movimento_estoque" ADD COLUMN     "endereco_id" INTEGER;

-- AlterTable
ALTER TABLE "saldo_estoque" ADD COLUMN     "endereco_id" INTEGER;

-- CreateTable
CREATE TABLE "endereco" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "deposito_id" INTEGER NOT NULL,
    "setor" TEXT NOT NULL,
    "rua" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "vao" TEXT NOT NULL,
    "interno" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "endereco_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "endereco_codigo_key" ON "endereco"("codigo");

-- CreateIndex
CREATE INDEX "endereco_deposito_id_idx" ON "endereco"("deposito_id");

-- AddForeignKey
ALTER TABLE "endereco" ADD CONSTRAINT "endereco_deposito_id_fkey" FOREIGN KEY ("deposito_id") REFERENCES "deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldo_estoque" ADD CONSTRAINT "saldo_estoque_endereco_id_fkey" FOREIGN KEY ("endereco_id") REFERENCES "endereco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_endereco_id_fkey" FOREIGN KEY ("endereco_id") REFERENCES "endereco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escopo_item" ADD CONSTRAINT "escopo_item_endereco_id_fkey" FOREIGN KEY ("endereco_id") REFERENCES "endereco"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: cada depósito existente ganha um endereço-sentinela interno
-- ("sem local definido"), e todo saldo/movimento/item de escopo que ainda
-- não tinha endereço passa a apontar pra ele. Mantém "saldo = soma de
-- saldo_estoque" válido sem precisar de NULL em chave composta.
INSERT INTO "endereco" ("codigo", "deposito_id", "setor", "rua", "modulo", "nivel", "vao", "interno", "ativo", "criado_em")
SELECT 'SEM-ENDERECO-' || "id", "id", 'SEM', '0', '0', '0', '0', true, true, now()
FROM "deposito";

UPDATE "saldo_estoque" s
SET "endereco_id" = e."id"
FROM "endereco" e
WHERE e."deposito_id" = s."deposito_id" AND e."interno" = true AND s."endereco_id" IS NULL;

UPDATE "movimento_estoque" m
SET "endereco_id" = e."id"
FROM "endereco" e
WHERE e."deposito_id" = m."deposito_id" AND e."interno" = true AND m."endereco_id" IS NULL;

UPDATE "escopo_item" ei
SET "endereco_id" = e."id"
FROM "escopo_inventario" esc
JOIN "endereco" e ON e."deposito_id" = esc."deposito_id" AND e."interno" = true
WHERE ei."escopo_id" = esc."id" AND ei."endereco_id" IS NULL;
