import { NextResponse } from 'next/server';
import prisma, { withReconnect } from '@/lib/prisma';
import { isDbAvailable } from '@/lib/db';
import { ensureTables } from '@/lib/migrations';
import { jsonResponse } from '@/lib/response';

const USER_ID = 999;

export async function GET() {
    try {
        await ensureTables();
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json([], { status: 503 });
        const rows = await withReconnect((p: any) => p.pipeline.findMany({ where: { user_id: BigInt(USER_ID) }, orderBy: { criado_em: 'desc' } })) as any[];
        return jsonResponse(rows || []);
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
        await withReconnect((p: any) => p.pipeline.create({
            data: {
                id,
                user_id: BigInt(USER_ID) as any,
                objeto,
                orgao,
                uf,
                valor_estimado: (valorEstimado ?? null) as any,
                data_abertura: dataAbertura ?? null,
                modalidade: modalidade ?? null,
                cnpj_orgao: cnpjOrgao ?? null,
                status: status ?? null,
                observacoes: observacoes ?? null,
            }
        }));
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
        await withReconnect((p: any) => p.pipeline.updateMany({ where: { id, user_id: BigInt(USER_ID) as any }, data: { status: status ?? undefined, observacoes: observacoes ?? undefined, atualizado_em: new Date() } }));
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
        await withReconnect((p: any) => p.pipeline.deleteMany({ where: { id, user_id: BigInt(USER_ID) as any } }));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao deletar do pipeline' }, { status: 500 });
    }
}
