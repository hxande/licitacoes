import { NextResponse } from 'next/server';
import { sql, isDbAvailable } from '@/lib/db';
import { ensureTables } from '@/lib/migrations';

const USER_ID = 999;

export async function GET() {
    try {
        await ensureTables();
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json([], { status: 503 });
        const res = await sql`SELECT id, objeto, orgao, uf, valor_estimado, data_abertura, modalidade, cnpj_orgao, status, observacoes, adicionado_em, atualizado_em FROM pipeline WHERE user_id = ${USER_ID}` as any[];
        return NextResponse.json(res);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao listar pipeline' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json({ error: 'DB inacessível' }, { status: 503 });
        const body = await req.json();
        const { id, objeto, orgao, uf, valorEstimado, dataAbertura, modalidade, cnpjOrgao, status, observacoes } = body;
        await sql`INSERT INTO pipeline(id, user_id, objeto, orgao, uf, valor_estimado, data_abertura, modalidade, cnpj_orgao, status, observacoes, adicionado_em, atualizado_em) VALUES(${id}, ${USER_ID}, ${objeto}, ${orgao}, ${uf}, ${valorEstimado}, ${dataAbertura}, ${modalidade}, ${cnpjOrgao}, ${status}, ${observacoes}, NOW(), NOW())`;
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao adicionar ao pipeline' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json({ error: 'DB inacessível' }, { status: 503 });
        const body = await req.json();
        const { id, status, observacoes } = body;
        await sql`UPDATE pipeline SET status = ${status}, observacoes = ${observacoes}, atualizado_em = NOW() WHERE id = ${id} AND user_id = ${USER_ID}`;
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar pipeline' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json({ error: 'DB inacessível' }, { status: 503 });
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id missing' }, { status: 400 });
        await sql`DELETE FROM pipeline WHERE id = ${id} AND user_id = ${USER_ID}`;
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao deletar do pipeline' }, { status: 500 });
    }
}
