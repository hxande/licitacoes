import { NextResponse } from 'next/server';
import { sql, isDbAvailable } from '@/lib/db';
import { ensureTables } from '@/lib/migrations';

const USER_ID = 999;

export async function GET(req: Request) {
    try {
        await ensureTables();
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json([], { status: 503 });
        const { searchParams } = new URL(req.url);
        const licitacaoId = searchParams.get('licitacaoId');
        if (licitacaoId) {
            const res = await sql`SELECT * FROM checklists WHERE user_id = ${USER_ID} AND licitacao_id = ${licitacaoId}` as any[];
            return NextResponse.json(res[0] ?? null);
        }
        const res = await sql`SELECT * FROM checklists WHERE user_id = ${USER_ID} ORDER BY criado_em DESC` as any[];
        return NextResponse.json(res);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao listar checklists' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json({ error: 'DB inacessível' }, { status: 503 });
        const body = await req.json();
        const { id, titulo, licitacaoId, orgao, objeto, dataAbertura, documentos } = body;
        await sql`INSERT INTO checklists(id, user_id, titulo, licitacao_id, orgao, objeto, data_abertura, documentos, criado_em, atualizado_em) VALUES(${id}, ${USER_ID}, ${titulo}, ${licitacaoId}, ${orgao}, ${objeto}, ${dataAbertura}, ${documentos}, NOW(), NOW())`;
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao criar checklist' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json({ error: 'DB inacessível' }, { status: 503 });
        const body = await req.json();
        const { id, titulo, documentos } = body;
        await sql`UPDATE checklists SET titulo = ${titulo}, documentos = ${documentos}, atualizado_em = NOW() WHERE id = ${id} AND user_id = ${USER_ID}`;
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar checklist' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json({ error: 'DB inacessível' }, { status: 503 });
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id missing' }, { status: 400 });
        await sql`DELETE FROM checklists WHERE id = ${id} AND user_id = ${USER_ID}`;
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao deletar checklist' }, { status: 500 });
    }
}
