import { NextRequest, NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

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

export async function POST(request: NextRequest) {
    try {
        const { licitacao, perfil }: { licitacao: LicitacaoData; perfil: PerfilEmpresa } = await request.json();

        // Validar dados
        if (!licitacao || !perfil) {
            return NextResponse.json(
                { success: false, error: 'Dados da licitação e perfil são obrigatórios' },
                { status: 400 }
            );
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

Critérios para a análise:
- Excelente (80-100%): Empresa altamente qualificada, alta probabilidade de sucesso
- Bom (60-79%): Empresa qualificada com alguns gaps menores
- Moderado (40-59%): Empresa parcialmente qualificada, precisa de preparação
- Baixo (0-39%): Empresa não recomendada para esta licitação

Analise semanticamente o objeto da licitação e compare com as capacidades da empresa.
Identifique requisitos técnicos implícitos no objeto.
Considere porte da empresa, certificações, área de atuação e valor.`;

        // Prompt do usuário
        const userPrompt = `Analise a compatibilidade entre esta empresa e licitação:

## PERFIL DA EMPRESA
- **Nome:** ${perfil.nomeEmpresa}
- **CNPJ:** ${perfil.cnpj || 'Não informado'}
- **Porte:** ${perfil.porte}
- **Áreas de Atuação:** ${perfil.areasAtuacao.join(', ') || 'Não especificadas'}
- **Capacidades Técnicas:** ${perfil.capacidades.join(', ') || 'Não especificadas'}
- **Certificações:** ${perfil.certificacoes.join(', ') || 'Nenhuma'}
- **Estados que atua:** ${perfil.estadosAtuacao.join(', ') || 'Todo Brasil'}
- **Faixa de valor:** ${valorMinFormatado} a ${valorMaxFormatado}

## LICITAÇÃO
- **Órgão:** ${licitacao.orgao}
- **Localização:** ${licitacao.municipio ? `${licitacao.municipio} - ` : ''}${licitacao.uf}
- **Modalidade:** ${licitacao.modalidade}
- **Valor Estimado:** ${valorFormatado}
- **Área:** ${licitacao.areaAtuacao || 'Não categorizada'}
- **Categorias:** ${licitacao.categorias?.join(', ') || 'Não categorizadas'}

**OBJETO DA LICITAÇÃO:**
${licitacao.objeto}

Retorne APENAS o JSON com a análise.`;

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

        return NextResponse.json({
            success: true,
            analise,
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
