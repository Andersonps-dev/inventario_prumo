-- CreateTable
CREATE TABLE "evento_venda_posicao" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "evento_venda_id" INTEGER NOT NULL,
    "endereco_id" INTEGER NOT NULL,

    CONSTRAINT "evento_venda_posicao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evento_venda_posicao_evento_venda_id_endereco_id_key" ON "evento_venda_posicao"("evento_venda_id", "endereco_id");

-- AddForeignKey
ALTER TABLE "evento_venda_posicao" ADD CONSTRAINT "evento_venda_posicao_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_venda_posicao" ADD CONSTRAINT "evento_venda_posicao_evento_venda_id_fkey" FOREIGN KEY ("evento_venda_id") REFERENCES "evento_venda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_venda_posicao" ADD CONSTRAINT "evento_venda_posicao_endereco_id_fkey" FOREIGN KEY ("endereco_id") REFERENCES "endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "evento_venda_reserva_evento_venda_id_produto_id_endereco_i_key" RENAME TO "evento_venda_reserva_evento_venda_id_produto_id_endereco_id_key";
