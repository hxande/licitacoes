import { NextResponse } from 'next/server';
import prisma, { withReconnect } from '@/lib/prisma';
import { ensureTables } from '@/lib/migrations';

const USER_ID = 999;

export async function GET() {
    try {
        await ensureTables();
        const res = await withReconnect(r => r.favorito.findMany({ where: { user_id: BigInt(USER_ID) as any } }));
        return NextResponse.json(res.map(r => r.licitacao_id));
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao listar favoritos' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { licitacaoId } = await req.json();
        if (!licitacaoId) return NextResponse.json({ error: 'licitacaoId missing' }, { status: 400 });
        const exists = await withReconnect(r => r.favorito.findUnique({ where: { user_id_licitacao_id: { user_id: BigInt(USER_ID) as any, licitacao_id: licitacaoId } } }).catch(() => null));
        if (exists) {
            await withReconnect(r => r.favorito.delete({ where: { user_id_licitacao_id: { user_id: BigInt(USER_ID) as any, licitacao_id: licitacaoId } } }));
            return NextResponse.json({ removed: true });
        } else {
            await withReconnect(r => r.favorito.create({ data: { user_id: BigInt(USER_ID) as any, licitacao_id: licitacaoId } }));
            return NextResponse.json({ added: true });
        }
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar favorito' }, { status: 500 });
    }
}
