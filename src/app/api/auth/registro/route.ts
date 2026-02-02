import { NextRequest, NextResponse } from 'next/server';
import { withReconnect } from '@/lib/prisma';
import { hashSenha, gerarTokenAleatorio } from '@/lib/auth';
import { enviarEmailVerificacao } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { nome, email, senha } = body;

        // Validações
        if (!nome || !email || !senha) {
            return NextResponse.json(
                { error: 'Nome, email e senha são obrigatórios' },
                { status: 400 }
            );
        }

        if (senha.length < 6) {
            return NextResponse.json(
                { error: 'A senha deve ter pelo menos 6 caracteres' },
                { status: 400 }
            );
        }

        const emailNormalizado = email.toLowerCase().trim();
        const nomeNormalizado = nome.trim();

        // Verificar se email já existe
        const usuarioExistente = await withReconnect(async (prisma) => {
            return prisma.usuario.findUnique({
                where: { email: emailNormalizado }
            });
        });

        if (usuarioExistente) {
            return NextResponse.json(
                { error: 'Este email já está cadastrado' },
                { status: 409 }
            );
        }

        // Gerar hash da senha e token de verificação
        const senhaHash = hashSenha(senha);
        const tokenVerificacao = gerarTokenAleatorio();
        const tokenExpiraEm = new Date();
        tokenExpiraEm.setHours(tokenExpiraEm.getHours() + 24); // 24 horas

        // Criar usuário
        const novoUsuario = await withReconnect(async (prisma) => {
            return prisma.usuario.create({
                data: {
                    nome: nomeNormalizado,
                    email: emailNormalizado,
                    senha_hash: senhaHash,
                    token_verificacao: tokenVerificacao,
                    token_expira_em: tokenExpiraEm,
                    email_verificado: false,
                }
            });
        });

        // Enviar email de verificação
        const emailEnviado = await enviarEmailVerificacao(
            emailNormalizado,
            nomeNormalizado,
            tokenVerificacao
        );

        if (!emailEnviado) {
            console.warn('Falha ao enviar email de verificação para:', emailNormalizado);
        }

        return NextResponse.json({
            success: true,
            message: 'Conta criada com sucesso! Verifique seu email para ativar sua conta.',
            userId: novoUsuario.id.toString(),
        });

    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return NextResponse.json(
            { error: 'Erro interno ao criar conta' },
            { status: 500 }
        );
    }
}
