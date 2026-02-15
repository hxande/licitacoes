import { NextRequest, NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { buscarLicitacoesPNCP, transformPNCPToLicitacao } from '@/services/pncp';
import { withReconnect } from '@/lib/prisma';
import { PerfilEmpresa } from '@/types/empresa';
import { Licitacao } from '@/types/licitacao';
import {
    AnaliseAgente,
    RecomendacaoLicitacao,
    ConfiguracaoAgente,
    RequestAgente
} from '@/types/agente-recomendacao';
import { getUsuarioFromRequest, respostaNaoAutorizado } from '@/lib/auth';

const VERSAO_AGENTE = '1.0.0';

// Buscar licitações recentes do PNCP
async function buscarLicitacoesRecentes(
    perfil: PerfilEmpresa,
    config: ConfiguracaoAgente
): Promise<Licitacao[]> {
    const hoje = new Date();
    const dataInicial = new Date();
    dataInicial.setDate(hoje.getDate() - 7); // Últimos 7 dias

    const dataFinal = new Date();
    dataFinal.setDate(hoje.getDate() + 60); // Próximos 60 dias para abertura

    const formatDate = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');

    try {
        const resultado = await buscarLicitacoesPNCP({
            dataInicial: formatDate(dataInicial),
            dataFinal: formatDate(dataFinal),
            pagina: 1,
            tamanhoPagina: 50,
        });

        let licitacoes = resultado.data.map(transformPNCPToLicitacao);

        // Filtrar por estados de atuação da empresa (se especificados)
        if (perfil.estadosAtuacao && perfil.estadosAtuacao.length > 0) {
            // Priorizar estados de atuação, mas não excluir outros
            licitacoes = licitacoes.sort((a, b) => {
                const aNoEstado = perfil.estadosAtuacao.includes(a.uf) ? 1 : 0;
                const bNoEstado = perfil.estadosAtuacao.includes(b.uf) ? 1 : 0;
                return bNoEstado - aNoEstado;
            });
        }

        // Filtrar por faixa de valor (com margem de tolerância de 2x)
        if (perfil.valorMaximo) {
            licitacoes = licitacoes.filter(l =>
                !l.valorEstimado || l.valorEstimado <= perfil.valorMaximo! * 2
            );
        }

        // Excluir modalidades se configurado
        if (config.filtros?.excluirModalidades?.length) {
            const modalidadesExcluir = config.filtros.excluirModalidades.map(String);
            licitacoes = licitacoes.filter(l =>
                !modalidadesExcluir.some(m => l.modalidade.includes(m))
            );
        }

        // Limitar quantidade para análise
        const maxAnalise = config.maxLicitacoesAnalise || 20;
        return licitacoes.slice(0, maxAnalise);

    } catch (error) {
        console.error('Erro ao buscar licitações:', error);
        return [];
    }
}

// Criar prompt do sistema para o agente
function criarSystemPrompt(): string {
    return `Você é um Agente de IA especialista em licitações públicas no Brasil, com profundo conhecimento em:
- Lei 14.133/2021 (Nova Lei de Licitações)
- Pregão Eletrônico e suas particularidades
- Análise de editais e objetos de licitação
- Match entre capacidades empresariais e requisitos de editais

SUA MISSÃO:
Analisar licitações públicas e identificar as MELHORES OPORTUNIDADES para a empresa, considerando:
1. Compatibilidade técnica entre o objeto e as capacidades da empresa
2. Viabilidade geográfica e logística
3. Adequação do porte e valor
4. Potencial de sucesso na disputa
5. Prazos e urgência

IMPORTANTE: Responda APENAS com um JSON válido, sem markdown, sem código, sem explicações fora do JSON.

O JSON deve seguir EXATAMENTE esta estrutura:
{
    "resumoGeral": "<resumo executivo da análise em 2-3 frases>",
    "totalAnalisadas": <número>,
    "totalRecomendadas": <número>,
    "recomendacoes": [
        {
            "licitacaoId": "<id>",
            "objeto": "<objeto resumido>",
            "orgao": "<órgão>",
            "uf": "<UF>",
            "municipio": "<município ou null>",
            "modalidade": "<modalidade>",
            "valorEstimado": <valor ou null>,
            "dataAbertura": "<data ou null>",
            "scoreCompatibilidade": <0-100>,
            "nivel": "<Excelente|Bom|Moderado|Baixo>",
            "motivosMatch": ["<motivo 1>", "<motivo 2>"],
            "alertas": ["<alerta 1>"],
            "estrategiaSugerida": "<estratégia para participar>",
            "prioridade": "<Alta|Média|Baixa>"
        }
    ],
    "insights": {
        "oportunidadesDestaque": ["<oportunidade 1>", "<oportunidade 2>"],
        "tendenciasMercado": ["<tendência 1>"],
        "alertasGerais": ["<alerta geral 1>"],
        "sugestoesPerfilEmpresa": ["<sugestão para melhorar competitividade>"]
    }
}

CRITÉRIOS DE ANÁLISE:

1. ANÁLISE SEMÂNTICA DO OBJETO (Peso 40%):
   - Analise semanticamente cada objeto de licitação
   - Identifique requisitos técnicos implícitos e explícitos
   - Compare com as capacidades da empresa usando sinônimos e termos relacionados
   - Considere a cadeia de valor (ex: se empresa faz software, pode fazer manutenção de sistemas)

2. COMPATIBILIDADE GEOGRÁFICA (Peso 15%):
   - Priorize estados onde a empresa atua
   - Considere custos logísticos para estados distantes
   - Licitações em capitais geralmente têm mais volume

3. ADEQUAÇÃO DE PORTE E VALOR (Peso 20%):
   - MEI/ME/EPP têm vantagens em licitações exclusivas
   - Valores muito acima do usual exigem consórcio
   - Valores muito baixos podem não compensar o esforço

4. MODALIDADE E COMPLEXIDADE (Peso 10%):
   - Pregão eletrônico é mais ágil e acessível
   - Concorrência exige mais documentação
   - Dispensa/Inexigibilidade tem regras específicas

5. TIMING E URGÊNCIA (Peso 15%):
   - Prazo para abertura de propostas
   - Tempo necessário para preparar documentação
   - Janela de oportunidade

NÍVEIS DE COMPATIBILIDADE:
- Excelente (80-100): Match forte, alta probabilidade de sucesso, prioridade máxima
- Bom (60-79): Match bom com pequenos gaps, vale a pena participar
- Moderado (40-59): Match parcial, requer preparação adicional
- Baixo (0-39): Match fraco, não recomendar (não incluir nas recomendações)

PRIORIDADE:
- Alta: Score >= 70% E (prazo <= 15 dias OU valor atrativo)
- Média: Score >= 50% E prazo razoável
- Baixa: Score < 50% OU prazo muito longo

REGRAS:
1. Só inclua licitações com scoreCompatibilidade >= 40
2. Ordene por scoreCompatibilidade (maior primeiro)
3. Máximo de 10 recomendações
4. Seja específico nos motivos de match e alertas
5. A estratégia sugerida deve ser acionável e prática`;
}

// Criar prompt com dados para análise
function criarUserPrompt(perfil: PerfilEmpresa, licitacoes: Licitacao[]): string {
    const perfilFormatado = `
PERFIL DA EMPRESA:
- Nome: ${perfil.nomeEmpresa}
- CNPJ: ${perfil.cnpj || 'Não informado'}
- Porte: ${perfil.porte}
- Áreas de Atuação: ${perfil.areasAtuacao.join(', ')}
- Capacidades Técnicas: ${perfil.capacidades.join(', ')}
- Certificações: ${perfil.certificacoes.join(', ') || 'Nenhuma informada'}
- Estados de Atuação: ${perfil.estadosAtuacao.join(', ') || 'Todo Brasil'}
- Faixa de Valor: ${perfil.valorMinimo ? `R$ ${perfil.valorMinimo.toLocaleString('pt-BR')}` : 'Sem mínimo'} a ${perfil.valorMaximo ? `R$ ${perfil.valorMaximo.toLocaleString('pt-BR')}` : 'Sem máximo'}
- Modalidades Preferidas: ${perfil.modalidadesPreferidas?.length ? perfil.modalidadesPreferidas.join(', ') : 'Todas'}
`;

    const licitacoesFormatadas = licitacoes.map((l, i) => `
[${i + 1}] ID: ${l.id}
    Órgão: ${l.orgao}
    UF: ${l.uf} ${l.municipio ? `/ ${l.municipio}` : ''}
    Objeto: ${l.objeto}
    Modalidade: ${l.modalidade}
    Valor Estimado: ${l.valorEstimado ? `R$ ${l.valorEstimado.toLocaleString('pt-BR')}` : 'Não informado'}
    Data Abertura: ${l.dataAbertura || 'Não informada'}
    Área Detectada: ${l.areaAtuacao}
    Categorias: ${l.categorias?.join(', ') || 'Não categorizadas'}
`).join('\n---\n');

    return `${perfilFormatado}

LICITAÇÕES PARA ANÁLISE (${licitacoes.length} encontradas):
${licitacoesFormatadas}

Analise estas licitações e retorne as melhores recomendações para a empresa em formato JSON.`;
}

export async function POST(request: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(request);
        if (!usuario) return respostaNaoAutorizado();

        const body: RequestAgente = await request.json();
        const config: ConfiguracaoAgente = body.configuracao || {};

        // 1. Buscar perfil da empresa
        const perfilRes = await withReconnect((r: any) =>
            r.perfil_empresa.findUnique({ where: { user_id: usuario.userId as any } })
        ) as any | null;

        if (!perfilRes || !perfilRes.dados) {
            return NextResponse.json({
                success: false,
                error: 'Perfil da empresa não configurado. Configure o perfil primeiro para usar o agente de recomendações.'
            }, { status: 400 });
        }

        const perfil: PerfilEmpresa = perfilRes.dados;

        // Validar dados mínimos do perfil
        if (!perfil.areasAtuacao?.length && !perfil.capacidades?.length) {
            return NextResponse.json({
                success: false,
                error: 'Perfil incompleto. Adicione pelo menos áreas de atuação ou capacidades técnicas.'
            }, { status: 400 });
        }

        // 2. Buscar licitações recentes
        const licitacoes = await buscarLicitacoesRecentes(perfil, config);

        if (licitacoes.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    resumoGeral: 'Nenhuma licitação encontrada no período analisado.',
                    totalAnalisadas: 0,
                    totalRecomendadas: 0,
                    recomendacoes: [],
                    insights: {
                        oportunidadesDestaque: [],
                        tendenciasMercado: ['Não foi possível identificar tendências sem licitações para análise.'],
                        alertasGerais: ['Tente ampliar o período de busca ou revisar os filtros.'],
                        sugestoesPerfilEmpresa: []
                    },
                    dataAnalise: new Date().toISOString(),
                    versaoAgente: VERSAO_AGENTE
                }
            });
        }

        // 3. Verificar API key
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({
                success: false,
                error: 'API Key do Google não configurada no servidor.'
            }, { status: 500 });
        }

        // 4. Inicializar modelo Gemini
        const model = new ChatGoogleGenerativeAI({
            apiKey: apiKey,
            model: 'gemini-2.5-flash',
            temperature: 0.4, // Balanço entre criatividade e consistência
            maxOutputTokens: 8192, // Aumentado para garantir resposta completa
        });

        // 5. Executar análise do agente
        const systemPrompt = criarSystemPrompt();
        const userPrompt = criarUserPrompt(perfil, licitacoes);

        const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage(userPrompt)
        ];

        const response = await model.invoke(messages, { timeout: 45000 });
        const content = response.content as string;

        // 6. Processar resposta
        let analise: AnaliseAgente;

        try {
            // Limpar possíveis marcadores de código
            let jsonClean = content
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .trim();

            // Tentar reparar JSON incompleto
            if (!jsonClean.endsWith('}')) {
                console.warn('JSON incompleto detectado, tentando reparar...');
                // Contar chaves abertas e fechadas
                const abertas = (jsonClean.match(/{/g) || []).length;
                const fechadas = (jsonClean.match(/}/g) || []).length;
                const colchAbertos = (jsonClean.match(/\[/g) || []).length;
                const colchFechados = (jsonClean.match(/\]/g) || []).length;

                // Fechar estruturas abertas
                for (let i = 0; i < abertas - fechadas; i++) {
                    jsonClean += '}';
                }
                for (let i = 0; i < colchAbertos - colchFechados; i++) {
                    jsonClean += ']';
                }

                console.log('JSON reparado, tentando parse novamente...');
            }

            const parsed = JSON.parse(jsonClean);

            // Validar e ajustar estrutura
            analise = {
                resumoGeral: parsed.resumoGeral || 'Análise concluída.',
                totalAnalisadas: licitacoes.length,
                totalRecomendadas: parsed.recomendacoes?.length || 0,
                recomendacoes: (parsed.recomendacoes || [])
                    .filter((r: any) => r.scoreCompatibilidade >= (config.scoreMinimo || 40))
                    .sort((a: any, b: any) => b.scoreCompatibilidade - a.scoreCompatibilidade)
                    .slice(0, 10)
                    .map((r: any): RecomendacaoLicitacao => ({
                        licitacaoId: r.licitacaoId,
                        objeto: r.objeto,
                        orgao: r.orgao,
                        uf: r.uf,
                        municipio: r.municipio,
                        modalidade: r.modalidade,
                        valorEstimado: r.valorEstimado,
                        dataAbertura: r.dataAbertura,
                        scoreCompatibilidade: Math.min(100, Math.max(0, r.scoreCompatibilidade)),
                        nivel: r.nivel || determinarNivel(r.scoreCompatibilidade),
                        motivosMatch: r.motivosMatch || [],
                        alertas: r.alertas || [],
                        estrategiaSugerida: r.estrategiaSugerida || 'Analisar edital completo antes de participar.',
                        prioridade: r.prioridade || 'Média'
                    })),
                insights: {
                    oportunidadesDestaque: parsed.insights?.oportunidadesDestaque || [],
                    tendenciasMercado: parsed.insights?.tendenciasMercado || [],
                    alertasGerais: parsed.insights?.alertasGerais || [],
                    sugestoesPerfilEmpresa: parsed.insights?.sugestoesPerfilEmpresa || []
                },
                dataAnalise: new Date().toISOString(),
                versaoAgente: VERSAO_AGENTE
            };

        } catch (parseError) {
            console.error('Erro ao processar resposta do agente:', parseError);
            console.error('Resposta raw:', content);
            console.error('Comprimento da resposta:', content.length);
            console.error('Últimos 500 caracteres:', content.slice(-500));

            return NextResponse.json({
                success: false,
                error: 'Erro ao processar análise do agente. A resposta pode estar incompleta. Tente novamente.'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: analise
        });

    } catch (error) {
        console.error('Erro no agente de recomendação:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido no agente'
        }, { status: 500 });
    }
}

function determinarNivel(score: number): 'Excelente' | 'Bom' | 'Moderado' | 'Baixo' {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Moderado';
    return 'Baixo';
}

// GET para verificar status do agente
export async function GET(request: NextRequest) {
    try {
        const usuario = await getUsuarioFromRequest(request);
        if (!usuario) return respostaNaoAutorizado();

        const perfilRes = await withReconnect((r: any) =>
            r.perfil_empresa.findUnique({ where: { user_id: usuario.userId as any } })
        ) as any | null;

        const perfilConfigurado = !!(perfilRes?.dados);
        const apiKeyConfigurada = !!process.env.GOOGLE_API_KEY;

        return NextResponse.json({
            success: true,
            status: {
                versao: VERSAO_AGENTE,
                perfilConfigurado,
                apiKeyConfigurada,
                pronto: perfilConfigurado && apiKeyConfigurada
            }
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: 'Erro ao verificar status do agente'
        }, { status: 500 });
    }
}
