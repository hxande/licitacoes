import { NextRequest, NextResponse } from 'next/server';
import { withReconnect } from '@/lib/prisma';
import { verificarToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
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
            const response = NextResponse.json({ success: true });
            response.cookies.delete('auth-token');
            return response;
        }

        const payload = verificarToken(token);
        if (payload) {
            // Remover sessão do banco
            await withReconnect(async (prisma) => {
                return prisma.sessao.deleteMany({
                    where: { id: payload.sessionId }
                });
            });
        }

        // Remover cookie
        const response = NextResponse.json({ success: true });
        response.cookies.delete('auth-token');

        return response;

    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        // Mesmo com erro, limpar cookie
        const response = NextResponse.json({ success: true });
        response.cookies.delete('auth-token');
        return response;
    }
}
