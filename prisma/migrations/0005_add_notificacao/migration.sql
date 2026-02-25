-- CreateTable
CREATE TABLE "notificacao" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "licitacao_id" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "lido_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificacao_user_id_lida_criado_em_idx" ON "notificacao"("user_id", "lida", "criado_em");

-- CreateIndex
CREATE INDEX "notificacao_user_id_tipo_licitacao_id_criado_em_idx" ON "notificacao"("user_id", "tipo", "licitacao_id", "criado_em");
