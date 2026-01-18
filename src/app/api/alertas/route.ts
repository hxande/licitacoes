import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureTables } from '@/lib/migrations';
import { isDbAvailable } from '@/lib/db';

const USER_ID = 999;

export async function GET() {
    try {
        await ensureTables();
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json([], { status: 503 });
        const res = await sql`SELECT id, nome, filtros, periodicidade, criado_em FROM alertas WHERE user_id = ${USER_ID} ORDER BY criado_em DESC` as any[];
        const rows = res.map((r: any) => ({ id: r.id.toString(), nome: r.nome, filtros: r.filtros, periodicidade: r.periodicidade, criadoEm: r.criado_em }));
        return NextResponse.json(rows);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao listar alertas' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json({ error: 'DB inacessível' }, { status: 503 });
        const { nome, filtros, periodicidade } = body;
        const res = await sql`INSERT INTO alertas(user_id, nome, filtros, periodicidade, criado_em) VALUES(${USER_ID}, ${nome}, ${filtros}, ${periodicidade}, NOW()) RETURNING id, criado_em` as any[];
        const row = res[0];
        return NextResponse.json({ id: row.id.toString(), criadoEm: row.criado_em, nome, filtros, periodicidade });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao criar alerta' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json({ error: 'DB inacessível' }, { status: 503 });
        const { id, nome, filtros } = body;
        await sql`UPDATE alertas SET nome = ${nome}, filtros = ${filtros} WHERE id = ${id} AND user_id = ${USER_ID}`;
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar alerta' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json({ error: 'DB inacessível' }, { status: 503 });
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id missing' }, { status: 400 });
        await sql`DELETE FROM alertas WHERE id = ${id} AND user_id = ${USER_ID}`;
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao deletar alerta' }, { status: 500 });
    }
}
