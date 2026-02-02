import { NextRequest, NextResponse } from 'next/server';
import prisma, { withReconnect } from '@/lib/prisma';
import { isDbAvailable } from '@/lib/db';
import { jsonResponse } from '@/lib/response';
import { getUsuarioFromRequest, respostaNaoAutorizado } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json([], { status: 503 });
        const { searchParams } = new URL(req.url);
        const licitacao_id = searchParams.get('licitacaoId');
        if (licitacao_id) {
            const item = await withReconnect((p: any) => p.checklist.findFirst({ where: { user_id: usuario.userId, licitacao_id } }));
            return jsonResponse(item ?? null);
        }
        const rows = await withReconnect((p: any) => p.checklist.findMany({ where: { user_id: usuario.userId }, orderBy: { criado_em: 'desc' } }));
        return jsonResponse(rows);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao listar checklists' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json({ error: 'DB inacessível' }, { status: 503 });
        const body = await req.json();
        const { id, titulo, licitacaoId, orgao, objeto, dataAbertura, documentos } = body;
        await withReconnect((p: any) => p.checklist.create({
            data: {
                id,
                user_id: usuario.userId,
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

export async function PUT(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json({ error: 'DB inacessível' }, { status: 503 });
        const body = await req.json();
        const { id, titulo, documentos } = body;
        await withReconnect((p: any) => p.checklist.updateMany({ where: { id, user_id: usuario.userId }, data: { titulo: titulo ?? undefined, documentos: documentos ?? undefined, atualizado_em: new Date() } }));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar checklist' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const ok = await isDbAvailable();
        if (!ok) return NextResponse.json({ error: 'DB inacessível' }, { status: 503 });
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id missing' }, { status: 400 });
        await withReconnect((p: any) => p.checklist.deleteMany({ where: { id, user_id: usuario.userId } }));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao deletar checklist' }, { status: 500 });
    }
}
