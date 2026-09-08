-- DropForeignKey
ALTER TABLE "escopo_item" DROP CONSTRAINT "escopo_item_endereco_id_fkey";

-- DropForeignKey
ALTER TABLE "movimento_estoque" DROP CONSTRAINT "movimento_estoque_endereco_id_fkey";

-- DropForeignKey
ALTER TABLE "saldo_estoque" DROP CONSTRAINT "saldo_estoque_endereco_id_fkey";

-- DropIndex
DROP INDEX "escopo_item_escopo_id_produto_id_key";

-- AlterTable
ALTER TABLE "escopo_item" ALTER COLUMN "endereco_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "movimento_estoque" ALTER COLUMN "endereco_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "saldo_estoque" DROP CONSTRAINT "saldo_estoque_pkey",
ALTER COLUMN "endereco_id" SET NOT NULL,
ADD CONSTRAINT "saldo_estoque_pkey" PRIMARY KEY ("produto_id", "deposito_id", "endereco_id");

-- CreateIndex
CREATE UNIQUE INDEX "escopo_item_escopo_id_produto_id_endereco_id_key" ON "escopo_item"("escopo_id", "produto_id", "endereco_id");

-- AddForeignKey
ALTER TABLE "saldo_estoque" ADD CONSTRAINT "saldo_estoque_endereco_id_fkey" FOREIGN KEY ("endereco_id") REFERENCES "endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_endereco_id_fkey" FOREIGN KEY ("endereco_id") REFERENCES "endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escopo_item" ADD CONSTRAINT "escopo_item_endereco_id_fkey" FOREIGN KEY ("endereco_id") REFERENCES "endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
