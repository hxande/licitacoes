import { NextRequest, NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { withReconnect } from '@/lib/prisma';
import { getUsuarioFromRequest } from '@/lib/auth';

interface PerfilEmpresa {
    nomeEmpresa: string;
    cnpj?: string;
    areasAtuacao: string[];
    capacidades: string[];
    certificacoes: string[];
    estadosAtuacao: string[];
    porte: string;
    valorMinimo?: number;
    valorMaximo?: number;
    modalidadesPreferidas: number[];
}

interface LicitacaoData {
    id: string;
    objeto: string;
    orgao: string;
    uf: string;
    municipio?: string;
    modalidade: string;
    valorEstimado?: number;
    dataAbertura?: string;
    categorias?: string[];
    areaAtuacao?: string;
}

interface AnaliseMatch {
    compatibilidade: number;
    nivel: 'Excelente' | 'Bom' | 'Moderado' | 'Baixo';
    resumo: string;
    pontosFortes: string[];
    pontosFracos: string[];
    requisitosIdentificados: string[];
    recomendacao: string;
    dicasParticipacao: string[];
}

interface RequestBody {
    licitacao: LicitacaoData;
    perfil: PerfilEmpresa;
    forcarNovaAnalise?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const { licitacao, perfil, forcarNovaAnalise }: RequestBody = await request.json();

        // Validar dados
        if (!licitacao || !perfil) {
            return NextResponse.json(
                { success: false, error: 'Dados da licitação e perfil são obrigatórios' },
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
                                licitacao_id: licitacao.id,
                                tipo_analise: 'match',
                            },
                        },
                    });
                });

                if (cacheResult) {
                    return NextResponse.json({
                        success: true,
                        analise: cacheResult.resultado as AnaliseMatch,
                        fromCache: true,
                        cachedAt: cacheResult.criado_em,
                    });
                }
            } catch (cacheError) {
                console.error('Erro ao buscar cache:', cacheError);
            }
        }

        // Verificar API key
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'API Key do Google não configurada' },
                { status: 500 }
            );
        }

        // Inicializar modelo Gemini
        const model = new ChatGoogleGenerativeAI({
            apiKey: apiKey,
            model: 'gemini-2.5-flash',
            temperature: 0.3, // Baixa temperatura para análise mais consistente
            maxOutputTokens: 2048,
        });

        // Formatar valor estimado
        const valorFormatado = licitacao.valorEstimado
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(licitacao.valorEstimado)
            : 'Não informado';

        const valorMinFormatado = perfil.valorMinimo
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(perfil.valorMinimo)
            : 'Sem mínimo';

        const valorMaxFormatado = perfil.valorMaximo
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(perfil.valorMaximo)
            : 'Sem máximo';

        // Prompt do sistema
        const systemPrompt = `Você é um especialista em análise de licitações públicas no Brasil.
Sua tarefa é analisar a compatibilidade entre o perfil de uma empresa e uma licitação específica.

IMPORTANTE: Responda APENAS com um JSON válido, sem markdown, sem explicações adicionais.

O JSON deve seguir EXATAMENTE esta estrutura:
{
  "compatibilidade": <número de 0 a 100>,
  "nivel": "<Excelente|Bom|Moderado|Baixo>",
  "resumo": "<resumo em 2-3 frases da análise>",
  "pontosFortes": ["<ponto forte 1>", "<ponto forte 2>", ...],
  "pontosFracos": ["<ponto fraco 1>", "<ponto fraco 2>", ...],
  "requisitosIdentificados": ["<requisito técnico 1>", "<requisito técnico 2>", ...],
  "recomendacao": "<recomendação clara: participar, não participar, ou participar com ressalvas>",
  "dicasParticipacao": ["<dica 1>", "<dica 2>", ...]
}

CRITÉRIOS PARA ANÁLISE DE COMPATIBILIDADE:

1. ÁREAS DE ATUAÇÃO (Peso: 20%)
   - Verifique se a área de atuação da licitação está nas áreas que a empresa trabalha
   - Se não houver match exato, considere áreas relacionadas ou complementares
   - Áreas próximas recebem pontuação parcial

2. CAPACIDADES TÉCNICAS (Peso: 40% - MAIS IMPORTANTE)
   - Analise SEMANTICAMENTE o objeto da licitação
   - Compare com as capacidades técnicas da empresa
   - Procure por sinônimos, termos relacionados e tecnologias similares
   - Considere capacidades complementares que possam ser relevantes
   - Identifique requisitos técnicos implícitos no objeto
   - Uma empresa com capacidades parcialmente relacionadas ainda pode ter match moderado

3. ESTADOS DE ATUAÇÃO (Peso: 15%)
   - Verifique se a empresa atua no estado da licitação
   - Se não especificado, considere que atua em todo Brasil
   - Licitações fora dos estados preferenciais recebem pontuação menor mas não são eliminadas

4. PORTE DA EMPRESA (Peso: 10%)
   - MEI/ME/EPP podem ter vantagens em licitações específicas
   - Grandes empresas são necessárias para projetos de grande porte
   - Considere a complexidade e escala do projeto

5. FAIXA DE VALOR (Peso: 10%)
   - Valores muito acima da faixa usual não eliminam, mas requerem parceiros/consórcio
   - Valores muito abaixo podem indicar baixa rentabilidade
   - Considere a margem de tolerância (até 2x)

6. MODALIDADE (Peso: 5%)
   - Modalidades preferidas são um plus, mas não eliminam outras
   - Algumas modalidades são mais simples (Pregão) que outras (Concorrência)

NÍVEIS DE COMPATIBILIDADE:
- Excelente (80-100%): Empresa altamente qualificada, alta probabilidade de sucesso
  * Forte match em capacidades técnicas
  * Área de atuação compatível
  * Dentro dos parâmetros preferenciais (estado, valor, modalidade)
  
- Bom (60-79%): Empresa qualificada com alguns gaps menores
  * Bom match em capacidades, mas pode faltar algo
  * Área relacionada ou parcialmente compatível
  * Alguns parâmetros fora do ideal mas viáveis
  
- Moderado (40-59%): Empresa parcialmente qualificada, precisa de preparação
  * Match parcial em capacidades
  * Área tangencialmente relacionada
  * Vários parâmetros fora do ideal
  * Pode participar com parceiros ou investimento em capacitação
  
- Baixo (0-39%): Empresa não recomendada para esta licitação
  * Pouco ou nenhum match em capacidades
  * Área muito diferente
  * Parâmetros incompatíveis

IMPORTANTE:
- NÃO seja eliminatório demais - considere possibilidades de parceria, consórcio, capacitação
- Analise o contexto completo, não apenas palavras-chave exatas
- Considere sinônimos e termos relacionados
- Seja realista mas não descarte oportunidades válidas`;

        // Prompt do usuário
        const userPrompt = `Analise a compatibilidade entre esta empresa e licitação:

## PERFIL DA EMPRESA
- **Nome:** ${perfil.nomeEmpresa}
- **CNPJ:** ${perfil.cnpj || 'Não informado'}
- **Porte:** ${perfil.porte}
- **Áreas de Atuação:** ${perfil.areasAtuacao.join(', ') || 'Não especificadas'}
- **Capacidades Técnicas:** ${perfil.capacidades.join(', ') || 'Não especificadas'}
- **Certificações:** ${perfil.certificacoes.join(', ') || 'Nenhuma'}
- **Estados que atua:** ${perfil.estadosAtuacao.length > 0 ? perfil.estadosAtuacao.join(', ') : 'Todo Brasil'}
- **Faixa de valor:** ${valorMinFormatado} a ${valorMaxFormatado}
- **Modalidades preferidas:** ${perfil.modalidadesPreferidas.length > 0 ? 'Especificadas' : 'Todas'}

## LICITAÇÃO
- **Órgão:** ${licitacao.orgao}
- **Localização:** ${licitacao.municipio ? `${licitacao.municipio} - ` : ''}${licitacao.uf}
- **Modalidade:** ${licitacao.modalidade}
- **Valor Estimado:** ${valorFormatado}
- **Área:** ${licitacao.areaAtuacao || 'Não categorizada'}
- **Categorias:** ${licitacao.categorias?.join(', ') || 'Não categorizadas'}

**OBJETO DA LICITAÇÃO:**
${licitacao.objeto}

Analise cuidadosamente todos os fatores acima e retorne APENAS o JSON com a análise.`;

        // Invocar modelo
        const response = await model.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPrompt),
        ]);

        // Extrair conteúdo
        const conteudo = typeof response.content === 'string'
            ? response.content
            : response.content.map(c => 'text' in c ? c.text : '').join('');

        // Limpar e parsear JSON
        let analise: AnaliseMatch;
        try {
            // Remover possíveis marcadores de markdown
            const jsonLimpo = conteudo
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            analise = JSON.parse(jsonLimpo);
        } catch (parseError) {
            console.error('Erro ao parsear resposta:', conteudo);
            return NextResponse.json(
                { success: false, error: 'Erro ao processar resposta da IA' },
                { status: 500 }
            );
        }

        // Salvar no cache
        if (userId) {
            try {
                await withReconnect(async (prisma) => {
                    await prisma.cache_analise_ia.upsert({
                        where: {
                            user_id_licitacao_id_tipo_analise: {
                                user_id: userId,
                                licitacao_id: licitacao.id,
                                tipo_analise: 'match',
                            },
                        },
                        update: {
                            resultado: analise as any,
                            dados_entrada: { licitacao, perfil } as any,
                            atualizado_em: new Date(),
                        },
                        create: {
                            user_id: userId,
                            licitacao_id: licitacao.id,
                            tipo_analise: 'match',
                            resultado: analise as any,
                            dados_entrada: { licitacao, perfil } as any,
                        },
                    });
                });
            } catch (cacheError) {
                console.error('Erro ao salvar cache:', cacheError);
            }
        }

        return NextResponse.json({
            success: true,
            analise,
            fromCache: false,
            modelo: 'gemini-2.5-flash',
            tokens: {
                input: response.usage_metadata?.input_tokens || 0,
                output: response.usage_metadata?.output_tokens || 0,
            },
        });

    } catch (error) {
        console.error('Erro na análise de match:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Erro interno' },
            { status: 500 }
        );
    }
}
