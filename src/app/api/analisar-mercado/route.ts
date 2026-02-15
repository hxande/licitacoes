import { NextRequest, NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { gerarAnaliseMercado, obterEstatisticasHistorico } from '@/services/historico';
import { AnaliseMercado } from '@/types/historico';
import { withReconnect } from '@/lib/prisma';
import { getUsuarioFromRequest } from '@/lib/auth';

interface RequestData {
    licitacaoId?: string;
    objeto: string;
    uf?: string;
    cnpjOrgao?: string;
    valorEstimado?: number;
    forcarNovaAnalise?: boolean;
}

// Enriquecer análise com IA
async function enriquecerAnaliseComIA(
    analise: AnaliseMercado,
    objeto: string,
    valorEstimado?: number
): Promise<AnaliseMercado> {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey || analise.totalContratosAnalisados < 5) {
        // Sem IA se não tiver chave ou poucos dados
        return analise;
    }

    try {
        const llm = new ChatGoogleGenerativeAI({
            model: 'gemini-2.0-flash',
            apiKey,
            temperature: 0.3,
        });

        const prompt = `Analise os seguintes dados de mercado de licitações públicas e forneça insights estratégicos adicionais.

OBJETO DA LICITAÇÃO ATUAL:
${objeto}

${valorEstimado ? `VALOR ESTIMADO: R$ ${valorEstimado.toLocaleString('pt-BR')}` : ''}

DADOS DO HISTÓRICO (${analise.totalContratosAnalisados} contratos similares):

PRINCIPAIS CONCORRENTES:
${analise.principaisFornecedores.slice(0, 5).map((f, i) =>
            `${i + 1}. ${f.nome} - ${f.totalContratos} contratos - R$ ${f.valorTotal.toLocaleString('pt-BR')} total - Atua em: ${f.ufsAtuacao.join(', ')}`
        ).join('\n')}

FAIXA DE PREÇOS:
- Mínimo: R$ ${analise.faixaPrecos.minimo.toLocaleString('pt-BR')}
- Máximo: R$ ${analise.faixaPrecos.maximo.toLocaleString('pt-BR')}
- Média: R$ ${analise.faixaPrecos.media.toLocaleString('pt-BR')}
- Mediana: R$ ${analise.faixaPrecos.mediana.toLocaleString('pt-BR')}

CONCENTRAÇÃO DE MERCADO: ${analise.concentracaoMercado.toFixed(1)}% (top 5 fornecedores)

Baseado nesses dados reais do histórico, forneça:
1. 3-4 insights estratégicos sobre o mercado (baseados nos dados, não genéricos)
2. 3-4 recomendações práticas e específicas para participar desta licitação

Responda em JSON:
{
    "insights": ["insight1", "insight2", "insight3"],
    "recomendacoes": ["rec1", "rec2", "rec3"]
}`;

        const response = await llm.invoke(
            [
                new SystemMessage('Você é um consultor especializado em licitações públicas. Forneça análises baseadas nos dados apresentados, evitando generalidades.'),
                new HumanMessage(prompt),
            ],
            { timeout: 45000 },
        );

        const content = typeof response.content === 'string' ? response.content : '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const resultado = JSON.parse(jsonMatch[0]);
            return {
                ...analise,
                insights: resultado.insights || analise.insights,
                recomendacoes: resultado.recomendacoes || analise.recomendacoes,
            };
        }
    } catch (error) {
        console.error('[Análise Mercado] Erro na IA:', error);
    }

    return analise;
}

export async function POST(request: NextRequest) {
    try {
        const data: RequestData = await request.json();

        if (!data.objeto) {
            return NextResponse.json(
                { success: false, error: 'Objeto da licitação é obrigatório' },
                { status: 400 }
            );
        }

        // Obter usuário logado
        const usuario = await getUsuarioFromRequest(request);
        const userId = usuario?.userId || BigInt(0);

        // Verificar cache se tiver ID da licitação e não forçar nova análise
        if (data.licitacaoId && !data.forcarNovaAnalise && userId) {
            try {
                const cacheResult = await withReconnect(async (prisma) => {
                    return prisma.cache_analise_ia.findUnique({
                        where: {
                            user_id_licitacao_id_tipo_analise: {
                                user_id: userId,
                                licitacao_id: data.licitacaoId!,
                                tipo_analise: 'mercado',
                            },
                        },
                    });
                });

                const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
                if (cacheResult && cacheResult.atualizado_em > new Date(Date.now() - CACHE_TTL_MS)) {
                    const stats = await obterEstatisticasHistorico();
                    return NextResponse.json({
                        success: true,
                        analise: cacheResult.resultado as unknown as AnaliseMercado,
                        stats,
                        fromCache: true,
                        cachedAt: cacheResult.criado_em,
                    });
                }
            } catch (cacheError) {
                console.error('Erro ao buscar cache:', cacheError);
            }
        }

        // Verificar se há dados históricos
        const stats = await obterEstatisticasHistorico();

        if (!stats || stats.totalContratos === 0) {
            return NextResponse.json({
                success: false,
                error: 'Nenhum dado histórico disponível. Execute a carga de dados primeiro.',
                needsLoad: true,
            });
        }

        // Gerar análise baseada nos dados históricos
        const analise = await gerarAnaliseMercado(
            data.objeto,
            data.uf,
            data.cnpjOrgao,
            data.valorEstimado
        );

        if (!analise) {
            return NextResponse.json({
                success: true,
                analise: null,
                message: 'Nenhum contrato similar encontrado no histórico.',
                stats,
            });
        }

        // Enriquecer com IA se houver dados suficientes
        const analiseEnriquecida = await enriquecerAnaliseComIA(
            analise,
            data.objeto,
            data.valorEstimado
        );

        // Salvar no cache se tiver ID da licitação
        if (data.licitacaoId && userId) {
            try {
                await withReconnect(async (prisma) => {
                    await prisma.cache_analise_ia.upsert({
                        where: {
                            user_id_licitacao_id_tipo_analise: {
                                user_id: userId,
                                licitacao_id: data.licitacaoId!,
                                tipo_analise: 'mercado',
                            },
                        },
                        update: {
                            resultado: analiseEnriquecida as any,
                            dados_entrada: data as any,
                            atualizado_em: new Date(),
                        },
                        create: {
                            user_id: userId,
                            licitacao_id: data.licitacaoId!,
                            tipo_analise: 'mercado',
                            resultado: analiseEnriquecida as any,
                            dados_entrada: data as any,
                        },
                    });
                });
            } catch (cacheError) {
                console.error('Erro ao salvar cache:', cacheError);
            }
        }

        return NextResponse.json({
            success: true,
            analise: analiseEnriquecida,
            stats,
            fromCache: false,
        });

    } catch (error) {
        console.error('[Análise Mercado] Erro:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao analisar mercado' },
            { status: 500 }
        );
    }
}

// GET - Status do histórico
export async function GET() {
    try {
        const stats = await obterEstatisticasHistorico();

        return NextResponse.json({
            success: true,
            disponivel: stats !== null && stats.totalContratos > 0,
            stats,
        });
    } catch (error) {
        console.error('[Análise Mercado] Erro:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao verificar status' },
            { status: 500 }
        );
    }
}
