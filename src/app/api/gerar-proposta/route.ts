import { NextRequest, NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { withReconnect } from '@/lib/prisma';
import { getUsuarioFromRequest } from '@/lib/auth';

// Interface para os dados da licitação
interface LicitacaoData {
    id?: string;
    objeto: string;
    orgao: string;
    uf: string;
    municipio?: string;
    modalidade: string;
    valorEstimado?: number;
    dataAbertura?: string;
    categorias?: string[];
}

interface RequestBody {
    licitacao?: LicitacaoData;
    // Campos legados (manter compatibilidade)
    id?: string;
    objeto?: string;
    orgao?: string;
    uf?: string;
    municipio?: string;
    modalidade?: string;
    valorEstimado?: number;
    dataAbertura?: string;
    categorias?: string[];
    forcarNovaAnalise?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const body: RequestBody = await request.json();

        // Suportar tanto formato antigo quanto novo
        const licitacao: LicitacaoData = body.licitacao || {
            id: body.id,
            objeto: body.objeto || '',
            orgao: body.orgao || '',
            uf: body.uf || '',
            municipio: body.municipio,
            modalidade: body.modalidade || '',
            valorEstimado: body.valorEstimado,
            dataAbertura: body.dataAbertura,
            categorias: body.categorias,
        };

        const forcarNovaAnalise = body.forcarNovaAnalise || false;

        // Obter usuário logado
        const usuario = await getUsuarioFromRequest(request);
        const userId = usuario?.userId || BigInt(0);

        // Verificar cache se tiver ID da licitação e não forçar nova análise
        if (licitacao.id && !forcarNovaAnalise && userId) {
            try {
                const cacheResult = await withReconnect(async (prisma) => {
                    return prisma.cache_analise_ia.findUnique({
                        where: {
                            user_id_licitacao_id_tipo_analise: {
                                user_id: userId,
                                licitacao_id: licitacao.id!,
                                tipo_analise: 'proposta',
                            },
                        },
                    });
                });

                const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
                if (cacheResult && cacheResult.atualizado_em > new Date(Date.now() - CACHE_TTL_MS)) {
                    return NextResponse.json({
                        success: true,
                        proposta: (cacheResult.resultado as any).proposta,
                        fromCache: true,
                        cachedAt: cacheResult.criado_em,
                    });
                }
            } catch (cacheError) {
                console.error('Erro ao buscar cache:', cacheError);
            }
        }

        // Verificar se a API key está configurada
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'API Key do Google não configurada. Configure a variável de ambiente GOOGLE_API_KEY.',
                },
                { status: 500 }
            );
        }

        // Inicializar o modelo Gemini via LangChain
        const model = new ChatGoogleGenerativeAI({
            apiKey: apiKey,
            model: 'gemini-2.5-flash',
            temperature: 0.3,
            maxOutputTokens: 4096,
        });

        // Formatar valor estimado
        const valorFormatado = licitacao.valorEstimado
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(licitacao.valorEstimado)
            : 'Não informado';

        // Prompt do sistema para geração de proposta
        const systemPrompt = `Você é um especialista em elaboração de propostas comerciais para licitações públicas no Brasil.
Sua tarefa é gerar uma proposta comercial profissional e persuasiva para uma empresa de tecnologia da informação.

A proposta deve seguir este formato:

1. **APRESENTAÇÃO DA EMPRESA** (breve, genérica - a empresa preencherá depois)
2. **OBJETO DA PROPOSTA** (baseado no objeto da licitação)
3. **ESCOPO DOS SERVIÇOS/PRODUTOS** (detalhamento do que será entregue)
4. **METODOLOGIA DE EXECUÇÃO** (como será realizado o trabalho)
5. **CRONOGRAMA ESTIMADO** (fases e prazos)
6. **EQUIPE TÉCNICA** (perfis profissionais necessários)
7. **PROPOSTA DE PREÇO** (baseado no valor estimado, se disponível)
8. **DIFERENCIAIS COMPETITIVOS**
9. **CONSIDERAÇÕES FINAIS**

Use linguagem formal e técnica adequada para licitações públicas.
Seja específico e detalhado, mas não invente informações que não foram fornecidas.
Formate o texto em Markdown para melhor visualização.`;

        // Mensagem do usuário com os dados da licitação
        const userPrompt = `Gere uma proposta comercial para a seguinte licitação:

**Órgão:** ${licitacao.orgao}
**Localização:** ${licitacao.municipio ? `${licitacao.municipio} - ` : ''}${licitacao.uf}
**Modalidade:** ${licitacao.modalidade}
**Valor Estimado:** ${valorFormatado}
**Data de Abertura:** ${licitacao.dataAbertura || 'Não informada'}
**Categorias:** ${licitacao.categorias?.join(', ') || 'Não categorizadas'}

**Objeto da Licitação:**
${licitacao.objeto}

Por favor, gere uma proposta comercial completa e profissional para participar desta licitação.`;

        // Invocar o modelo
        const response = await model.invoke(
            [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)],
            { timeout: 45000 },
        );

        // Extrair o conteúdo da resposta
        const propostaTexto = typeof response.content === 'string'
            ? response.content
            : response.content.map(c => 'text' in c ? c.text : '').join('');

        // Salvar no cache se tiver ID da licitação
        if (licitacao.id && userId) {
            try {
                await withReconnect(async (prisma) => {
                    await prisma.cache_analise_ia.upsert({
                        where: {
                            user_id_licitacao_id_tipo_analise: {
                                user_id: userId,
                                licitacao_id: licitacao.id!,
                                tipo_analise: 'proposta',
                            },
                        },
                        update: {
                            resultado: { proposta: propostaTexto } as any,
                            dados_entrada: licitacao as any,
                            atualizado_em: new Date(),
                        },
                        create: {
                            user_id: userId,
                            licitacao_id: licitacao.id!,
                            tipo_analise: 'proposta',
                            resultado: { proposta: propostaTexto } as any,
                            dados_entrada: licitacao as any,
                        },
                    });
                });
            } catch (cacheError) {
                console.error('Erro ao salvar cache:', cacheError);
            }
        }

        return NextResponse.json({
            success: true,
            proposta: propostaTexto,
            fromCache: false,
            modelo: 'gemini-2.5-flash',
            tokens: {
                input: response.usage_metadata?.input_tokens || 0,
                output: response.usage_metadata?.output_tokens || 0,
            },
        });

    } catch (error) {
        console.error('Erro ao gerar proposta:', error);

        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

        return NextResponse.json(
            {
                success: false,
                error: `Erro ao gerar proposta: ${errorMessage}`,
            },
            { status: 500 }
        );
    }
}
