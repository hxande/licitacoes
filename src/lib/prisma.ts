import { PrismaClient } from '@prisma/client';

declare global {
    var __prisma__: PrismaClient | undefined;
}

// Adicionar connection_limit à URL se não existir (para PgBouncer/Supabase)
function getDatabaseUrl(): string {
    // Priorizar PRISMA_URL (porta 6543 com pgbouncer) sobre NON_POOLING (porta 5432)
    const baseUrl = process.env.LICITACOES__POSTGRES_PRISMA_URL
        || process.env.LICITACOES__POSTGRES_URL_NON_POOLING
        || '';

    // Se já tem connection_limit, usar como está
    if (baseUrl.includes('connection_limit')) {
        return baseUrl;
    }

    // Adicionar connection_limit=1 para ambientes serverless
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}connection_limit=1`;
}

// Configurar pool de conexões limitado para evitar "max clients reached"
const prismaClientSingleton = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: getDatabaseUrl(),
            },
        },
        // Log apenas em desenvolvimento
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
};

// Singleton pattern para Next.js (evita múltiplas instâncias em hot reload)
let _prisma: PrismaClient = global.__prisma__ ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    global.__prisma__ = _prisma;
}

export function getPrisma() {
    return _prisma;
}

async function recreatePrisma() {
    try {
        await _prisma.$disconnect();
    } catch (e) {
        // ignore
    }
    _prisma = prismaClientSingleton();
    if (process.env.NODE_ENV !== 'production') global.__prisma__ = _prisma;
    return _prisma;
}

// Delay helper para retry com backoff
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function withReconnect<T>(fn: (prisma: PrismaClient) => Promise<T>, maxRetries: number = 2): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn(_prisma);
        } catch (err: any) {
            lastError = err;
            const msg = (err && (err.message || err.toString())) || '';

            // Detect max clients error - wait and retry
            if (msg.includes('MaxCLientInSessionMode') || msg.includes('max clients')) {
                console.warn(`[Prisma] Max clients reached (attempt ${attempt + 1}/${maxRetries + 1}). Waiting before retry...`);
                if (attempt < maxRetries) {
                    await delay(500 * (attempt + 1)); // 500ms, 1000ms, 1500ms...
                    continue;
                }
            }

            // Detect prepared statement conflicts (pgbouncer issues)
            if (msg.includes('prepared statement') || msg.includes('already exists')) {
                console.warn('[Prisma] Prepared statement error. Recreating client...');
                try {
                    const newPrisma = await recreatePrisma();
                    return await fn(newPrisma);
                } catch (err2) {
                    throw err2;
                }
            }

            // Other errors - don't retry
            throw err;
        }
    }

    throw lastError;
}

export default _prisma;
