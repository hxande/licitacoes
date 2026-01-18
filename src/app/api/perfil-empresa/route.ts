import { NextResponse } from 'next/server';
import { sql, isDbAvailable } from '@/lib/db';
import { ensureTables } from '@/lib/migrations';

const USER_ID = 999;

export async function GET() {
    try {
        await ensureTables();
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json(null, { status: 503 });
        const res = await sql`SELECT dados, atualizado_em FROM perfil_empresa WHERE user_id = ${USER_ID}` as any[];
        if (!res || res.length === 0) return NextResponse.json(null);
        return NextResponse.json(res[0]);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao obter perfil' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json({ error: 'DB inacessível' }, { status: 503 });
        const dados = await req.json();
        const exists = await sql`SELECT 1 FROM perfil_empresa WHERE user_id = ${USER_ID}` as any[];
        if (exists && exists.length > 0) {
            await sql`UPDATE perfil_empresa SET dados = ${dados}, atualizado_em = NOW() WHERE user_id = ${USER_ID}`;
        } else {
            await sql`INSERT INTO perfil_empresa(user_id, dados, atualizado_em) VALUES(${USER_ID}, ${dados}, NOW())`;
        }
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
    }
}
