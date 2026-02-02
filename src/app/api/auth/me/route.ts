import { NextRequest, NextResponse } from 'next/server';
import { withReconnect } from '@/lib/prisma';
import { verificarToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        // Pegar token do cookie ou header
        const authHeader = req.headers.get('authorization');
        let token: string | null = null;

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }

        if (!token) {
            token = req.cookies.get('auth-token')?.value || null;
        }

        if (!token) {
            return NextResponse.json(
                { autenticado: false },
                { status: 200 }
            );
        }

        const payload = verificarToken(token);
        if (!payload) {
            const response = NextResponse.json(
                { autenticado: false },
                { status: 200 }
            );
            response.cookies.delete('auth-token');
            return response;
        }

        // Verificar se sessão existe no banco
        const sessao = await withReconnect(async (prisma) => {
            return prisma.sessao.findUnique({
                where: { id: payload.sessionId }
            });
        });

        if (!sessao || new Date(sessao.expira_em) < new Date()) {
            const response = NextResponse.json(
                { autenticado: false },
                { status: 200 }
            );
            response.cookies.delete('auth-token');
            return response;
        }

        // Buscar dados do usuário
        const usuario = await withReconnect(async (prisma) => {
            return prisma.usuario.findUnique({
                where: { id: BigInt(payload.userId) }
            });
        });

        if (!usuario) {
            const response = NextResponse.json(
                { autenticado: false },
                { status: 200 }
            );
            response.cookies.delete('auth-token');
            return response;
        }

        return NextResponse.json({
            autenticado: true,
            usuario: {
                id: usuario.id.toString(),
                nome: usuario.nome,
                email: usuario.email,
                telefone: usuario.telefone,
                criadoEm: usuario.criado_em.toISOString(),
            },
        });

    } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        return NextResponse.json(
            { autenticado: false },
            { status: 200 }
        );
    }
}
