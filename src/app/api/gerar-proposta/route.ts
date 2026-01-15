import { NextRequest, NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// Interface para os dados da licitação
interface LicitacaoData {
    objeto: string;
    orgao: string;
    uf: string;
    municipio?: string;
    modalidade: string;
    valorEstimado?: number;
    dataAbertura?: string;
    categorias?: string[];
}

export async function POST(request: NextRequest) {
    try {
        const licitacao: LicitacaoData = await request.json();

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
            temperature: 0.7,
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
        const response = await model.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPrompt),
        ]);

        // Extrair o conteúdo da resposta
        const propostaTexto = typeof response.content === 'string'
            ? response.content
            : response.content.map(c => 'text' in c ? c.text : '').join('');

        return NextResponse.json({
            success: true,
            proposta: propostaTexto,
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
