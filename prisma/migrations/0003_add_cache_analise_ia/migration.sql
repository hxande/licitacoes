-- CreateTable
CREATE TABLE "cache_analise_ia" (
    "id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "licitacao_id" TEXT NOT NULL,
    "tipo_analise" TEXT NOT NULL,
    "dados_entrada" JSONB NOT NULL,
    "resultado" JSONB NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cache_analise_ia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cache_analise_ia_user_id_idx" ON "cache_analise_ia"("user_id");

-- CreateIndex
CREATE INDEX "cache_analise_ia_licitacao_id_idx" ON "cache_analise_ia"("licitacao_id");

-- CreateIndex
CREATE INDEX "cache_analise_ia_tipo_analise_idx" ON "cache_analise_ia"("tipo_analise");

-- CreateIndex
CREATE UNIQUE INDEX "cache_analise_ia_user_id_licitacao_id_tipo_analise_key" ON "cache_analise_ia"("user_id", "licitacao_id", "tipo_analise");
