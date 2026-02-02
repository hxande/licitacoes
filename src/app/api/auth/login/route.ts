import { NextRequest, NextResponse } from 'next/server';
import { withReconnect } from '@/lib/prisma';
import { verificarSenha, gerarToken, gerarSessionId } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, senha } = body;

        // Validações
        if (!email || !senha) {
            return NextResponse.json(
                { error: 'Email e senha são obrigatórios' },
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

        if (!usuario) {
            return NextResponse.json(
                { error: 'Email ou senha incorretos' },
                { status: 401 }
            );
        }

        // Verificar senha
        if (!verificarSenha(senha, usuario.senha_hash)) {
            return NextResponse.json(
                { error: 'Email ou senha incorretos' },
                { status: 401 }
            );
        }

        // Verificar se email foi verificado
        if (!usuario.email_verificado) {
            return NextResponse.json(
                { error: 'Por favor, verifique seu email antes de fazer login' },
                { status: 403 }
            );
        }

        // Criar sessão
        const sessionId = gerarSessionId();
        const expiraEm = new Date();
        expiraEm.setDate(expiraEm.getDate() + 7); // 7 dias

        const token = gerarToken({
            userId: usuario.id.toString(),
            email: usuario.email,
            sessionId,
            exp: expiraEm.getTime(),
        });

        // Salvar sessão no banco
        await withReconnect(async (prisma) => {
            return prisma.sessao.create({
                data: {
                    id: sessionId,
                    user_id: usuario.id,
                    token,
                    expira_em: expiraEm,
                }
            });
        });

        // Criar response com cookie
        const response = NextResponse.json({
            success: true,
            usuario: {
                id: usuario.id.toString(),
                nome: usuario.nome,
                email: usuario.email,
                telefone: usuario.telefone,
                criadoEm: usuario.criado_em.toISOString(),
            },
            token,
            expiraEm: expiraEm.toISOString(),
        });

        // Setar cookie httpOnly
        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: expiraEm,
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return NextResponse.json(
            { error: 'Erro interno ao fazer login' },
            { status: 500 }
        );
    }
}
