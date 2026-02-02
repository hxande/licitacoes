-- CreateTable
CREATE TABLE IF NOT EXISTS "usuario" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "email_verificado" BOOLEAN NOT NULL DEFAULT false,
    "token_verificacao" TEXT,
    "token_expira_em" TIMESTAMP(3),
    "token_reset_senha" TEXT,
    "reset_expira_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "sessao" (
    "id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sessao_token_key" ON "sessao"("token");
