import { NextRequest, NextResponse } from 'next/server';
import { withReconnect } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json(
                { error: 'Token é obrigatório' },
                { status: 400 }
            );
        }

        // Buscar usuário com este token
        const usuario = await withReconnect(async (prisma) => {
            return prisma.usuario.findFirst({
                where: { token_verificacao: token }
            });
        });

        if (!usuario) {
            return NextResponse.json(
                { error: 'Token inválido ou expirado' },
                { status: 400 }
            );
        }

        // Verificar se token não expirou
        if (usuario.token_expira_em && new Date(usuario.token_expira_em) < new Date()) {
            return NextResponse.json(
                { error: 'Token expirado. Solicite um novo email de verificação.' },
                { status: 400 }
            );
        }

        // Marcar email como verificado
        await withReconnect(async (prisma) => {
            return prisma.usuario.update({
                where: { id: usuario.id },
                data: {
                    email_verificado: true,
                    token_verificacao: null,
                    token_expira_em: null,
                    atualizado_em: new Date(),
                }
            });
        });

        return NextResponse.json({
            success: true,
            message: 'Email verificado com sucesso! Você já pode fazer login.',
        });

    } catch (error) {
        console.error('Erro ao verificar email:', error);
        return NextResponse.json(
            { error: 'Erro interno ao verificar email' },
            { status: 500 }
        );
    }
}
