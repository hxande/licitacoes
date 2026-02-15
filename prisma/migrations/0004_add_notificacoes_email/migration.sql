-- AlterTable
ALTER TABLE "usuario" ADD COLUMN "notificacoes_email" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "log_notificacao" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detalhes" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "log_notificacao_user_id_tipo_criado_em_idx" ON "log_notificacao"("user_id", "tipo", "criado_em");
