import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { enviarEmail } from '@/lib/email';
import { PerfilEmpresa } from '@/types/empresa';
import { buscarLicitacoesRecentes, montarDadosEmail, DadosEmailUsuario } from '@/services/notificacao-email';
import { gerarSubjectEmail, gerarHtmlEmail, gerarTextoEmail } from '@/services/email-templates';

async function persistirNotificacoesInApp(userId: bigint, dadosEmail: DadosEmailUsuario) {
    const hojeInicio = new Date();
    hojeInicio.setHours(0, 0, 0, 0);

    const criar: Array<{
        user_id: bigint;
        tipo: string;
        titulo: string;
        corpo: string;
        licitacao_id?: string;
    }> = [];

    for (const { licitacao, match } of dadosEmail.novasLicitacoes) {
        const jaExiste = await prisma.notificacao.findFirst({
            where: {
                user_id: userId,
                tipo: 'nova_licitacao',
                licitacao_id: licitacao.id,
                criado_em: { gte: hojeInicio },
            },
            select: { id: true },
        });
        if (!jaExiste) {
            const objeto = licitacao.objeto.length > 60
                ? licitacao.objeto.slice(0, 60) + '…'
                : licitacao.objeto;
            criar.push({
                user_id: userId,
                tipo: 'nova_licitacao',
                titulo: `Match ${match.percentual}%: ${objeto}`,
                corpo: `${licitacao.orgao} (${licitacao.uf})`,
                licitacao_id: licitacao.id,
            });
        }
    }

    for (const lembrete of dadosEmail.lembretes) {
        const jaExiste = await prisma.notificacao.findFirst({
            where: {
                user_id: userId,
                tipo: 'prazo_chegando',
                licitacao_id: lembrete.id,
                criado_em: { gte: hojeInicio },
            },
            select: { id: true },
        });
        if (!jaExiste) {
            const objeto = lembrete.objeto.length > 60
                ? lembrete.objeto.slice(0, 60) + '…'
                : lembrete.objeto;
            const prefixo = lembrete.diasRestantes === 0
                ? 'Prazo HOJE'
                : lembrete.diasRestantes === 1
                    ? 'Prazo amanhã'
                    : `Prazo em ${lembrete.diasRestantes} dias`;
            const dataFormatada = new Date(lembrete.dataAbertura).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
            });
            criar.push({
                user_id: userId,
                tipo: 'prazo_chegando',
                titulo: `${prefixo}: ${objeto}`,
                corpo: `${lembrete.orgao} (${lembrete.uf}) — Abertura: ${dataFormatada}`,
                licitacao_id: lembrete.id,
            });
        }
    }

    if (criar.length > 0) {
        await prisma.notificacao.createMany({ data: criar });
    }
}

export const maxDuration = 300;

