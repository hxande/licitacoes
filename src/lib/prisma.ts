import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var __prisma__: PrismaClient | undefined;
}

let _prisma: PrismaClient = global.__prisma__ ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.__prisma__ = _prisma;

export function getPrisma() {
    return _prisma;
}

async function recreatePrisma() {
    try {
        await _prisma.$disconnect();
    } catch (e) {
        // ignore
    }
    _prisma = new PrismaClient();
    if (process.env.NODE_ENV !== 'production') global.__prisma__ = _prisma;
    return _prisma;
}

export async function withReconnect<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    try {
        return await fn(_prisma);
    } catch (err: any) {
        const msg = (err && (err.message || err.toString())) || '';
        // Detect prepared statement conflicts (pgbouncer / pooled prepared statement issues)
        if (msg.includes('prepared statement') || msg.includes('already exists')) {
            console.warn('Prisma connector error detected (prepared statement). Recreating client and retrying once.');
            try {
                const newPrisma = await recreatePrisma();
                return await fn(newPrisma);
            } catch (err2) {
                throw err2;
            }
        }
        throw err;
    }
}

export default _prisma;
