-- Multiempresa (fase 2/2): empresa_id passa a obrigatório (exceto usuario/
-- auditoria, que continuam nullable pro SUPER_ADMIN e ações cross-tenant),
-- e os campos que eram únicos globalmente passam a únicos por empresa.

ALTER TABLE "produto" ALTER COLUMN "empresa_id" SET NOT NULL;
ALTER TABLE "deposito" ALTER COLUMN "empresa_id" SET NOT NULL;
ALTER TABLE "endereco" ALTER COLUMN "empresa_id" SET NOT NULL;
ALTER TABLE "saldo_estoque" ALTER COLUMN "empresa_id" SET NOT NULL;
ALTER TABLE "movimento_estoque" ALTER COLUMN "empresa_id" SET NOT NULL;
ALTER TABLE "escopo_inventario" ALTER COLUMN "empresa_id" SET NOT NULL;
ALTER TABLE "escopo_item" ALTER COLUMN "empresa_id" SET NOT NULL;
ALTER TABLE "contagem" ALTER COLUMN "empresa_id" SET NOT NULL;
ALTER TABLE "exportacao_job" ALTER COLUMN "empresa_id" SET NOT NULL;

-- DropIndex (únicos globais antigos — substituídos pelos compostos criados na migração anterior)
DROP INDEX "deposito_nome_key";
DROP INDEX "endereco_codigo_key";
DROP INDEX "escopo_inventario_codigo_key";
DROP INDEX "movimento_estoque_produto_id_criado_em_idx";
DROP INDEX "produto_codigo_barras_key";
DROP INDEX "produto_nome_idx";
DROP INDEX "produto_sku_key";

-- Um usuário SUPER_ADMIN nunca pertence a uma empresa; todo outro papel sempre pertence.
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_super_admin_empresa_check"
  CHECK (("papel" = 'SUPER_ADMIN' AND "empresa_id" IS NULL) OR ("papel" <> 'SUPER_ADMIN' AND "empresa_id" IS NOT NULL));
