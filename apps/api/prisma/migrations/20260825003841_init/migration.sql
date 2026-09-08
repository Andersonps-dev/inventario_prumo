-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('CONTADOR', 'SUPERVISOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoMovimento" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE_INVENTARIO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "OrigemTipo" AS ENUM ('ESCOPO_ITEM', 'MANUAL', 'IMPORTACAO');

-- CreateEnum
CREATE TYPE "StatusEscopo" AS ENUM ('RASCUNHO', 'ABERTO', 'EM_CONTAGEM', 'CONFERENCIA', 'EFETIVADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusEscopoItem" AS ENUM ('PENDENTE', 'CONTADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusContagem" AS ENUM ('VALIDA', 'SUBSTITUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "AcaoAuditoria" AS ENUM ('CRIAR', 'EDITAR', 'CANCELAR', 'EFETIVAR');

-- CreateEnum
CREATE TYPE "PoliticaPendentes" AS ENUM ('IGNORAR', 'ZERAR');

-- CreateTable
CREATE TABLE "categoria" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produto" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "codigo_barras" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria_id" INTEGER,
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "preco_custo" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "estoque_minimo" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposito" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "deposito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldo_estoque" (
    "produto_id" INTEGER NOT NULL,
    "deposito_id" INTEGER NOT NULL,
    "quantidade" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saldo_estoque_pkey" PRIMARY KEY ("produto_id","deposito_id")
);

-- CreateTable
CREATE TABLE "movimento_estoque" (
    "id" SERIAL NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "deposito_id" INTEGER NOT NULL,
    "tipo" "TipoMovimento" NOT NULL,
    "quantidade" DECIMAL(14,4) NOT NULL,
    "saldo_anterior" DECIMAL(14,4) NOT NULL,
    "saldo_posterior" DECIMAL(14,4) NOT NULL,
    "custo_unitario" DECIMAL(14,4),
    "origem_tipo" "OrigemTipo",
    "origem_id" INTEGER,
    "motivo" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimento_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escopo_inventario" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "deposito_id" INTEGER NOT NULL,
    "status" "StatusEscopo" NOT NULL DEFAULT 'RASCUNHO',
    "criterio_selecao" JSONB,
    "responsavel_id" INTEGER,
    "prazo" DATE,
    "observacao" TEXT,
    "aberto_por" INTEGER,
    "aberto_em" TIMESTAMP(3),
    "efetivado_por" INTEGER,
    "efetivado_em" TIMESTAMP(3),
    "cancelado_por" INTEGER,
    "cancelado_em" TIMESTAMP(3),
    "motivo_cancelamento" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escopo_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escopo_item" (
    "id" SERIAL NOT NULL,
    "escopo_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "saldo_congelado" DECIMAL(14,4) NOT NULL,
    "saldo_na_efetivacao" DECIMAL(14,4),
    "quantidade_final" DECIMAL(14,4),
    "diferenca" DECIMAL(14,4),
    "status" "StatusEscopoItem" NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "escopo_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contagem" (
    "id" SERIAL NOT NULL,
    "escopo_item_id" INTEGER NOT NULL,
    "sequencia" INTEGER NOT NULL,
    "quantidade" DECIMAL(14,4) NOT NULL,
    "status" "StatusContagem" NOT NULL DEFAULT 'VALIDA',
    "observacao" TEXT,
    "contado_por" INTEGER NOT NULL,
    "contado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelado_por" INTEGER,
    "cancelado_em" TIMESTAMP(3),
    "motivo_cancelamento" TEXT,

    CONSTRAINT "contagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" INTEGER NOT NULL,
    "acao" "AcaoAuditoria" NOT NULL,
    "antes" JSONB,
    "depois" JSONB,
    "usuario_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categoria_nome_key" ON "categoria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "produto_sku_key" ON "produto"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "produto_codigo_barras_key" ON "produto"("codigo_barras");

-- CreateIndex
CREATE INDEX "produto_nome_idx" ON "produto"("nome");

-- CreateIndex
CREATE INDEX "produto_categoria_id_idx" ON "produto"("categoria_id");

-- CreateIndex
CREATE UNIQUE INDEX "deposito_nome_key" ON "deposito"("nome");

-- CreateIndex
CREATE INDEX "movimento_estoque_produto_id_criado_em_idx" ON "movimento_estoque"("produto_id", "criado_em");

-- CreateIndex
CREATE INDEX "movimento_estoque_origem_tipo_origem_id_idx" ON "movimento_estoque"("origem_tipo", "origem_id");

-- CreateIndex
CREATE UNIQUE INDEX "escopo_inventario_codigo_key" ON "escopo_inventario"("codigo");

-- CreateIndex
CREATE INDEX "escopo_item_escopo_id_status_idx" ON "escopo_item"("escopo_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "escopo_item_escopo_id_produto_id_key" ON "escopo_item"("escopo_id", "produto_id");

-- CreateIndex
CREATE INDEX "contagem_escopo_item_id_sequencia_idx" ON "contagem"("escopo_item_id", "sequencia");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "auditoria_entidade_entidade_id_idx" ON "auditoria"("entidade", "entidade_id");

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "produto_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldo_estoque" ADD CONSTRAINT "saldo_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldo_estoque" ADD CONSTRAINT "saldo_estoque_deposito_id_fkey" FOREIGN KEY ("deposito_id") REFERENCES "deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_deposito_id_fkey" FOREIGN KEY ("deposito_id") REFERENCES "deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escopo_inventario" ADD CONSTRAINT "escopo_inventario_deposito_id_fkey" FOREIGN KEY ("deposito_id") REFERENCES "deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escopo_inventario" ADD CONSTRAINT "escopo_inventario_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escopo_inventario" ADD CONSTRAINT "escopo_inventario_aberto_por_fkey" FOREIGN KEY ("aberto_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escopo_inventario" ADD CONSTRAINT "escopo_inventario_efetivado_por_fkey" FOREIGN KEY ("efetivado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escopo_inventario" ADD CONSTRAINT "escopo_inventario_cancelado_por_fkey" FOREIGN KEY ("cancelado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escopo_item" ADD CONSTRAINT "escopo_item_escopo_id_fkey" FOREIGN KEY ("escopo_id") REFERENCES "escopo_inventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escopo_item" ADD CONSTRAINT "escopo_item_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contagem" ADD CONSTRAINT "contagem_escopo_item_id_fkey" FOREIGN KEY ("escopo_item_id") REFERENCES "escopo_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contagem" ADD CONSTRAINT "contagem_contado_por_fkey" FOREIGN KEY ("contado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contagem" ADD CONSTRAINT "contagem_cancelado_por_fkey" FOREIGN KEY ("cancelado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
