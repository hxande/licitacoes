import { sql } from './db';

let ran = false;

export async function ensureTables() {
  if (ran) return;
  ran = true;
  try {
    console.info('ensureTables: attempting to create required tables (if not exist)');
    // Create tables using the exact names Prisma expects (quoted identifiers)
    await sql`CREATE TABLE IF NOT EXISTS "Alerta" (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL,
          nome TEXT NOT NULL,
          filtros JSONB DEFAULT '{}'::jsonb,
          periodicidade TEXT DEFAULT 'diario',
          criado_em TIMESTAMPTZ DEFAULT now()
        )`;

    await sql`CREATE TABLE IF NOT EXISTS "Favorito" (
          user_id BIGINT NOT NULL,
          licitacao_id TEXT NOT NULL,
          marcado_em TIMESTAMPTZ DEFAULT now(),
          PRIMARY KEY (user_id, licitacao_id)
        )`;

    await sql`CREATE TABLE IF NOT EXISTS "PerfilEmpresa" (
          user_id BIGINT PRIMARY KEY,
          dados JSONB DEFAULT '{}'::jsonb,
          atualizado_em TIMESTAMPTZ DEFAULT now()
        )`;

    await sql`CREATE TABLE IF NOT EXISTS "HistoricoContrato" (
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
        )`;
  } catch (err) {
    const e: any = err;
    console.warn('ensureTables failed (DB may be unreachable in this environment):', e?.message || e);
  }
}