export async function GET(req: NextRequest) {
    // 1. Verificar Authorization: Bearer CRON_SECRET
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inicio = Date.now();
    const resumo = {
        totalUsuarios: 0,
        enviados: 0,
        semConteudo: 0,
        erros: 0,
        jaEnviados: 0,
    };

    try {
        // 2. Buscar licitações recentes (1 chamada PNCP)
        console.log('[Cron Notificações] Buscando licitações recentes...');
        const licitacoesRecentes = await buscarLicitacoesRecentes();
        console.log(`[Cron Notificações] ${licitacoesRecentes.length} licitações encontradas`);

        // 3. Query usuários elegíveis
        const usuarios = await prisma.$queryRaw<
            Array<{ id: bigint; nome: string; email: string; dados: unknown }>
        >`
            SELECT u.id, u.nome, u.email, pe.dados
            FROM usuario u
            INNER JOIN perfil_empresa pe ON pe.user_id = u.id
            WHERE u.email_verificado = true
              AND u.notificacoes_email = true
        `;

        resumo.totalUsuarios = usuarios.length;
        console.log(`[Cron Notificações] ${usuarios.length} usuários elegíveis`);

        // 4. Para cada usuário (sequencial, 200ms delay)
        const hojeInicio = new Date();
        hojeInicio.setHours(0, 0, 0, 0);

        for (const usuario of usuarios) {
            try {
                // 4a. Checar se já enviou hoje
                const jaEnviou = await prisma.log_notificacao.findFirst({
                    where: {
                        user_id: usuario.id,
                        tipo: 'resumo_diario',
                        status: 'enviado',
                        criado_em: { gte: hojeInicio },
                    },
                });

                if (jaEnviou) {
                    resumo.jaEnviados++;
                    continue;
                }

                // Parse perfil
                const perfilDados = (typeof usuario.dados === 'string'
                    ? JSON.parse(usuario.dados)
                    : usuario.dados) as PerfilEmpresa;

                // Validate perfil has minimum data
                if (!perfilDados?.areasAtuacao?.length && !perfilDados?.capacidades?.length) {
                    resumo.semConteudo++;
                    await prisma.log_notificacao.create({
                        data: {
                            user_id: usuario.id,
                            tipo: 'resumo_diario',
                            status: 'sem_conteudo',
                            detalhes: { motivo: 'perfil_incompleto' },
                        },
                    });
                    continue;
                }

                // 4b. Montar dados do email
                const dadosEmail = await montarDadosEmail(
                    { id: usuario.id, nome: usuario.nome, email: usuario.email },
                    perfilDados,
                    licitacoesRecentes
                );

                // 4b.5 Persistir notificações in-app
                await persistirNotificacoesInApp(usuario.id, dadosEmail);

                // 4c. Se não tiver conteúdo, skip
                if (dadosEmail.novasLicitacoes.length === 0 && dadosEmail.lembretes.length === 0) {
                    resumo.semConteudo++;
                    await prisma.log_notificacao.create({
                        data: {
                            user_id: usuario.id,
                            tipo: 'resumo_diario',
                            status: 'sem_conteudo',
                            detalhes: {
                                licitacoesAnalisadas: licitacoesRecentes.length,
                                matchesEncontrados: 0,
                                lembretes: 0,
                            },
                        },
                    });
                    continue;
                }

                // 4d. Enviar email
                const subject = gerarSubjectEmail(dadosEmail);
                const html = gerarHtmlEmail(dadosEmail);
                const text = gerarTextoEmail(dadosEmail);

                const enviado = await enviarEmail({
                    to: usuario.email,
                    subject,
                    html,
                    text,
                });

                // 4e. Logar em log_notificacao
                if (enviado) {
                    resumo.enviados++;
                    await prisma.log_notificacao.create({
                        data: {
                            user_id: usuario.id,
                            tipo: 'resumo_diario',
                            status: 'enviado',
                            detalhes: {
                                matches: dadosEmail.novasLicitacoes.length,
                                lembretes: dadosEmail.lembretes.length,
                            },
                        },
                    });
                } else {
                    resumo.erros++;
                    await prisma.log_notificacao.create({
                        data: {
                            user_id: usuario.id,
                            tipo: 'resumo_diario',
                            status: 'erro',
                            detalhes: { motivo: 'falha_envio_email' },
                        },
                    });
                }
            } catch (error) {
                resumo.erros++;
                console.error(`[Cron Notificações] Erro usuário ${usuario.id}:`, error);
                await prisma.log_notificacao.create({
                    data: {
                        user_id: usuario.id,
                        tipo: 'resumo_diario',
                        status: 'erro',
                        detalhes: {
                            motivo: error instanceof Error ? error.message : 'erro_desconhecido',
                        },
                    },
                });
            }

            // 200ms delay between users
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        const duracao = Date.now() - inicio;
        console.log(`[Cron Notificações] Concluído em ${duracao}ms:`, resumo);

        return NextResponse.json({
            ok: true,
            duracaoMs: duracao,
            licitacoesRecentes: licitacoesRecentes.length,
            ...resumo,
        });
    } catch (error) {
        console.error('[Cron Notificações] Erro geral:', error);
        return NextResponse.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido',
                ...resumo,
            },
            { status: 500 }
        );
    }
}
