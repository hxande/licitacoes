import { NextRequest, NextResponse } from 'next/server';
import prisma, { withReconnect } from '@/lib/prisma';
import { jsonResponse } from '@/lib/response';
import { getUsuarioFromRequest, respostaNaoAutorizado } from '@/lib/auth';

function convertChecklistFromDb(item: any) {
    if (!item) return null;
    console.log('Converting checklist from DB:', { id: item.id, licitacao_id: item.licitacao_id });
    return {
        id: item.id,
        licitacaoId: item.licitacao_id,
        titulo: item.titulo,
        orgao: item.orgao,
        objeto: item.objeto,
        dataAbertura: item.data_abertura,
        documentos: item.documentos || [],
        criadoEm: item.criado_em,
        atualizadoEm: item.atualizado_em,
    };
}

export async function GET(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const { searchParams } = new URL(req.url);
        const licitacao_id = searchParams.get('licitacaoId');
        if (licitacao_id) {
            const item = await withReconnect((p: any) => p.checklist.findFirst({ where: { user_id: usuario.userId, licitacao_id } }));
            return jsonResponse(convertChecklistFromDb(item));
        }
        const rows: any = await withReconnect((p: any) => p.checklist.findMany({ where: { user_id: usuario.userId }, orderBy: { criado_em: 'desc' } }));
        return jsonResponse(rows.map(convertChecklistFromDb));
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao listar checklists' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const body = await req.json();
        const { id, titulo, licitacaoId, orgao, objeto, dataAbertura, documentos } = body;

        // Se tiver ID, verifica se existe antes de criar
        if (id) {
            const existe = await withReconnect((p: any) => p.checklist.findUnique({ where: { id } }));
            if (existe) {
                // Atualizar ao invés de criar
                await withReconnect((p: any) => p.checklist.update({
                    where: { id },
                    data: {
                        titulo: titulo ?? undefined,
                        licitacao_id: licitacaoId ?? undefined,
                        orgao: orgao ?? undefined,
                        objeto: objeto ?? undefined,
                        data_abertura: dataAbertura ?? undefined,
                        documentos: documentos ?? undefined,
                        atualizado_em: new Date(),
                    }
                }));
                return NextResponse.json({ ok: true });
            }
        }

        await withReconnect((p: any) => p.checklist.create({
            data: {
                id: id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
