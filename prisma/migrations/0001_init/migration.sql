-- Migration: 0001_init
-- snake_case direto (Prisma == DB)

CREATE TABLE IF NOT EXISTS alerta (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  nome TEXT NOT NULL,
  filtros JSONB DEFAULT '{}'::jsonb,
  periodicidade TEXT DEFAULT 'diario',
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorito (
  user_id BIGINT NOT NULL,
  licitacao_id TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, licitacao_id)
);

CREATE TABLE IF NOT EXISTS perfil_empresa (
  user_id BIGINT PRIMARY KEY,
  dados JSONB DEFAULT '{}'::jsonb,
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS historico_contrato (
  id TEXT PRIMARY KEY,
  cnpj_orgao TEXT NOT NULL,
  orgao TEXT NOT NULL,
  uf TEXT NOT NULL,
  municipio TEXT,
  objeto TEXT NOT NULL,
  fornecedor_cnpj TEXT NOT NULL,
  fornecedor_nome TEXT NOT NULL,
  valor_contratado DOUBLE PRECISION DEFAULT 0,
  data_assinatura TEXT,
  data_publicacao TEXT,
  tipo_contrato TEXT,
  area_atuacao TEXT,
  palavras_chave JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS pipeline (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  objeto TEXT NOT NULL,
  orgao TEXT NOT NULL,
  uf TEXT NOT NULL,
  valor_estimado DOUBLE PRECISION,
  data_abertura TEXT,
  modalidade TEXT,
  cnpj_orgao TEXT,
  status TEXT,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  titulo TEXT,
  licitacao_id TEXT,
  orgao TEXT,
  objeto TEXT,
  data_abertura TEXT,
  documentos JSONB DEFAULT '[]'::jsonb,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alerta_user
  ON alerta (user_id);

CREATE INDEX IF NOT EXISTS idx_alerta_criado
  ON alerta (criado_em);

CREATE INDEX IF NOT EXISTS idx_pipeline_user
  ON pipeline (user_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_criado
  ON pipeline (criado_em);

CREATE INDEX IF NOT EXISTS idx_historico_fornecedor_cnpj
  ON historico_contrato (fornecedor_cnpj);

CREATE INDEX IF NOT EXISTS idx_historico_data_publicacao
  ON historico_contrato (data_publicacao);

CREATE INDEX IF NOT EXISTS idx_checklist_user
  ON checklist (user_id);

CREATE INDEX IF NOT EXISTS idx_checklist_licitacao
  ON checklist (licitacao_id);

CREATE INDEX IF NOT EXISTS idx_checklist_user_licitacao
  ON checklist (user_id, licitacao_id);

CREATE INDEX IF NOT EXISTS idx_checklist_criado
  ON checklist (criado_em);
