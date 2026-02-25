import { NextRequest, NextResponse } from 'next/server';
import { withReconnect } from '@/lib/prisma';
import { getUsuarioFromRequest, respostaNaoAutorizado } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const usuario = await getUsuarioFromRequest(req);
    if (!usuario) return respostaNaoAutorizado();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const apenasNaoLidas = searchParams.get('apenas_nao_lidas') === 'true';

    try {
        const where: { user_id: bigint; lida?: boolean } = { user_id: usuario.userId };
        if (apenasNaoLidas) where.lida = false;

        const [notificacoes, totalNaoLidas] = await withReconnect((p: any) =>
            Promise.all([
                p.notificacao.findMany({
                    where,
                    orderBy: { criado_em: 'desc' },
                    take: limit,
                }),
                p.notificacao.count({
                    where: { user_id: usuario.userId, lida: false },
                }),
            ])
        );

        return NextResponse.json({
            notificacoes: notificacoes.map((n: any) => ({
                id: n.id.toString(),
                tipo: n.tipo,
                titulo: n.titulo,
                corpo: n.corpo,
                licitacaoId: n.licitacao_id ?? null,
                lida: n.lida,
                lido_em: n.lido_em?.toISOString() ?? null,
                criadoEm: n.criado_em.toISOString(),
            })),
            totalNaoLidas,
        });
    } catch (err) {
        console.error('[GET /api/notificacoes]', err);
        return NextResponse.json({ error: 'Erro ao buscar notificações' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const usuario = await getUsuarioFromRequest(req);
    if (!usuario) return respostaNaoAutorizado();

    try {
        const body = await req.json().catch(() => ({}));
        const ids: string[] | undefined = body.ids;

        const agora = new Date();

        if (ids && ids.length > 0) {
            const bigIds = ids.map((id) => BigInt(id));
            await withReconnect((p: any) =>
                p.notificacao.updateMany({
                    where: { id: { in: bigIds }, user_id: usuario.userId },
                    data: { lida: true, lido_em: agora },
                })
            );
        } else {
            await withReconnect((p: any) =>
                p.notificacao.updateMany({
                    where: { user_id: usuario.userId, lida: false },
                    data: { lida: true, lido_em: agora },
                })
            );
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[PATCH /api/notificacoes]', err);
        return NextResponse.json({ error: 'Erro ao marcar notificações' }, { status: 500 });
    }
}
