import { NextRequest, NextResponse } from 'next/server';
import prisma, { withReconnect } from '@/lib/prisma';
import { jsonResponse } from '@/lib/response';
import { getUsuarioFromRequest, respostaNaoAutorizado } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const res = await withReconnect((r: any) => r.alerta.findMany({ where: { user_id: usuario.userId }, orderBy: { criado_em: 'desc' } })) as any[];
        const rows = (res || []).map((r: any) => ({ id: r.id.toString(), nome: r.nome, filtros: r.filtros, periodicidade: r.periodicidade, criado_em: r.criado_em }));
        return jsonResponse(rows);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao listar alertas' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const body = await req.json();
        const { nome, filtros, periodicidade } = body;
        const created: any = await withReconnect((r: any) => r.alerta.create({ data: { user_id: usuario.userId as any, nome, filtros, periodicidade } }));
        return NextResponse.json({ id: created.id.toString(), criado_em: created.criado_em, nome: created.nome, filtros: created.filtros, periodicidade: created.periodicidade });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao criar alerta' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const body = await req.json();
        const { id, nome, filtros } = body;
        await withReconnect((r: any) => r.alerta.updateMany({ where: { id: BigInt(id as any) as any, user_id: usuario.userId as any }, data: { nome, filtros } }));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar alerta' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id missing' }, { status: 400 });
        await withReconnect((r: any) => r.alerta.deleteMany({ where: { id: BigInt(id as any) as any, user_id: usuario.userId as any } }));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao deletar alerta' }, { status: 500 });
    }
}
