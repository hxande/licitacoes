import { NextRequest } from 'next/server';
import { withReconnect } from '@/lib/prisma';
import crypto from 'crypto';

// Secret para assinar tokens (usar variável de ambiente em produção)
const JWT_SECRET = process.env.JWT_SECRET || 'licitacoes-brasil-secret-2026';

interface TokenPayload {
    userId: string;
    email: string;
    sessionId: string;
    exp: number;
}

// Gerar token simples (em produção, usar JWT real)
export function gerarToken(payload: TokenPayload): string {
    const data = JSON.stringify(payload);
    const base64 = Buffer.from(data).toString('base64');
    const signature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(base64)
        .digest('hex');
    return `${base64}.${signature}`;
}

// Verificar token
export function verificarToken(token: string): TokenPayload | null {
    try {
        const [base64, signature] = token.split('.');
        if (!base64 || !signature) return null;

        const expectedSignature = crypto
            .createHmac('sha256', JWT_SECRET)
            .update(base64)
            .digest('hex');

        if (signature !== expectedSignature) return null;

        const data = Buffer.from(base64, 'base64').toString('utf-8');
        const payload = JSON.parse(data) as TokenPayload;

        // Verificar expiração
        if (payload.exp < Date.now()) return null;

        return payload;
    } catch {
        return null;
    }
}

// Gerar hash de senha
export function hashSenha(senha: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
        .pbkdf2Sync(senha, salt, 10000, 64, 'sha512')
        .toString('hex');
    return `${salt}:${hash}`;
}

// Verificar senha
export function verificarSenha(senha: string, senhaHash: string): boolean {
    const [salt, hash] = senhaHash.split(':');
    if (!salt || !hash) return false;
    const hashVerificacao = crypto
        .pbkdf2Sync(senha, salt, 10000, 64, 'sha512')
        .toString('hex');
    return hash === hashVerificacao;
}

// Gerar token aleatório para verificação de email/reset de senha
export function gerarTokenAleatorio(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Gerar ID de sessão
export function gerarSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
}

// Extrair user_id do request (do header Authorization ou cookie)
export async function getUsuarioFromRequest(req: NextRequest): Promise<{ userId: bigint; email: string } | null> {
    try {
        // Tentar pegar do header Authorization
        const authHeader = req.headers.get('authorization');
        let token: string | null = null;

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }

        // Se não tiver no header, tentar do cookie
        if (!token) {
            token = req.cookies.get('auth-token')?.value || null;
        }

        if (!token) return null;

        const payload = verificarToken(token);
        if (!payload) return null;

        // Verificar se a sessão ainda existe no banco
        const sessao = await withReconnect(async (prisma) => {
            return prisma.sessao.findUnique({
                where: { id: payload.sessionId }
            });
        });

        if (!sessao || new Date(sessao.expira_em) < new Date()) {
            return null;
        }

        return {
            userId: BigInt(payload.userId),
            email: payload.email
        };
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        return null;
    }
}

// Resposta padrão de não autorizado
export function respostaNaoAutorizado() {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
    });
}
