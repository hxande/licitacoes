import { sql } from './db';

let ran = false;

export async function ensureTables() {
    if (ran) return;
    ran = true;
    try {
        await sql`CREATE TABLE IF NOT EXISTS alertas (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      nome TEXT NOT NULL,
      filtros JSONB DEFAULT '{}',
      periodicidade TEXT DEFAULT 'diario',
      criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
    )`;

        await sql`CREATE TABLE IF NOT EXISTS pipeline (
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
    )`;

        await sql`CREATE TABLE IF NOT EXISTS checklists (
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
    )`;

        await sql`CREATE TABLE IF NOT EXISTS favoritos (
      user_id BIGINT NOT NULL,
      licitacao_id TEXT NOT NULL,
      marcado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
      PRIMARY KEY (user_id, licitacao_id)
    )`;

        await sql`CREATE TABLE IF NOT EXISTS perfil_empresa (
      user_id BIGINT PRIMARY KEY,
      dados JSONB DEFAULT '{}',
      atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
    )`;
    } catch (err) {
        // If DB not reachable locally, fail silently — routes will handle errors.
        const e: any = err;
        console.warn('ensureTables failed (DB may be unreachable in this environment):', e?.message || e);
    }
}
