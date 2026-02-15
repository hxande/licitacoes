import { Licitacao } from '@/types/licitacao';
import { PerfilEmpresa, MatchResult } from '@/types/empresa';
import { calcularMatch } from '@/services/calcular-match';
import { buscarLicitacoesPNCP, buscarLicitacaoPorId, transformPNCPToLicitacao } from '@/services/pncp';
import prisma from '@/lib/prisma';

export interface LicitacaoComMatch {
    licitacao: Licitacao;
    match: MatchResult;
}

export interface LembreteDeadline {
    id: string;
    objeto: string;
    orgao: string;
    uf: string;
    dataAbertura: string;
    diasRestantes: number;
    fonte: 'pipeline' | 'favorito';
}

export interface DadosEmailUsuario {
    nomeUsuario: string;
    emailUsuario: string;
    novasLicitacoes: LicitacaoComMatch[];
    lembretes: LembreteDeadline[];
}

/**
 * Busca licitações publicadas nas últimas 24h no PNCP.
 * Chamada 1x no cron, resultado reutilizado para todos os usuários.
 */
export async function buscarLicitacoesRecentes(): Promise<Licitacao[]> {
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    const formatDate = (d: Date) => d.toISOString().split('T')[0] + 'T00:00:00';

    try {
        const response = await buscarLicitacoesPNCP({
            dataInicial: formatDate(ontem),
            dataFinal: formatDate(hoje),
            pagina: 1,
        });

        return response.data.map(transformPNCPToLicitacao);
    } catch (error) {
        console.error('[Notificação] Erro ao buscar licitações recentes:', error);
        return [];
    }
}

/**
 * Filtra licitações por match com perfil da empresa.
 * Retorna top 10 com match >= minMatch, ordenadas por score desc.
 */
export function filtrarPorMatch(
    licitacoes: Licitacao[],
    perfil: PerfilEmpresa,
    minMatch: number = 60
): LicitacaoComMatch[] {
    const resultados: LicitacaoComMatch[] = [];

    for (const licitacao of licitacoes) {
        const match = calcularMatch(licitacao, perfil);
        if (match.percentual >= minMatch) {
            resultados.push({ licitacao, match });
        }
    }

    resultados.sort((a, b) => b.match.percentual - a.match.percentual);
    return resultados.slice(0, 10);
}

/**
 * Busca itens do pipeline com data de abertura nos próximos 7 dias.
 */
export async function buscarDeadlinesPipeline(userId: bigint): Promise<LembreteDeadline[]> {
    const hoje = new Date();
    const em7dias = new Date(hoje);
    em7dias.setDate(em7dias.getDate() + 7);

    const hojeStr = hoje.toISOString().split('T')[0];
    const em7diasStr = em7dias.toISOString().split('T')[0];

    const itens = await prisma.pipeline.findMany({
        where: {
            user_id: userId,
            status: { notIn: ['ganha', 'perdida'] },
            data_abertura: { not: null },
        },
    });

    const lembretes: LembreteDeadline[] = [];

    for (const item of itens) {
        if (!item.data_abertura) continue;

        const dataAbertura = item.data_abertura.split('T')[0];
        if (dataAbertura >= hojeStr && dataAbertura <= em7diasStr) {
            const dias = Math.ceil(
                (new Date(dataAbertura).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
            );
            lembretes.push({
                id: item.id,
                objeto: item.objeto,
                orgao: item.orgao,
                uf: item.uf,
                dataAbertura: item.data_abertura,
                diasRestantes: Math.max(0, dias),
                fonte: 'pipeline',
            });
        }
    }

    return lembretes;
}

/**
 * Busca favoritos com data de abertura nos próximos 7 dias.
 * Parse licitacao_id (formato {cnpj}-{ano}-{seq}), busca data via PNCP API.
 * Concorrência: 3 paralelas com 200ms delay entre batches.
 */
export async function buscarDeadlinesFavoritos(userId: bigint): Promise<LembreteDeadline[]> {
    const favoritos = await prisma.favorito.findMany({
        where: { user_id: userId },
        orderBy: { criado_em: 'desc' },
        take: 20,
    });

    if (favoritos.length === 0) return [];

    const hoje = new Date();
    const em7dias = new Date(hoje);
    em7dias.setDate(em7dias.getDate() + 7);

    const hojeStr = hoje.toISOString().split('T')[0];
    const em7diasStr = em7dias.toISOString().split('T')[0];

    const lembretes: LembreteDeadline[] = [];
    const BATCH_SIZE = 3;

    for (let i = 0; i < favoritos.length; i += BATCH_SIZE) {
        const batch = favoritos.slice(i, i + BATCH_SIZE);

        const promises = batch.map(async (fav) => {
            const parts = fav.licitacao_id.split('-');
            if (parts.length < 3) return null;

            // CNPJ pode conter hífens, então pegar últimos 2 como ano e seq
            const seq = parts[parts.length - 1];
            const ano = parts[parts.length - 2];
            const cnpj = parts.slice(0, parts.length - 2).join('-');

            const contratacao = await buscarLicitacaoPorId(cnpj, ano, seq);
            if (!contratacao) return null;

            const dataAbertura = contratacao.dataAberturaProposta;
            if (!dataAbertura) return null;

            const dataAberturaStr = dataAbertura.split('T')[0];
            if (dataAberturaStr >= hojeStr && dataAberturaStr <= em7diasStr) {
                const dias = Math.ceil(
                    (new Date(dataAberturaStr).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
                );
                return {
                    id: fav.licitacao_id,
                    objeto: contratacao.objetoCompra,
                    orgao: contratacao.orgaoEntidade.razaoSocial,
                    uf: contratacao.unidadeOrgao.ufSigla,
                    dataAbertura,
                    diasRestantes: Math.max(0, dias),
                    fonte: 'favorito' as const,
                };
            }
            return null;
        });

        const results = await Promise.allSettled(promises);
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                lembretes.push(result.value);
            }
        }

        // 200ms delay between batches
        if (i + BATCH_SIZE < favoritos.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    return lembretes;
}

/**
 * Monta os dados completos do email para um usuário.
 */
export async function montarDadosEmail(
    usuario: { id: bigint; nome: string; email: string },
    perfil: PerfilEmpresa,
    licitacoesRecentes: Licitacao[]
): Promise<DadosEmailUsuario> {
    const novasLicitacoes = filtrarPorMatch(licitacoesRecentes, perfil);

    const [deadlinesPipeline, deadlinesFavoritos] = await Promise.all([
        buscarDeadlinesPipeline(usuario.id),
        buscarDeadlinesFavoritos(usuario.id),
    ]);

    // Deduplicate: se mesmo id aparece em pipeline e favorito, manter pipeline
    const idsNosPipeline = new Set(deadlinesPipeline.map(d => d.id));
    const favoritosFiltrados = deadlinesFavoritos.filter(d => !idsNosPipeline.has(d.id));

    const lembretes = [...deadlinesPipeline, ...favoritosFiltrados]
        .sort((a, b) => a.diasRestantes - b.diasRestantes);

    return {
        nomeUsuario: usuario.nome,
        emailUsuario: usuario.email,
        novasLicitacoes,
        lembretes,
    };
}
