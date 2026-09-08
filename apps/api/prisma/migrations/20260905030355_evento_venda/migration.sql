-- CreateEnum
CREATE TYPE "StatusEventoVenda" AS ENUM ('ABERTO', 'FECHADO');

-- AlterEnum
ALTER TYPE "OrigemTipo" ADD VALUE 'EVENTO_VENDA';

-- CreateTable
CREATE TABLE "evento_venda" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "deposito_origem_id" INTEGER NOT NULL,
    "deposito_virtual_id" INTEGER NOT NULL,
    "status" "StatusEventoVenda" NOT NULL DEFAULT 'ABERTO',
    "relatorio_fechamento" JSONB,
    "criado_por" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechado_por" INTEGER,
    "fechado_em" TIMESTAMP(3),

    CONSTRAINT "evento_venda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evento_venda_empresa_id_status_idx" ON "evento_venda"("empresa_id", "status");

-- AddForeignKey
ALTER TABLE "evento_venda" ADD CONSTRAINT "evento_venda_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_venda" ADD CONSTRAINT "evento_venda_deposito_origem_id_fkey" FOREIGN KEY ("deposito_origem_id") REFERENCES "deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_venda" ADD CONSTRAINT "evento_venda_deposito_virtual_id_fkey" FOREIGN KEY ("deposito_virtual_id") REFERENCES "deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_venda" ADD CONSTRAINT "evento_venda_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_venda" ADD CONSTRAINT "evento_venda_fechado_por_fkey" FOREIGN KEY ("fechado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
