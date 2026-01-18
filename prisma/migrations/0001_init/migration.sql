-- Migration: 0001_init
-- Creates tables required by Prisma schema

CREATE TABLE IF NOT EXISTS "Alerta" (
  id BIGSERIAL PRIMARY KEY,
  "userId" BIGINT NOT NULL,
  nome TEXT NOT NULL,
  filtros JSONB DEFAULT '{}'::jsonb,
  periodicidade TEXT DEFAULT 'diario',
  "criadoEm" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Favorito" (
  "userId" BIGINT NOT NULL,
  "licitacaoId" TEXT NOT NULL,
  "marcadoEm" TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY ("userId", "licitacaoId")
);

CREATE TABLE IF NOT EXISTS "PerfilEmpresa" (
  "userId" BIGINT PRIMARY KEY,
  dados JSONB DEFAULT '{}'::jsonb,
  "atualizadoEm" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "HistoricoContrato" (
  id TEXT PRIMARY KEY,
  cnpjOrgao TEXT NOT NULL,
  orgao TEXT NOT NULL,
  uf TEXT NOT NULL,
  municipio TEXT,
  objeto TEXT NOT NULL,
  fornecedorCnpj TEXT NOT NULL,
  fornecedorNome TEXT NOT NULL,
  valorContratado DOUBLE PRECISION DEFAULT 0,
  dataAssinatura TEXT,
  "dataPublicacao" TEXT,
  tipoContrato TEXT,
  areaAtuacao TEXT,
  palavrasChave JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS "Pipeline" (
  id TEXT PRIMARY KEY,
  "userId" BIGINT NOT NULL,
  objeto TEXT NOT NULL,
  orgao TEXT NOT NULL,
  uf TEXT NOT NULL,
  "valorEstimado" DOUBLE PRECISION,
  "dataAbertura" TEXT,
  modalidade TEXT,
  "cnpjOrgao" TEXT,
  status TEXT,
  observacoes TEXT,
  "adicionadoEm" TIMESTAMPTZ DEFAULT now(),
  "atualizadoEm" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Checklist" (
  id TEXT PRIMARY KEY,
  "userId" BIGINT NOT NULL,
  titulo TEXT,
  "licitacaoId" TEXT,
  orgao TEXT,
  objeto TEXT,
  "dataAbertura" TEXT,
  documentos JSONB DEFAULT '[]'::jsonb,
  "criadoEm" TIMESTAMPTZ DEFAULT now(),
  "atualizadoEm" TIMESTAMPTZ DEFAULT now()
);

-- Optional indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_alerta_user ON "Alerta" ("userId");
CREATE INDEX IF NOT EXISTS idx_favorito_user ON "Favorito" ("userId");
CREATE INDEX IF NOT EXISTS idx_perfilempresa_user ON "PerfilEmpresa" ("userId");
CREATE INDEX IF NOT EXISTS idx_historico_cnpj ON "HistoricoContrato" ("fornecedorCnpj");
CREATE INDEX IF NOT EXISTS idx_pipeline_user ON "Pipeline" ("userId");
CREATE INDEX IF NOT EXISTS idx_pipeline_adicionado ON "Pipeline" ("adicionadoEm");
CREATE INDEX IF NOT EXISTS idx_alerta_criado ON "Alerta" ("criadoEm");
CREATE INDEX IF NOT EXISTS idx_historico_data_publicacao ON "HistoricoContrato" ("dataPublicacao");
CREATE INDEX IF NOT EXISTS idx_checklists_user_licitacao ON "Checklist" ("userId", "licitacaoId");
CREATE INDEX IF NOT EXISTS idx_checklists_user ON "Checklist" ("userId");
CREATE INDEX IF NOT EXISTS idx_checklists_licitacao ON "Checklist" ("licitacaoId");
CREATE INDEX IF NOT EXISTS idx_checklists_criado ON "Checklist" ("criadoEm");
