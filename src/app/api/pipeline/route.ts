import { NextRequest, NextResponse } from 'next/server';
import prisma, { withReconnect } from '@/lib/prisma';
import { jsonResponse } from '@/lib/response';
import { getUsuarioFromRequest, respostaNaoAutorizado } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const rows = await withReconnect((p: any) => p.pipeline.findMany({ where: { user_id: usuario.userId }, orderBy: { criado_em: 'desc' } })) as any[];
        return jsonResponse(rows || []);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao listar pipeline' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const body = await req.json();
        const { id, objeto, orgao, uf, valorEstimado, dataAbertura, modalidade, cnpjOrgao, status, observacoes } = body;
        await withReconnect((p: any) => p.pipeline.create({
            data: {
                id,
                user_id: usuario.userId as any,
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

export async function PUT(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const body = await req.json();
        const { id, status, observacoes } = body;
        await withReconnect((p: any) => p.pipeline.updateMany({ where: { id, user_id: usuario.userId as any }, data: { status: status ?? undefined, observacoes: observacoes ?? undefined, atualizado_em: new Date() } }));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar pipeline' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id missing' }, { status: 400 });
        await withReconnect((p: any) => p.pipeline.deleteMany({ where: { id, user_id: usuario.userId as any } }));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao deletar do pipeline' }, { status: 500 });
    }
}
