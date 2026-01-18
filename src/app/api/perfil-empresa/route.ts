import { NextResponse } from 'next/server';
import prisma, { withReconnect } from '@/lib/prisma';
import { ensureTables } from '@/lib/migrations';

const USER_ID = 999;

export async function GET() {
    try {
        await ensureTables();
        const res = await withReconnect((r: any) => r.perfilEmpresa.findUnique({ where: { userId: BigInt(USER_ID) as any } })) as any | null;
        if (!res) return NextResponse.json(null);
        return NextResponse.json({ dados: (res as any).dados, atualizadoEm: (res as any).atualizadoEm });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao obter perfil' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const dados = await req.json();
        await withReconnect((r: any) => r.perfilEmpresa.upsert({
            where: { userId: BigInt(USER_ID) as any },
            create: { userId: BigInt(USER_ID) as any, dados },
            update: { dados, atualizadoEm: new Date() },
        }));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
    }
}
