import { NextRequest, NextResponse } from 'next/server';
import { Checklist, CATEGORIAS_DOCUMENTO, STATUS_DOCUMENTO } from '@/types/checklist';

interface RequestBody {
    email: string;
    checklist: Checklist;
}

export async function POST(request: NextRequest) {
    try {
        const { email, checklist }: RequestBody = await request.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json(
                { success: false, error: 'Email inválido' },
                { status: 400 }
            );
        }

        if (!checklist || !checklist.documentos) {
            return NextResponse.json(
                { success: false, error: 'Checklist inválido' },
                { status: 400 }
            );
        }

        // Gerar HTML do checklist
        const html = gerarHTMLChecklist(checklist);

        // Aqui você pode integrar com um serviço de email
        // Exemplos: SendGrid, Resend, AWS SES, Nodemailer

        // Por enquanto, vamos simular o envio e retornar o HTML
        // para que o usuário possa ver o que seria enviado

        // Exemplo com Resend (descomentar quando configurar):
        /*
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        await resend.emails.send({
            from: 'Licitações <noreply@seudominio.com>',
            to: email,
            subject: `Checklist: ${checklist.titulo}`,
            html: html,
        });
        */

        // Simulação de envio bem-sucedido
        console.log(`[EMAIL] Enviando checklist para: ${email}`);
        console.log(`[EMAIL] Título: ${checklist.titulo}`);
        console.log(`[EMAIL] Documentos: ${checklist.documentos.length}`);

        return NextResponse.json({
            success: true,
            message: `Checklist enviado para ${email}`,
            // Retornar HTML para preview (remover em produção)
            preview: html,
        });

    } catch (error) {
        console.error('Erro ao enviar email:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Erro ao enviar email',
            },
            { status: 500 }
        );
    }
}

function gerarHTMLChecklist(checklist: Checklist): string {
    const documentosPorCategoria = checklist.documentos.reduce((acc, doc) => {
        if (!acc[doc.categoria]) {
            acc[doc.categoria] = [];
        }
        acc[doc.categoria].push(doc);
        return acc;
    }, {} as Record<string, typeof checklist.documentos>);

    const prontos = checklist.documentos.filter(d => d.status === 'pronto').length;
    const total = checklist.documentos.length;
    const percentual = total > 0 ? Math.round((prontos / total) * 100) : 0;

    const categoriasHTML = Object.entries(documentosPorCategoria)
        .map(([categoria, docs]) => {
            const docsHTML = docs
                .sort((a, b) => a.ordem - b.ordem)
                .map(doc => {
                    const statusInfo = STATUS_DOCUMENTO[doc.status];
                    const statusColor = {
                        pronto: '#22c55e',
                        pendente: '#6b7280',
                        vencido: '#ef4444',
                        vencendo: '#eab308',
                    }[doc.status];

                    const checkbox = doc.status === 'pronto' ? '☑' : '☐';
                    const validadeText = doc.dataValidade
                        ? ` (Validade: ${new Date(doc.dataValidade).toLocaleDateString('pt-BR')})`
                        : '';

                    return `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                                <span style="font-size: 16px;">${checkbox}</span>
                            </td>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                                <strong>${doc.nome}</strong>${doc.obrigatorio ? ' *' : ''}
                                ${doc.descricao ? `<br><small style="color: #6b7280;">${doc.descricao}</small>` : ''}
                                ${validadeText ? `<br><small style="color: ${statusColor};">${validadeText}</small>` : ''}
                            </td>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                                <span style="background-color: ${statusColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                                    ${statusInfo.label}
                                </span>
                            </td>
                        </tr>
                    `;
                })
                .join('');

            return `
                <div style="margin-bottom: 24px;">
                    <h3 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 12px;">
                        ${CATEGORIAS_DOCUMENTO[categoria as keyof typeof CATEGORIAS_DOCUMENTO] || categoria}
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tbody>
                            ${docsHTML}
                        </tbody>
                    </table>
                </div>
            `;
        })
        .join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Checklist: ${checklist.titulo}</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #1f2937;">
            <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
                <h1 style="margin: 0 0 8px 0; font-size: 24px;">📋 ${checklist.titulo}</h1>
                ${checklist.orgao ? `<p style="margin: 4px 0; opacity: 0.9;">Órgão: ${checklist.orgao}</p>` : ''}
                ${checklist.objeto ? `<p style="margin: 4px 0; opacity: 0.9;">Objeto: ${checklist.objeto}</p>` : ''}
                ${checklist.dataAbertura ? `<p style="margin: 4px 0; opacity: 0.9;">Data de Abertura: ${new Date(checklist.dataAbertura).toLocaleDateString('pt-BR')}</p>` : ''}
            </div>

            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px; display: flex; justify-content: space-between;">
                <div>
                    <strong>Progresso:</strong> ${prontos} de ${total} documentos prontos
                </div>
                <div>
                    <strong>${percentual}% concluído</strong>
                </div>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 24px;">
                <strong>Legenda:</strong> * Documento obrigatório | ☑ Pronto | ☐ Pendente
            </div>

            ${categoriasHTML}

            <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
                <p>Checklist gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                <p>Este é um email automático. Por favor, não responda.</p>
            </div>
        </body>
        </html>
    `;
}
