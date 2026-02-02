import { NextRequest, NextResponse } from 'next/server';
import prisma, { withReconnect } from '@/lib/prisma';
import { jsonResponse } from '@/lib/response';
import { getUsuarioFromRequest, respostaNaoAutorizado } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const res = await withReconnect((r: any) => r.perfil_empresa.findUnique({ where: { user_id: usuario.userId as any } })) as any | null;
        if (!res) return jsonResponse(null);
        return jsonResponse({ dados: (res as any).dados, atualizado_em: (res as any).atualizado_em });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao obter perfil' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(req);
        if (!usuario) return respostaNaoAutorizado();

        const dados = await req.json();
        await withReconnect((r: any) => r.perfil_empresa.upsert({
            where: { user_id: usuario.userId as any },
            create: { user_id: usuario.userId as any, dados },
            update: { dados, atualizado_em: new Date() },
        }));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
    }
}
