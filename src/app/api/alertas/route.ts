import { NextResponse } from 'next/server';
import prisma, { withReconnect } from '@/lib/prisma';
import { jsonResponse } from '@/lib/response';

const USER_ID = 999;

export async function GET() {
    try {
        const res = await withReconnect((r: any) => r.alerta.findMany({ where: { user_id: BigInt(USER_ID) }, orderBy: { criado_em: 'desc' } })) as any[];
        const rows = (res || []).map((r: any) => ({ id: r.id.toString(), nome: r.nome, filtros: r.filtros, periodicidade: r.periodicidade, criado_em: r.criado_em }));
        return jsonResponse(rows);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao listar alertas' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { nome, filtros, periodicidade } = body;
        const created: any = await withReconnect((r: any) => r.alerta.create({ data: { user_id: BigInt(USER_ID) as any, nome, filtros, periodicidade } }));
        return NextResponse.json({ id: created.id.toString(), criado_em: created.criado_em, nome: created.nome, filtros: created.filtros, periodicidade: created.periodicidade });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao criar alerta' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, nome, filtros } = body;
        await withReconnect((r: any) => r.alerta.updateMany({ where: { id: BigInt(id as any) as any, user_id: BigInt(USER_ID) as any }, data: { nome, filtros } }));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar alerta' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id missing' }, { status: 400 });
        await withReconnect((r: any) => r.alerta.deleteMany({ where: { id: BigInt(id as any) as any, user_id: BigInt(USER_ID) as any } }));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao deletar alerta' }, { status: 500 });
    }
}
