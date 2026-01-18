-- Run this on your Postgres database to create the alertas table
CREATE TABLE IF NOT EXISTS "Alerta" (
  id BIGSERIAL PRIMARY KEY,
  "userId" BIGINT NOT NULL,
  nome TEXT NOT NULL,
  filtros JSONB DEFAULT '{}'::jsonb,
  periodicidade TEXT DEFAULT 'diario',
  "criadoEm" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pipeline (licitacoes no pipeline)
CREATE TABLE IF NOT EXISTS "Pipeline" (
  id TEXT PRIMARY KEY,
  "userId" BIGINT NOT NULL,
  objeto TEXT,
  orgao TEXT,
  uf TEXT,
  "valorEstimado" NUMERIC,
  "dataAbertura" TEXT,
  modalidade TEXT,
  "cnpjOrgao" TEXT,
  status TEXT,
  observacoes TEXT,
  "adicionadoEm" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "atualizadoEm" TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_user ON "Pipeline" ("userId");
CREATE INDEX IF NOT EXISTS idx_pipeline_adicionado ON "Pipeline" ("adicionadoEm");
CREATE INDEX IF NOT EXISTS idx_alerta_criado ON "Alerta" ("criadoEm");
-- Historico
CREATE INDEX IF NOT EXISTS idx_historico_data_publicacao ON "HistoricoContrato" ("dataPublicacao");
-- Checklist composite
CREATE INDEX IF NOT EXISTS idx_checklists_user_licitacao ON "Checklist" ("userId", "licitacaoId");
-- Checklists
CREATE TABLE IF NOT EXISTS "Checklist" (
  id TEXT PRIMARY KEY,
  "userId" BIGINT NOT NULL,
  titulo TEXT,
  "licitacaoId" TEXT,
  orgao TEXT,
  objeto TEXT,
  "dataAbertura" TEXT,
  documentos JSONB DEFAULT '[]',
  "criadoEm" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "atualizadoEm" TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checklists_user ON "Checklist" ("userId");
CREATE INDEX IF NOT EXISTS idx_checklists_licitacao ON "Checklist" ("licitacaoId");
CREATE INDEX IF NOT EXISTS idx_checklists_criado ON "Checklist" ("criadoEm");

-- Checklists
-- Favoritos (lista de ids de licitacao marcadas como favoritas)
CREATE TABLE IF NOT EXISTS "Favorito" (
  "userId" BIGINT NOT NULL,
  "licitacaoId" TEXT NOT NULL,
  "marcadoEm" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY ("userId", "licitacaoId")
);

-- Perfil da empresa (configurações do perfil)
CREATE TABLE IF NOT EXISTS "PerfilEmpresa" (
  "userId" BIGINT PRIMARY KEY,
  dados JSONB DEFAULT '{}'::jsonb,
  "atualizadoEm" TIMESTAMP WITH TIME ZONE DEFAULT now()
);
