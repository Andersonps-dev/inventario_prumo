-- CreateEnum
CREATE TYPE "TipoExportacao" AS ENUM ('CATALOGO', 'POSICAO_ESTOQUE', 'KARDEX', 'ESCOPO', 'CONTAGENS', 'MOVIMENTOS', 'DASHBOARD');

-- CreateEnum
CREATE TYPE "FormatoExportacao" AS ENUM ('CSV', 'XLSX', 'JSON', 'XML');

-- CreateEnum
CREATE TYPE "StatusExportacao" AS ENUM ('PENDENTE', 'PROCESSANDO', 'CONCLUIDO', 'ERRO');

-- AlterEnum
ALTER TYPE "AcaoAuditoria" ADD VALUE 'EXPORTAR';

-- CreateTable
CREATE TABLE "exportacao_job" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoExportacao" NOT NULL,
    "formato" "FormatoExportacao" NOT NULL,
    "filtros" JSONB,
    "status" "StatusExportacao" NOT NULL DEFAULT 'PENDENTE',
    "caminho" TEXT,
    "erro" TEXT,
    "criado_por" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluido_em" TIMESTAMP(3),

    CONSTRAINT "exportacao_job_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "exportacao_job" ADD CONSTRAINT "exportacao_job_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
