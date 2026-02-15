import { NextRequest, NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { DocumentoChecklist, CategoriaDocumento, StatusDocumento } from '@/types/checklist';

interface DadosLicitacao {
    titulo?: string;
    orgao?: string;
    objeto?: string;
    dataAbertura?: string;
    licitacaoId?: string;
}

interface RequestBody {
    textoEdital?: string;
    urlEdital?: string;
    cnpj?: string;
    ano?: string;
    sequencial?: string;
    dadosLicitacao?: DadosLicitacao;
}

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Função para extrair texto de PDF usando API externa (pdf.js não funciona bem no servidor)
async function fetchPdfContent(url: string): Promise<string> {
    try {
        // Tentar buscar via proxy que converte PDF para texto
        // Alternativa: usar pdf-parse no servidor
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/pdf')) {
            // Para PDFs, vamos extrair o que conseguirmos ou retornar erro
            // Idealmente usaríamos pdf-parse aqui, mas vamos simplificar
            return '';
        }

        // Se for HTML ou texto, retornar diretamente
        const text = await response.text();
        return text;
    } catch (error) {
        console.error('Erro ao buscar conteúdo:', error);
        return '';
    }
}

// Buscar informações detalhadas da contratação no PNCP
async function buscarDetalhesContratacao(cnpj: string, ano: string, sequencial: string): Promise<string> {
    try {
        // Buscar detalhes da contratação
        const urlContratacao = `https://pncp.gov.br/api/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`;
        const responseContratacao = await fetch(urlContratacao, { signal: AbortSignal.timeout(10000) });

        let textoContexto = '';

        if (responseContratacao.ok) {
            const dados = await responseContratacao.json();
            textoContexto += `
INFORMAÇÕES DA CONTRATAÇÃO:
- Órgão: ${dados.orgaoEntidade?.razaoSocial || 'N/A'}
- Objeto: ${dados.objetoCompra || 'N/A'}
- Modalidade: ${dados.modalidadeNome || 'N/A'}
- Informações Complementares: ${dados.informacaoComplementar || 'N/A'}
- Valor Estimado: R$ ${dados.valorTotalEstimado?.toLocaleString('pt-BR') || 'N/A'}
`;
        }

        // Buscar itens da contratação
        const urlItens = `https://pncp.gov.br/api/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens`;
        const responseItens = await fetch(urlItens, { signal: AbortSignal.timeout(10000) });

        if (responseItens.ok) {
            const itens = await responseItens.json();
            if (itens.length > 0) {
                textoContexto += '\nITENS DA CONTRATAÇÃO:\n';
                itens.slice(0, 20).forEach((item: any, index: number) => {
                    textoContexto += `${index + 1}. ${item.descricao || 'Item sem descrição'} - Quantidade: ${item.quantidade || 'N/A'}\n`;
                });
            }
        }

        // Buscar arquivos/editais
        const urlArquivos = `https://pncp.gov.br/api/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos`;
        const responseArquivos = await fetch(urlArquivos, { signal: AbortSignal.timeout(10000) });

        if (responseArquivos.ok) {
            const arquivos = await responseArquivos.json();
            if (arquivos.length > 0) {
                textoContexto += '\nDOCUMENTOS DISPONÍVEIS:\n';
                arquivos.forEach((arq: any, index: number) => {
                    textoContexto += `${index + 1}. ${arq.titulo || 'Documento'} (${arq.tipoDocumentoNome || 'Tipo não informado'})\n`;
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
        const { textoEdital, cnpj, ano, sequencial, dadosLicitacao } = body;

        let textoParaAnalise = textoEdital || '';

        // Se tiver dados do PNCP, buscar informações automaticamente
        if (cnpj && ano && sequencial) {
            const detalhes = await buscarDetalhesContratacao(cnpj, ano, sequencial);
            if (detalhes) {
                textoParaAnalise = detalhes + '\n\n' + (textoEdital || '');
            }
        }

        // Se ainda não tiver texto suficiente, usar o objeto da licitação
        if (textoParaAnalise.trim().length < 50 && dadosLicitacao?.objeto) {
            textoParaAnalise = `
OBJETO DA LICITAÇÃO:
${dadosLicitacao.objeto}

ÓRGÃO: ${dadosLicitacao.orgao || 'Não informado'}

Com base neste objeto, identifique os documentos típicos necessários para esta modalidade de licitação.
`;
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
                    error: 'API Key do Google não configurada. Configure a variável de ambiente GOOGLE_API_KEY.',
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

        const systemPrompt = `Você é um especialista em licitações públicas brasileiras. Sua tarefa é analisar as informações de uma licitação e identificar TODOS os documentos necessários para habilitação e participação.

Analise o objeto da licitação, a modalidade e as informações complementares para determinar:
1. Documentos de habilitação jurídica típicos
2. Certidões de regularidade fiscal obrigatórias
3. Qualificação técnica necessária para o tipo de serviço/produto
4. Qualificação econômico-financeira
5. Declarações exigidas por lei
6. Documentos específicos para o objeto da licitação

Você DEVE retornar um JSON válido com a lista de documentos, seguindo esta estrutura exata:

{
  "documentos": [
    {
      "nome": "Nome do documento",
      "descricao": "Descrição ou detalhes específicos",
      "categoria": "categoria",
      "obrigatorio": true/false
    }
  ]
}

As categorias válidas são:
- "habilitacao_juridica": Contrato social, atos constitutivos, procuração, etc.
- "regularidade_fiscal": CNDs, certidões negativas de débitos (federal, estadual, municipal, FGTS, trabalhista), etc.
- "qualificacao_tecnica": Atestados de capacidade técnica, registros em conselhos, certificações, etc.
- "qualificacao_economica": Balanço patrimonial, certidão de falência, capital social mínimo, etc.
- "declaracoes": Todas as declarações exigidas (menor, fatos impeditivos, ME/EPP, etc.)
- "proposta": Proposta comercial, planilha de custos, composição de preços, etc.
- "outros": Documentos específicos que não se encaixam nas categorias acima

IMPORTANTE:
1. Seja específico considerando o OBJETO da licitação
2. Para licitações de TI: inclua documentos como certificações, atestados técnicos específicos
3. Para obras: inclua documentos de engenharia, ART, etc.
4. Inclua documentos padrão de licitações públicas brasileiras (Lei 14.133/2021 e Lei 8.666/93)
5. Retorne APENAS o JSON, sem texto adicional`;

        const userPrompt = `Analise as seguintes informações da licitação e identifique todos os documentos necessários:

${textoParaAnalise.substring(0, 15000)}

Retorne o JSON com todos os documentos necessários para participar desta licitação.`;

        const response = await model.invoke(
            [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)],
            { timeout: 45000 },
        );

        const responseText = typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);

        // Extrair JSON da resposta
        let documentosExtraidos: { nome: string; descricao?: string; categoria: string; obrigatorio: boolean }[] = [];

        try {
            // Tentar encontrar JSON na resposta
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                documentosExtraidos = parsed.documentos || [];
            }
        } catch (parseError) {
            console.error('Erro ao parsear resposta da IA:', parseError);
            // Retornar documentos padrão em caso de erro
            return NextResponse.json({
                success: true,
                documentos: getDocumentosPadrao(),
                aviso: 'Não foi possível extrair documentos específicos do edital. Lista padrão aplicada.',
            });
        }

        // Converter para o formato DocumentoChecklist
        const documentos: DocumentoChecklist[] = documentosExtraidos.map((doc, index) => ({
            id: generateId(),
            nome: doc.nome,
            descricao: doc.descricao,
            categoria: validarCategoria(doc.categoria),
            obrigatorio: doc.obrigatorio ?? true,
            status: 'pendente' as StatusDocumento,
            ordem: index,
        }));

        // Se não encontrou documentos, usar padrão
        if (documentos.length === 0) {
            return NextResponse.json({
                success: true,
                documentos: getDocumentosPadrao(),
                aviso: 'Nenhum documento específico encontrado. Lista padrão aplicada.',
            });
        }

        return NextResponse.json({
            success: true,
            documentos,
            totalEncontrados: documentos.length,
        });

    } catch (error) {
        console.error('Erro ao analisar edital:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Erro interno ao analisar edital',
            },
            { status: 500 }
        );
    }
}

function validarCategoria(categoria: string): CategoriaDocumento {
    const categoriasValidas: CategoriaDocumento[] = [
        'habilitacao_juridica',
        'regularidade_fiscal',
        'qualificacao_tecnica',
        'qualificacao_economica',
        'declaracoes',
        'proposta',
        'outros'
    ];

    return categoriasValidas.includes(categoria as CategoriaDocumento)
        ? categoria as CategoriaDocumento
        : 'outros';
}

function getDocumentosPadrao(): DocumentoChecklist[] {
    const docs = [
        { nome: 'Contrato Social e Alterações', categoria: 'habilitacao_juridica' as CategoriaDocumento, obrigatorio: true, descricao: 'Ou documento equivalente' },
        { nome: 'Documento de Identidade do Representante', categoria: 'habilitacao_juridica' as CategoriaDocumento, obrigatorio: true },
        { nome: 'CNPJ - Cartão de Inscrição', categoria: 'regularidade_fiscal' as CategoriaDocumento, obrigatorio: true },
        { nome: 'CND Federal (Tributos e Dívida Ativa)', categoria: 'regularidade_fiscal' as CategoriaDocumento, obrigatorio: true },
        { nome: 'CND Estadual', categoria: 'regularidade_fiscal' as CategoriaDocumento, obrigatorio: true },
        { nome: 'CND Municipal', categoria: 'regularidade_fiscal' as CategoriaDocumento, obrigatorio: true },
        { nome: 'CRF - FGTS', categoria: 'regularidade_fiscal' as CategoriaDocumento, obrigatorio: true },
        { nome: 'CNDT - Débitos Trabalhistas', categoria: 'regularidade_fiscal' as CategoriaDocumento, obrigatorio: true },
        { nome: 'Balanço Patrimonial', categoria: 'qualificacao_economica' as CategoriaDocumento, obrigatorio: true },
        { nome: 'Certidão Negativa de Falência', categoria: 'qualificacao_economica' as CategoriaDocumento, obrigatorio: true },
        { nome: 'Atestado de Capacidade Técnica', categoria: 'qualificacao_tecnica' as CategoriaDocumento, obrigatorio: true },
        { nome: 'Declaração de Inexistência de Fatos Impeditivos', categoria: 'declaracoes' as CategoriaDocumento, obrigatorio: true },
        { nome: 'Declaração de Menor', categoria: 'declaracoes' as CategoriaDocumento, obrigatorio: true },
        { nome: 'Proposta Comercial', categoria: 'proposta' as CategoriaDocumento, obrigatorio: true },
    ];

    return docs.map((doc, index) => ({
        ...doc,
        id: generateId(),
        status: 'pendente' as StatusDocumento,
        ordem: index,
    }));
}
