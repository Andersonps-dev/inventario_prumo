-- CreateEnum
CREATE TYPE "StatusTransferencia" AS ENUM ('ABERTA', 'EFETIVADA', 'CANCELADA');

-- AlterEnum
ALTER TYPE "OrigemTipo" ADD VALUE 'TRANSFERENCIA_ITEM';

-- CreateTable
CREATE TABLE "transferencia" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "deposito_id" INTEGER NOT NULL,
    "endereco_origem_id" INTEGER NOT NULL,
    "endereco_destino_id" INTEGER NOT NULL,
    "status" "StatusTransferencia" NOT NULL DEFAULT 'ABERTA',
    "criado_por" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "efetivado_por" INTEGER,
    "efetivado_em" TIMESTAMP(3),
    "cancelado_por" INTEGER,
    "cancelado_em" TIMESTAMP(3),
    "motivo_cancelamento" TEXT,

    CONSTRAINT "transferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferencia_item" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "transferencia_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "quantidade" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "transferencia_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transferencia_empresa_id_status_idx" ON "transferencia"("empresa_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "transferencia_empresa_id_codigo_key" ON "transferencia"("empresa_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "transferencia_item_transferencia_id_produto_id_key" ON "transferencia_item"("transferencia_id", "produto_id");

-- AddForeignKey
ALTER TABLE "transferencia" ADD CONSTRAINT "transferencia_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia" ADD CONSTRAINT "transferencia_deposito_id_fkey" FOREIGN KEY ("deposito_id") REFERENCES "deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia" ADD CONSTRAINT "transferencia_endereco_origem_id_fkey" FOREIGN KEY ("endereco_origem_id") REFERENCES "endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia" ADD CONSTRAINT "transferencia_endereco_destino_id_fkey" FOREIGN KEY ("endereco_destino_id") REFERENCES "endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia" ADD CONSTRAINT "transferencia_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia" ADD CONSTRAINT "transferencia_efetivado_por_fkey" FOREIGN KEY ("efetivado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia" ADD CONSTRAINT "transferencia_cancelado_por_fkey" FOREIGN KEY ("cancelado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia_item" ADD CONSTRAINT "transferencia_item_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia_item" ADD CONSTRAINT "transferencia_item_transferencia_id_fkey" FOREIGN KEY ("transferencia_id") REFERENCES "transferencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia_item" ADD CONSTRAINT "transferencia_item_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
