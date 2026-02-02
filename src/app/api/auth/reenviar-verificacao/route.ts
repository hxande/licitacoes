import { NextRequest, NextResponse } from 'next/server';
import { withReconnect } from '@/lib/prisma';
import { gerarTokenAleatorio } from '@/lib/auth';
import { enviarEmailVerificacao } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { error: 'Email é obrigatório' },
                { status: 400 }
            );
        }

        const emailNormalizado = email.toLowerCase().trim();

        // Buscar usuário
        const usuario = await withReconnect(async (prisma) => {
            return prisma.usuario.findUnique({
                where: { email: emailNormalizado }
            });
        });

        // Mesmo se não encontrar, retornar sucesso para não revelar se email existe
        if (!usuario) {
            return NextResponse.json({
                success: true,
                message: 'Se o email estiver cadastrado, você receberá um link de verificação.',
            });
        }

        // Se já verificado
        if (usuario.email_verificado) {
            return NextResponse.json({
                success: true,
                message: 'Este email já foi verificado. Você pode fazer login.',
            });
        }

        // Gerar novo token
        const tokenVerificacao = gerarTokenAleatorio();
        const tokenExpiraEm = new Date();
        tokenExpiraEm.setHours(tokenExpiraEm.getHours() + 24);

        // Atualizar usuário
        await withReconnect(async (prisma) => {
            return prisma.usuario.update({
                where: { id: usuario.id },
                data: {
                    token_verificacao: tokenVerificacao,
                    token_expira_em: tokenExpiraEm,
                    atualizado_em: new Date(),
                }
            });
        });

        // Reenviar email
        await enviarEmailVerificacao(usuario.email, usuario.nome, tokenVerificacao);

        return NextResponse.json({
            success: true,
            message: 'Email de verificação reenviado! Verifique sua caixa de entrada.',
        });

    } catch (error) {
        console.error('Erro ao reenviar verificação:', error);
        return NextResponse.json(
            { error: 'Erro interno ao reenviar email' },
            { status: 500 }
        );
    }
}
