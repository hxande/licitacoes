import { Pool } from 'pg';

// Use the LICITACOES__POSTGRES_URL as primary, fallback to common env vars
const PRIMARY_CONNECTION = process.env.LICITACOES__POSTGRES_URL || process.env.LICITACOES__POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
const NON_POOLING_CONNECTION = process.env.LICITACOES__POSTGRES_URL_NON_POOLING || '';

let pool: Pool | null = null;

function makePool(connectionString: string) {
    // Provide reasonable defaults and SSL option for hosted providers
    const config: any = { connectionString, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000 };
    // If connecting to Supabase host, ensure ssl is enabled
    if (/supabase\.co|supa=/.test(connectionString) || /sslmode=require/.test(connectionString)) {
        config.ssl = { rejectUnauthorized: false };
    }
    const p = new Pool(config);
    p.on('error', (err) => {
        console.error('Postgres pool error:', err?.message || err);
    });
    return p;
}

function getPool(): Pool {
    if (pool) return pool;
    if (!PRIMARY_CONNECTION && !NON_POOLING_CONNECTION) {
        throw new Error('No Postgres connection string found in environment (LICITACOES__POSTGRES_URL or DATABASE_URL)');
    }
    // Try primary (pooling) first
    if (PRIMARY_CONNECTION) {
        try {
            const p = makePool(PRIMARY_CONNECTION);
            // try a quick connect to validate connectivity
            // use promise style to avoid top-level await in non-async function
            try {
                p.connect().then((c) => { c.release(); }).catch((err) => { throw err; });
            } catch (err) {
                console.warn('Primary pool created but connect test failed:', (err as any)?.message || err);
                try { (p as any).end && (p as any).end(); } catch (e) { }
                throw err;
            }
            pool = p;
            return pool;
        } catch (err) {
            console.warn('Primary connection failed to initialize pool or connect:', (err as any)?.message || err);
            pool = null;
        }
    }
    // Fallback to non-pooling URL if available
    if (NON_POOLING_CONNECTION) {
        try {
            pool = makePool(NON_POOLING_CONNECTION);
            console.info('Using non-pooling Postgres connection as fallback');
            return pool;
        } catch (err) {
            console.error('Fallback non-pooling connection failed:', (err as any)?.message || err);
            pool = null;
        }
    }
    // If we get here, throw to indicate no workable connection
    throw new Error('Unable to initialize Postgres pool with provided connection strings');
}

// Keep the same `sql` helper API: supports tagged templates and plain calls
export const sql = async (queryOrStrings: TemplateStringsArray | string, ...values: any[]) => {
    const client = await getPool().connect();
    try {
        if (Array.isArray(queryOrStrings) && (queryOrStrings as any).raw) {
            const strings = queryOrStrings as TemplateStringsArray;
            let text = '';
            const params: any[] = [];
            for (let i = 0; i < strings.length; i++) {
                text += strings[i];
                if (i < values.length) {
                    params.push(values[i]);
                    text += `$${params.length}`;
                }
            }
            const res = await client.query(text, params);
            return res.rows;
        }

        const text = queryOrStrings as string;
        if (values.length === 1 && Array.isArray(values[0])) {
            const res = await client.query(text, values[0]);
            return res.rows;
        }
        const res = await client.query(text, values);
        return res.rows;
    } finally {
        client.release();
    }
};

let _dbAvailable: boolean | null = null;
export async function isDbAvailable(): Promise<boolean> {
    if (_dbAvailable !== null) return _dbAvailable;
    try {
        const rows = await sql('SELECT 1');
        _dbAvailable = !!rows;
    } catch (err) {
        console.warn('isDbAvailable failed:', (err as any)?.message || err);
        _dbAvailable = false;
    }
    return _dbAvailable;
}
