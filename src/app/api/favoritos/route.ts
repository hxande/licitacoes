import { NextResponse } from 'next/server';
import prisma, { withReconnect } from '@/lib/prisma';
import { ensureTables } from '@/lib/migrations';

const USER_ID = 999;

export async function GET() {
    try {
        await ensureTables();
        const res = await withReconnect((r: any) => r.favorito.findMany({ where: { userId: BigInt(USER_ID) } })) as any[];
        return NextResponse.json((res || []).map((r: any) => r.licitacaoId));
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao listar favoritos' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { licitacaoId } = await req.json();
        const licId = String(licitacaoId || '');
        if (!licId) return NextResponse.json({ error: 'licitacaoId missing' }, { status: 400 });
        const exists = await withReconnect((r: any) => r.favorito.findUnique({ where: { userId_licitacaoId: { userId: BigInt(USER_ID) as any, licitacaoId: licId } } }).catch(() => null)) as any;
        if (exists) {
            await withReconnect((r: any) => r.favorito.delete({ where: { userId_licitacaoId: { userId: BigInt(USER_ID) as any, licitacaoId: licId } } }));
            return NextResponse.json({ removed: true });
        } else {
            await withReconnect((r: any) => r.favorito.create({ data: { userId: BigInt(USER_ID) as any, licitacaoId: licId } }));
            return NextResponse.json({ added: true });
        }
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar favorito' }, { status: 500 });
    }
}
