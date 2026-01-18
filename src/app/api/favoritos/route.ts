import { NextResponse } from 'next/server';
import { sql, isDbAvailable } from '@/lib/db';
import { ensureTables } from '@/lib/migrations';

const USER_ID = 999;

export async function GET() {
    try {
        await ensureTables();
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json([], { status: 503 });
        const res = await sql`SELECT licitacao_id FROM favoritos WHERE user_id = ${USER_ID}` as any[];
        return NextResponse.json(res.map((r: any) => r.licitacao_id));
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao listar favoritos' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json({ error: 'DB inacessível' }, { status: 503 });
        const { licitacaoId } = await req.json();
        if (!licitacaoId) return NextResponse.json({ error: 'licitacaoId missing' }, { status: 400 });
        // toggle: if exists, remove; else add
        const exists = await sql`SELECT 1 FROM favoritos WHERE user_id = ${USER_ID} AND licitacao_id = ${licitacaoId}` as any[];
        if (exists && exists.length > 0) {
            await sql`DELETE FROM favoritos WHERE user_id = ${USER_ID} AND licitacao_id = ${licitacaoId}`;
            return NextResponse.json({ removed: true });
        } else {
            await sql`INSERT INTO favoritos(user_id, licitacao_id, marcado_em) VALUES(${USER_ID}, ${licitacaoId}, NOW())`;
            return NextResponse.json({ added: true });
        }
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar favorito' }, { status: 500 });
    }
}
