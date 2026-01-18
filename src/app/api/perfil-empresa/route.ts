import { NextResponse } from 'next/server';
import prisma, { withReconnect } from '@/lib/prisma';
import { ensureTables } from '@/lib/migrations';
import { jsonResponse } from '@/lib/response';

const USER_ID = 999;

export async function GET() {
    try {
        await ensureTables();
        const res = await withReconnect((r: any) => r.perfil_empresa.findUnique({ where: { user_id: BigInt(USER_ID) as any } })) as any | null;
        if (!res) return jsonResponse(null);
        return jsonResponse({ dados: (res as any).dados, atualizado_em: (res as any).atualizado_em });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao obter perfil' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const dados = await req.json();
        await withReconnect((r: any) => r.perfil_empresa.upsert({
            where: { user_id: BigInt(USER_ID) as any },
            create: { user_id: BigInt(USER_ID) as any, dados },
            update: { dados, atualizado_em: new Date() },
        }));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
    }
}
