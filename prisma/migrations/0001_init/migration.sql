-- Migration: 0001_init
-- Creates tables required by Prisma schema

CREATE TABLE IF NOT EXISTS "Alerta" (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  nome TEXT NOT NULL,
  filtros JSONB DEFAULT '{}'::jsonb,
  periodicidade TEXT DEFAULT 'diario',
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Favorito" (
  user_id BIGINT NOT NULL,
  licitacao_id TEXT NOT NULL,
  marcado_em TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, licitacao_id)
);

CREATE TABLE IF NOT EXISTS "PerfilEmpresa" (
  user_id BIGINT PRIMARY KEY,
  dados JSONB DEFAULT '{}'::jsonb,
  atualizado_em TIMESTAMPTZ DEFAULT now()
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
  dataPublicacao TEXT,
  tipoContrato TEXT,
  areaAtuacao TEXT,
  palavrasChave JSONB DEFAULT '[]'::jsonb
);

-- Optional indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_alerta_user ON "Alerta" (user_id);
CREATE INDEX IF NOT EXISTS idx_favorito_user ON "Favorito" (user_id);
CREATE INDEX IF NOT EXISTS idx_perfilempresa_user ON "PerfilEmpresa" (user_id);
CREATE INDEX IF NOT EXISTS idx_historico_cnpj ON "HistoricoContrato" (fornecedorCnpj);
