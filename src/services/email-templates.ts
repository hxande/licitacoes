import { DadosEmailUsuario, LicitacaoComMatch, LembreteDeadline } from '@/services/notificacao-email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function formatarValor(valor?: number): string {
    if (!valor) return 'Não informado';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function truncar(texto: string, max: number): string {
    if (texto.length <= max) return texto;
    return texto.substring(0, max - 3) + '...';
}

function corMatch(percentual: number): string {
    if (percentual >= 80) return '#16a34a'; // green
    if (percentual >= 60) return '#2563eb'; // blue
    return '#6b7280'; // gray
}

function corUrgencia(dias: number): { cor: string; bg: string } {
    if (dias <= 1) return { cor: '#dc2626', bg: '#fef2f2' }; // red
    if (dias <= 3) return { cor: '#ea580c', bg: '#fff7ed' }; // orange
    return { cor: '#ca8a04', bg: '#fefce8' }; // yellow
}

function renderLicitacaoCard(item: LicitacaoComMatch): string {
    const { licitacao, match } = item;
    const cor = corMatch(match.percentual);

    return `
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid ${cor};">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="display: inline-block; background-color: ${cor}; color: white; font-weight: 700; font-size: 13px; padding: 2px 10px; border-radius: 12px;">
                ${match.percentual}% match
            </span>
        </div>
        <p style="color: #1f2937; font-size: 14px; font-weight: 600; margin: 0 0 6px 0; line-height: 1.4;">
            ${truncar(licitacao.objeto, 120)}
        </p>
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 4px 0;">
            ${licitacao.orgao} | ${licitacao.uf}
        </p>
        <p style="color: #6b7280; font-size: 13px; margin: 0;">
            Valor: ${formatarValor(licitacao.valorEstimado)} &bull; ${licitacao.dataAbertura ? 'Abertura: ' + licitacao.dataAbertura.split('T')[0] : licitacao.modalidade}
        </p>
    </div>`;
}

function renderLembreteRow(lembrete: LembreteDeadline): string {
    const { cor, bg } = corUrgencia(lembrete.diasRestantes);
    const diasTexto = lembrete.diasRestantes === 0
        ? 'Hoje!'
        : lembrete.diasRestantes === 1
            ? 'Amanhã'
            : `${lembrete.diasRestantes} dias`;

    return `
    <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #1f2937; max-width: 300px;">
            ${truncar(lembrete.objeto, 80)}
            <br><span style="color: #6b7280; font-size: 12px;">${lembrete.orgao} | ${lembrete.uf}</span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <span style="display: inline-block; background-color: ${bg}; color: ${cor}; font-weight: 600; font-size: 12px; padding: 3px 10px; border-radius: 10px;">
                ${diasTexto}
            </span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <span style="display: inline-block; background-color: #f3f4f6; color: #6b7280; font-size: 11px; padding: 2px 8px; border-radius: 8px;">
                ${lembrete.fonte === 'pipeline' ? 'Pipeline' : 'Favorito'}
            </span>
        </td>
    </tr>`;
}

export function gerarSubjectEmail(dados: DadosEmailUsuario): string {
    const temMatches = dados.novasLicitacoes.length > 0;
    const temLembretes = dados.lembretes.length > 0;

    if (temMatches && temLembretes) {
        return `\u{1F4CA} ${dados.novasLicitacoes.length} novas + \u23F0 prazos \u2014 Licitaly`;
    }
    if (temMatches) {
        return `\u{1F4CA} ${dados.novasLicitacoes.length} novas licita\u00E7\u00F5es compat\u00EDveis \u2014 Licitaly`;
    }
    return `\u23F0 Lembretes de prazo \u2014 Licitaly`;
}

