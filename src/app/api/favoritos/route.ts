import { NextResponse } from 'next/server';
import prisma, { withReconnect } from '@/lib/prisma';

const USER_ID = 999;

export async function GET() {
    try {
        const res = await withReconnect((r: any) => r.favorito.findMany({ where: { user_id: BigInt(USER_ID) } })) as any[];
        return NextResponse.json((res || []).map((r: any) => r.licitacao_id));
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
        const exists = await withReconnect((r: any) => r.favorito.findUnique({ where: { user_id_licitacao_id: { user_id: BigInt(USER_ID) as any, licitacao_id: licId } } }).catch(() => null)) as any;
        if (exists) {
            await withReconnect((r: any) => r.favorito.delete({ where: { user_id_licitacao_id: { user_id: BigInt(USER_ID) as any, licitacao_id: licId } } }));
            return NextResponse.json({ removed: true });
        } else {
            await withReconnect((r: any) => r.favorito.create({ data: { user_id: BigInt(USER_ID) as any, licitacao_id: licId } }));
            return NextResponse.json({ added: true });
        }
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar favorito' }, { status: 500 });
    }
}
