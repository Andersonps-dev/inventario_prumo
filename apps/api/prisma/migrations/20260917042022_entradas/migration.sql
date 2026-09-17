-- CreateEnum
CREATE TYPE "StatusEntrada" AS ENUM ('RASCUNHO', 'EM_DISTRIBUICAO', 'CONCLUIDA', 'CANCELADA');

-- AlterEnum
ALTER TYPE "OrigemTipo" ADD VALUE 'ENTRADA_ITEM';

-- CreateTable
CREATE TABLE "entrada" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nota" TEXT NOT NULL,
    "deposito_id" INTEGER NOT NULL,
    "status" "StatusEntrada" NOT NULL DEFAULT 'RASCUNHO',
    "criado_por" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizado_em" TIMESTAMP(3),
    "concluido_em" TIMESTAMP(3),
    "cancelado_por" INTEGER,
    "cancelado_em" TIMESTAMP(3),
    "motivo_cancelamento" TEXT,

    CONSTRAINT "entrada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrada_item" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "entrada_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "quantidade_recebida" DECIMAL(14,4) NOT NULL,
    "quantidade_distribuida" DECIMAL(14,4) NOT NULL DEFAULT 0,

    CONSTRAINT "entrada_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entrada_empresa_id_status_idx" ON "entrada"("empresa_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "entrada_empresa_id_codigo_key" ON "entrada"("empresa_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "entrada_item_entrada_id_produto_id_key" ON "entrada_item"("entrada_id", "produto_id");

-- AddForeignKey
ALTER TABLE "entrada" ADD CONSTRAINT "entrada_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada" ADD CONSTRAINT "entrada_deposito_id_fkey" FOREIGN KEY ("deposito_id") REFERENCES "deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada" ADD CONSTRAINT "entrada_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada" ADD CONSTRAINT "entrada_cancelado_por_fkey" FOREIGN KEY ("cancelado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada_item" ADD CONSTRAINT "entrada_item_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada_item" ADD CONSTRAINT "entrada_item_entrada_id_fkey" FOREIGN KEY ("entrada_id") REFERENCES "entrada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrada_item" ADD CONSTRAINT "entrada_item_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