export function gerarHtmlEmail(dados: DadosEmailUsuario): string {
    const temMatches = dados.novasLicitacoes.length > 0;
    const temLembretes = dados.lembretes.length > 0;

    let secaoMatches = '';
    if (temMatches) {
        secaoMatches = `
            <h2 style="color: #1f2937; font-size: 18px; margin: 24px 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
                \u{1F4CA} Novas oportunidades compat\u00EDveis
            </h2>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
                Encontramos ${dados.novasLicitacoes.length} licita\u00E7\u00E3o(es) com match \u2265 60% com seu perfil
            </p>
            ${dados.novasLicitacoes.map(renderLicitacaoCard).join('')}
        `;
    }

    let secaoLembretes = '';
    if (temLembretes) {
        secaoLembretes = `
            <h2 style="color: #1f2937; font-size: 18px; margin: 24px 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
                \u23F0 Prazos se encerrando
            </h2>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
                Licita\u00E7\u00F5es do seu pipeline e favoritos com abertura nos pr\u00F3ximos 7 dias
            </p>
            <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden;">
                <thead>
                    <tr style="background-color: #f3f4f6;">
                        <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">Licita\u00E7\u00E3o</th>
                        <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #6b7280; font-weight: 600;">Prazo</th>
                        <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #6b7280; font-weight: 600;">Fonte</th>
                    </tr>
                </thead>
                <tbody>
                    ${dados.lembretes.map(renderLembreteRow).join('')}
                </tbody>
            </table>
        `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; background-color: #2563eb; padding: 16px; border-radius: 12px;">
                    <span style="font-size: 32px;">\u{1F4CA}</span>
                </div>
            </div>

            <h1 style="color: #1f2937; font-size: 24px; text-align: center; margin-bottom: 8px;">
                Resumo Di\u00E1rio \u2014 Licitaly
            </h1>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Ol\u00E1 <strong>${dados.nomeUsuario}</strong>,
            </p>

            <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
                Aqui est\u00E1 o resumo das oportunidades e prazos relevantes para voc\u00EA.
            </p>

            ${secaoMatches}
            ${secaoLembretes}

            <div style="text-align: center; margin-top: 32px;">
                <a href="${APP_URL}"
                   style="display: inline-block; background-color: #2563eb; color: white; font-weight: 600;
                          padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">
                    Ver todas as licita\u00E7\u00F5es
                </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                Voc\u00EA recebeu este email porque est\u00E1 cadastrado no Licitaly.<br>
                <a href="${APP_URL}/perfil" style="color: #6b7280;">Gerenciar notifica\u00E7\u00F5es</a>
            </p>
        </div>

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            \u00A9 ${new Date().getFullYear()} Licitaly. Todos os direitos reservados.
        </p>
    </div>
</body>
</html>`;
}

export function gerarTextoEmail(dados: DadosEmailUsuario): string {
    let texto = `Resumo Di\u00E1rio \u2014 Licitaly\n\nOl\u00E1 ${dados.nomeUsuario},\n\n`;

    if (dados.novasLicitacoes.length > 0) {
        texto += `=== NOVAS OPORTUNIDADES ===\n\n`;
        for (const item of dados.novasLicitacoes) {
            texto += `[${item.match.percentual}% match] ${truncar(item.licitacao.objeto, 100)}\n`;
            texto += `  ${item.licitacao.orgao} | ${item.licitacao.uf} | ${formatarValor(item.licitacao.valorEstimado)}\n\n`;
        }
    }

    if (dados.lembretes.length > 0) {
        texto += `=== PRAZOS SE ENCERRANDO ===\n\n`;
        for (const lembrete of dados.lembretes) {
            const diasTexto = lembrete.diasRestantes === 0 ? 'HOJE' : `em ${lembrete.diasRestantes} dia(s)`;
            texto += `[${diasTexto}] ${truncar(lembrete.objeto, 80)}\n`;
            texto += `  ${lembrete.orgao} | ${lembrete.uf} | Fonte: ${lembrete.fonte}\n\n`;
        }
    }

    texto += `\nAcesse: ${APP_URL}\nGerenciar notifica\u00E7\u00F5es: ${APP_URL}/perfil\n`;
    return texto;
}
