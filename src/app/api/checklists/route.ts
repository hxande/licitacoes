import { NextResponse } from 'next/server';
import prisma, { withReconnect } from '@/lib/prisma';
import { isDbAvailable } from '@/lib/db';
import { jsonResponse } from '@/lib/response';

const USER_ID = 999;

export async function GET(req: Request) {
    try {
        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json([], { status: 503 });
        const { searchParams } = new URL(req.url);
        const licitacao_id = searchParams.get('licitacaoId');
        if (licitacao_id) {
            const item = await withReconnect((p: any) => p.checklist.findFirst({ where: { user_id: BigInt(USER_ID), licitacao_id } }));
            return jsonResponse(item ?? null);
        }
        const rows = await withReconnect((p: any) => p.checklist.findMany({ where: { user_id: BigInt(USER_ID) }, orderBy: { criado_em: 'desc' } }));
        return jsonResponse(rows);
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
        await withReconnect((p: any) => p.checklist.create({
            data: {
                id,
                user_id: BigInt(USER_ID),
                titulo: titulo ?? null,
                licitacao_id: licitacaoId ?? null,
                orgao: orgao ?? null,
                objeto: objeto ?? null,
                data_abertura: dataAbertura ?? null,
                documentos: documentos ?? []
            }
        }));
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
        await withReconnect((p: any) => p.checklist.updateMany({ where: { id, user_id: BigInt(USER_ID) }, data: { titulo: titulo ?? undefined, documentos: documentos ?? undefined, atualizado_em: new Date() } }));
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
        await withReconnect((p: any) => p.checklist.deleteMany({ where: { id, user_id: BigInt(USER_ID) } }));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao deletar checklist' }, { status: 500 });
    }
}
