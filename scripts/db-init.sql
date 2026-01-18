-- Run this on your Postgres database to create the alertas table
CREATE TABLE IF NOT EXISTS alertas (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  nome TEXT NOT NULL,
  filtros JSONB DEFAULT '{}',
  periodicidade TEXT DEFAULT 'diario',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pipeline (licitacoes no pipeline)
CREATE TABLE IF NOT EXISTS pipeline (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  objeto TEXT,
  orgao TEXT,
  uf TEXT,
  valor_estimado NUMERIC,
  data_abertura TEXT,
  modalidade TEXT,
  cnpj_orgao TEXT,
  status TEXT,
  observacoes TEXT,
  adicionado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Checklists
CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  titulo TEXT,
  licitacao_id TEXT,
  orgao TEXT,
  objeto TEXT,
  data_abertura TEXT,
  documentos JSONB DEFAULT '[]',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Favoritos (lista de ids de licitacao marcadas como favoritas)
CREATE TABLE IF NOT EXISTS favoritos (
  user_id BIGINT NOT NULL,
  licitacao_id TEXT NOT NULL,
  marcado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (user_id, licitacao_id)
);

-- Perfil da empresa (configurações do perfil)
CREATE TABLE IF NOT EXISTS perfil_empresa (
  user_id BIGINT PRIMARY KEY,
  dados JSONB DEFAULT '{}',
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);
