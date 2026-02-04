import nodemailer from 'nodemailer';

// Configuração do transporter de email
// Em produção, usar serviço real como SendGrid, AWS SES, etc.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@licitacoes.com.br';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export async function enviarEmail(options: EmailOptions): Promise<boolean> {
    try {
        // Em desenvolvimento, apenas log
        if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
            console.log('📧 Email (dev mode):');
            console.log('  To:', options.to);
            console.log('  Subject:', options.subject);
            console.log('  Content:', options.text || options.html.substring(0, 200) + '...');
            return true;
        }

        await transporter.sendMail({
            from: FROM_EMAIL,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });

        return true;
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        return false;
    }
}

export async function enviarEmailVerificacao(email: string, nome: string, token: string): Promise<boolean> {
    const linkVerificacao = `${APP_URL}/verificar-email?token=${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background-color: #2563eb; padding: 16px; border-radius: 12px;">
                    <span style="font-size: 32px;">🏢</span>
                </div>
            </div>
            
            <h1 style="color: #1f2937; font-size: 24px; text-align: center; margin-bottom: 20px;">
                Bem-vindo ao Licitaly!
            </h1>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Olá <strong>${nome}</strong>,
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Obrigado por se cadastrar! Para ativar sua conta e começar a encontrar as melhores 
                oportunidades de licitações, clique no botão abaixo:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${linkVerificacao}" 
                   style="display: inline-block; background-color: #2563eb; color: white; font-weight: 600; 
                          padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
                    Verificar meu email
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
            </p>
            <p style="color: #2563eb; font-size: 14px; word-break: break-all;">
                ${linkVerificacao}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                Este link expira em 24 horas.<br>
                Se você não solicitou esta conta, ignore este email.
            </p>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            © ${new Date().getFullYear()} Licitaly. Todos os direitos reservados.
        </p>
    </div>
</body>
</html>
    `;

    const text = `
Bem-vindo ao Licitaly!

Olá ${nome},

Obrigado por se cadastrar! Para ativar sua conta, acesse o link abaixo:

${linkVerificacao}

Este link expira em 24 horas.

Se você não solicitou esta conta, ignore este email.
    `;

    return enviarEmail({
        to: email,
        subject: '✅ Verifique seu email - Licitaly',
        html,
        text,
    });
}

export async function enviarEmailResetSenha(email: string, nome: string, token: string): Promise<boolean> {
    const linkReset = `${APP_URL}/resetar-senha?token=${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background-color: #2563eb; padding: 16px; border-radius: 12px;">
                    <span style="font-size: 32px;">🔐</span>
                </div>
            </div>
            
            <h1 style="color: #1f2937; font-size: 24px; text-align: center; margin-bottom: 20px;">
                Redefinir sua senha
            </h1>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Olá <strong>${nome}</strong>,
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta. 
                Clique no botão abaixo para criar uma nova senha:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${linkReset}" 
                   style="display: inline-block; background-color: #dc2626; color: white; font-weight: 600; 
                          padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
                    Redefinir senha
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
            </p>
            <p style="color: #dc2626; font-size: 14px; word-break: break-all;">
                ${linkReset}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                Este link expira em 1 hora.<br>
                Se você não solicitou a redefinição de senha, ignore este email.
            </p>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            © ${new Date().getFullYear()} Licitaly. Todos os direitos reservados.
        </p>
    </div>
</body>
</html>
    `;

    const text = `
Redefinir sua senha

Olá ${nome},

Recebemos uma solicitação para redefinir a senha da sua conta.
Acesse o link abaixo para criar uma nova senha:

${linkReset}

Este link expira em 1 hora.

Se você não solicitou a redefinição de senha, ignore este email.
    `;

    return enviarEmail({
        to: email,
        subject: '🔐 Redefinir senha - Licitaly',
        html,
        text,
    });
}
