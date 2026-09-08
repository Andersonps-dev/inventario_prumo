-- DropForeignKey
ALTER TABLE "produto" DROP CONSTRAINT "produto_categoria_id_fkey";

-- DropIndex
DROP INDEX "produto_categoria_id_idx";

-- AlterTable
ALTER TABLE "produto" DROP COLUMN "categoria_id";

-- DropTable
DROP TABLE "categoria";

