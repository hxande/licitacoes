import { NextRequest, NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AnaliseRisco, ItemRisco, NivelRisco, TipoRisco } from '@/types/analise-risco';
import { withReconnect } from '@/lib/prisma';
import { getUsuarioFromRequest } from '@/lib/auth';

interface DadosLicitacao {
    id: string;
    orgao?: string;
    objeto?: string;
    modalidade?: string;
    valorEstimado?: number;
    dataAbertura?: string;
    dataPublicacao?: string;
}

interface RequestBody {
    cnpj?: string;
    ano?: string;
    sequencial?: string;
    dadosLicitacao: DadosLicitacao;
    forcarNovaAnalise?: boolean; // Flag para forçar re-análise
}

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Buscar informações detalhadas da contratação no PNCP
async function buscarDetalhesContratacao(
    cnpj: string,
    ano: string,
    sequencial: string
): Promise<string> {
    try {
        let textoContexto = '';

        // Buscar detalhes da contratação
        const urlContratacao = `https://pncp.gov.br/api/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`;
        const responseContratacao = await fetch(urlContratacao, { signal: AbortSignal.timeout(10000) });

        if (responseContratacao.ok) {
            const dados = await responseContratacao.json();
            textoContexto += `
INFORMAÇÕES DA CONTRATAÇÃO:
- Órgão: ${dados.orgaoEntidade?.razaoSocial || 'N/A'}
- Objeto: ${dados.objetoCompra || 'N/A'}
- Modalidade: ${dados.modalidadeNome || 'N/A'}
- Situação: ${dados.situacaoCompraNome || 'N/A'}
- Informações Complementares: ${dados.informacaoComplementar || 'N/A'}
- Valor Estimado: R$ ${dados.valorTotalEstimado?.toLocaleString('pt-BR') || 'N/A'}
- Data Abertura Proposta: ${dados.dataAberturaProposta || 'N/A'}
- Data Encerramento Proposta: ${dados.dataEncerramentoProposta || 'N/A'}
- SRP (Sistema de Registro de Preços): ${dados.srp ? 'Sim' : 'Não'}
- Justificativa Presencial: ${dados.justificativaPresencial || 'N/A'}
`;
        }

        // Buscar itens da contratação
        const urlItens = `https://pncp.gov.br/api/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens`;
        const responseItens = await fetch(urlItens, { signal: AbortSignal.timeout(10000) });

        if (responseItens.ok) {
            const itens = await responseItens.json();
            if (itens.length > 0) {
                textoContexto += '\nITENS DA CONTRATAÇÃO:\n';
                itens.slice(0, 30).forEach((item: any, index: number) => {
                    textoContexto += `${index + 1}. ${item.descricao || 'Item sem descrição'}
   - Quantidade: ${item.quantidade || 'N/A'} ${item.unidadeMedida || ''}
   - Valor Unitário Estimado: R$ ${item.valorUnitarioEstimado?.toLocaleString('pt-BR') || 'N/A'}
   - Critério Julgamento: ${item.criterioJulgamentoNome || 'N/A'}
`;
                });
            }
        }

        return textoContexto;
    } catch (error) {
        console.error('Erro ao buscar detalhes:', error);
        return '';
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: RequestBody = await request.json();
        const { cnpj, ano, sequencial, dadosLicitacao, forcarNovaAnalise } = body;

        if (!dadosLicitacao?.id) {
            return NextResponse.json(
                { success: false, error: 'ID da licitação é obrigatório' },
                { status: 400 }
            );
        }

        // Obter usuário logado
        const usuario = await getUsuarioFromRequest(request);
        const userId = usuario?.userId || BigInt(0);

        // Verificar cache se não forçar nova análise
        if (!forcarNovaAnalise && userId) {
            try {
                const cacheResult = await withReconnect(async (prisma) => {
                    return prisma.cache_analise_ia.findUnique({
                        where: {
                            user_id_licitacao_id_tipo_analise: {
                                user_id: userId,
                                licitacao_id: dadosLicitacao.id,
                                tipo_analise: 'risco',
                            },
                        },
                    });
                });

                const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
                if (cacheResult && cacheResult.atualizado_em > new Date(Date.now() - CACHE_TTL_MS)) {
                    return NextResponse.json({
                        success: true,
                        analise: cacheResult.resultado as unknown as AnaliseRisco,
                        fromCache: true,
                        cachedAt: cacheResult.criado_em,
                    });
                }
            } catch (cacheError) {
                console.error('Erro ao buscar cache:', cacheError);
                // Continua para fazer análise se cache falhar
            }
        }

        let textoParaAnalise = '';

        // Se tiver dados do PNCP, buscar informações automaticamente
        if (cnpj && ano && sequencial) {
            const detalhes = await buscarDetalhesContratacao(cnpj, ano, sequencial);
            if (detalhes) {
                textoParaAnalise = detalhes;
            }
        }

        // Adicionar dados básicos da licitação
        if (dadosLicitacao.objeto) {
            textoParaAnalise += `\nOBJETO: ${dadosLicitacao.objeto}`;
        }
        if (dadosLicitacao.orgao) {
            textoParaAnalise += `\nÓRGÃO: ${dadosLicitacao.orgao}`;
        }
        if (dadosLicitacao.modalidade) {
            textoParaAnalise += `\nMODALIDADE: ${dadosLicitacao.modalidade}`;
        }
        if (dadosLicitacao.valorEstimado) {
            textoParaAnalise += `\nVALOR ESTIMADO: R$ ${dadosLicitacao.valorEstimado.toLocaleString('pt-BR')}`;
        }

        if (textoParaAnalise.trim().length < 30) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Não foi possível obter informações suficientes da licitação.',
                },
                { status: 400 }
            );
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'API Key do Google não configurada.',
                },
                { status: 500 }
            );
        }

        const model = new ChatGoogleGenerativeAI({
            apiKey: apiKey,
            model: 'gemini-2.5-flash',
            temperature: 0.3,
            maxOutputTokens: 4096,
        });

        const systemPrompt = `Você é um especialista em análise de riscos em licitações públicas brasileiras. 
Sua tarefa é analisar as informações de uma licitação e identificar riscos potenciais para uma empresa que deseja participar.

Analise os seguintes aspectos:
1. Cláusulas restritivas que limitam a competição
2. Requisitos técnicos difíceis de cumprir
3. Prazos apertados ou irreais
4. Exigências de garantias excessivas
5. Penalidades desproporcionais
6. Riscos financeiros (pagamento, reajuste)
7. Riscos jurídicos
8. Pontos positivos da licitação

Você DEVE retornar um JSON válido com a seguinte estrutura:

{
  "scoreGeral": <número de 0 a 100 - quanto maior, mais arriscado>,
  "nivelRisco": "<baixo|medio|alto>",
  "resumo": "<resumo de 2-3 frases sobre o risco geral>",
  "itensRisco": [
    {
      "tipo": "<clausula_restritiva|requisito_tecnico|prazo|garantia|penalidade|financeiro|juridico|outros>",
      "titulo": "<título curto do risco>",
      "descricao": "<descrição detalhada>",
      "severidade": "<baixo|medio|alto>",
      "recomendacao": "<o que fazer para mitigar>"
    }
  ],
  "pontosPositivos": ["<ponto positivo 1>", "<ponto positivo 2>"],
  "recomendacaoGeral": "<recomendação final sobre participar ou não>"
}

REGRAS:
- Score 0-30: Baixo risco (licitação favorável)
- Score 31-60: Médio risco (atenção necessária)
- Score 61-100: Alto risco (cuidado redobrado)
- Seja objetivo e baseado em fatos
- Identifique pelo menos 3-5 itens de risco
- Identifique pelo menos 2 pontos positivos
- Retorne APENAS o JSON, sem texto adicional`;

        const userPrompt = `Analise os riscos da seguinte licitação:

${textoParaAnalise}

Retorne o JSON com a análise de riscos completa.`;

        const response = await model.invoke(
            [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)],
            { timeout: 45000 },
        );

        const responseText =
            typeof response.content === 'string'
                ? response.content
                : JSON.stringify(response.content);

        // Extrair JSON da resposta
        let analiseData: any = null;

        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analiseData = JSON.parse(jsonMatch[0]);
            }
        } catch (parseError) {
            console.error('Erro ao parsear resposta da IA:', parseError);
            return NextResponse.json({
                success: false,
                error: 'Não foi possível processar a análise de risco.',
            });
        }

        if (!analiseData) {
            return NextResponse.json({
                success: false,
                error: 'Resposta inválida da IA.',
            });
        }

        // Montar objeto de análise
        const analise: AnaliseRisco = {
            id: generateId(),
            licitacaoId: dadosLicitacao.id,
            scoreGeral: analiseData.scoreGeral || 50,
            nivelRisco: validarNivelRisco(analiseData.nivelRisco),
            resumo: analiseData.resumo || 'Análise não disponível',
            itensRisco: (analiseData.itensRisco || []).map((item: any, index: number) => ({
                id: generateId(),
                tipo: validarTipoRisco(item.tipo),
                titulo: item.titulo || `Risco ${index + 1}`,
                descricao: item.descricao || '',
                severidade: validarNivelRisco(item.severidade),
                recomendacao: item.recomendacao,
            })),
            pontosPositivos: analiseData.pontosPositivos || [],
            recomendacaoGeral: analiseData.recomendacaoGeral || '',
            analisadoEm: new Date().toISOString(),
        };

        // Salvar no cache
        if (userId) {
            try {
                await withReconnect(async (prisma) => {
                    await prisma.cache_analise_ia.upsert({
                        where: {
                            user_id_licitacao_id_tipo_analise: {
                                user_id: userId,
                                licitacao_id: dadosLicitacao.id,
                                tipo_analise: 'risco',
                            },
                        },
                        update: {
                            resultado: analise as any,
                            dados_entrada: { cnpj, ano, sequencial, dadosLicitacao } as any,
                            atualizado_em: new Date(),
                        },
                        create: {
                            user_id: userId,
                            licitacao_id: dadosLicitacao.id,
                            tipo_analise: 'risco',
                            resultado: analise as any,
                            dados_entrada: { cnpj, ano, sequencial, dadosLicitacao } as any,
                        },
                    });
                });
            } catch (cacheError) {
                console.error('Erro ao salvar cache:', cacheError);
                // Não falha a requisição se cache falhar
            }
        }

        return NextResponse.json({
            success: true,
            analise,
            fromCache: false,
        });
    } catch (error) {
        console.error('Erro ao analisar risco:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Erro interno',
            },
            { status: 500 }
        );
    }
}

function validarNivelRisco(nivel: string): NivelRisco {
    if (['baixo', 'medio', 'alto'].includes(nivel)) {
        return nivel as NivelRisco;
    }
    return 'medio';
}

function validarTipoRisco(tipo: string): TipoRisco {
    const tiposValidos: TipoRisco[] = [
        'clausula_restritiva',
        'requisito_tecnico',
        'prazo',
        'garantia',
        'penalidade',
        'financeiro',
        'juridico',
        'outros',
    ];
    return tiposValidos.includes(tipo as TipoRisco) ? (tipo as TipoRisco) : 'outros';
}
