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
          "userId" BIGINT NOT NULL,
          nome TEXT NOT NULL,
          filtros JSONB DEFAULT '{}'::jsonb,
          periodicidade TEXT DEFAULT 'diario',
          "criadoEm" TIMESTAMPTZ DEFAULT now()
        )`;

    await sql`CREATE TABLE IF NOT EXISTS "Favorito" (
          "userId" BIGINT NOT NULL,
          "licitacaoId" TEXT NOT NULL,
          "marcadoEm" TIMESTAMPTZ DEFAULT now(),
          PRIMARY KEY ("userId", "licitacaoId")
        )`;

    await sql`CREATE TABLE IF NOT EXISTS "PerfilEmpresa" (
          "userId" BIGINT PRIMARY KEY,
          dados JSONB DEFAULT '{}'::jsonb,
          "atualizadoEm" TIMESTAMPTZ DEFAULT now()
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
          "dataPublicacao" TEXT,
          tipoContrato TEXT,
          areaAtuacao TEXT,
          palavrasChave JSONB DEFAULT '[]'::jsonb
        )`;

    // Pipeline table with capitalized name and quoted identifier (Prisma style)
    await sql`CREATE TABLE IF NOT EXISTS "Pipeline" (
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
    )`;
    // Indexes for Pipeline
    await sql`CREATE INDEX IF NOT EXISTS idx_pipeline_user ON "Pipeline" ("userId")`;
    await sql`CREATE INDEX IF NOT EXISTS idx_pipeline_adicionado ON "Pipeline" ("adicionadoEm")`;
    // Alerta indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_alerta_criado ON "Alerta" ("criadoEm")`;
    // Historico indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_historico_data_publicacao ON "HistoricoContrato" ("dataPublicacao")`;
    // Checklist composite index
    await sql`CREATE INDEX IF NOT EXISTS idx_checklists_user_licitacao ON "Checklist" ("userId", "licitacaoId")`;
    // Checklists table and indexes
    await sql`CREATE TABLE IF NOT EXISTS "Checklist" (
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
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_checklists_user ON "Checklist" ("userId")`;
    await sql`CREATE INDEX IF NOT EXISTS idx_checklists_licitacao ON "Checklist" ("licitacaoId")`;
    await sql`CREATE INDEX IF NOT EXISTS idx_checklists_criado ON "Checklist" ("criadoEm")`;
  } catch (err) {
    const e: any = err;
    console.warn('ensureTables failed (DB may be unreachable in this environment):', e?.message || e);
  }
}
