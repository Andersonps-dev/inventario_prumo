-- DropForeignKey
ALTER TABLE "evento_venda" DROP CONSTRAINT "evento_venda_deposito_virtual_id_fkey";

-- AlterTable
ALTER TABLE "evento_venda" DROP COLUMN "deposito_virtual_id";

-- CreateTable
CREATE TABLE "evento_venda_reserva" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "evento_venda_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "endereco_id" INTEGER NOT NULL,
    "quantidade" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "evento_venda_reserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evento_venda_reserva_evento_venda_id_produto_id_endereco_i_key" ON "evento_venda_reserva"("evento_venda_id", "produto_id", "endereco_id");

-- CreateIndex
CREATE INDEX "evento_venda_reserva_empresa_id_produto_id_endereco_id_idx" ON "evento_venda_reserva"("empresa_id", "produto_id", "endereco_id");

-- AddForeignKey
ALTER TABLE "evento_venda_reserva" ADD CONSTRAINT "evento_venda_reserva_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_venda_reserva" ADD CONSTRAINT "evento_venda_reserva_evento_venda_id_fkey" FOREIGN KEY ("evento_venda_id") REFERENCES "evento_venda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_venda_reserva" ADD CONSTRAINT "evento_venda_reserva_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_venda_reserva" ADD CONSTRAINT "evento_venda_reserva_endereco_id_fkey" FOREIGN KEY ("endereco_id") REFERENCES "endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
