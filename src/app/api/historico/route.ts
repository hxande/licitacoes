import { NextRequest, NextResponse } from 'next/server';
import { jsonResponse } from '@/lib/response';
import {
    adicionarContratos,
    obterEstatisticasHistorico,
    carregarDadosHistoricos
} from '@/services/historico';
import { ContratoHistorico } from '@/types/historico';

const PNCP_BASE_URL = 'https://pncp.gov.br/api/consulta/v1';

interface PNCPContrato {
    orgaoEntidade: {
        cnpj: string;
        razaoSocial: string;
    };
    unidadeOrgao: {
        ufSigla: string;
        municipioNome?: string;
    };
    // Campos do fornecedor (API retorna campos separados, não objeto)
    niFornecedor?: string;
    nomeRazaoSocialFornecedor?: string;
    tipoPessoa?: string;
    tipoContrato?: {
        id: number;
        nome: string;
    };
    anoContrato: number;
    sequencialContrato: number;
    objetoContrato: string;
    valorInicial?: number;
    valorGlobal?: number;
    dataAssinatura?: string;
    dataPublicacaoPncp: string;
}

// Extrair palavras-chave
function extrairPalavrasChave(texto: string): string[] {
    const palavrasIgnoradas = new Set([
        'de', 'da', 'do', 'das', 'dos', 'para', 'com', 'sem', 'por', 'e', 'ou',
        'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'em', 'no', 'na',
        'nos', 'nas', 'ao', 'aos', 'à', 'às', 'pelo', 'pela', 'pelos', 'pelas',
        'que', 'se', 'não', 'mais', 'menos', 'muito', 'pouco', 'bem', 'mal',
        'contratação', 'prestação', 'serviço', 'serviços', 'fornecimento', 'aquisição',
        'empresa', 'objeto', 'valor', 'prazo', 'conforme', 'edital', 'licitação'
    ]);

    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(p => p.length > 3 && !palavrasIgnoradas.has(p))
        .slice(0, 10);
}

// Extrair área de atuação
function extrairAreaAtuacao(objeto: string): string {
    const objetoLower = objeto.toLowerCase();

    const areaMap: Record<string, string[]> = {
        'Tecnologia da Informação': [
            'software', 'sistema', 'informática', 'ti', 'computador', 'notebook',
            'servidor', 'rede', 'data center', 'cloud', 'nuvem', 'desenvolvimento',
            'aplicativo', 'website', 'portal', 'segurança da informação', 'backup'
        ],
        'Engenharia e Obras': [
            'construção', 'obra', 'reforma', 'pavimentação', 'edificação', 'engenharia',
            'arquitetura', 'terraplanagem', 'estrutura', 'hidráulica', 'elétrica'
        ],
        'Saúde': [
            'medicamento', 'hospitalar', 'saúde', 'médico', 'enfermagem', 'cirúrgico',
            'laboratorial', 'diagnóstico', 'vacina', 'ambulância', 'hospital'
        ],
        'Educação': [
            'escola', 'educação', 'ensino', 'pedagógico', 'didático', 'escolar',
            'creche', 'universidade', 'capacitação', 'treinamento', 'curso'
        ],
        'Alimentação': [
            'alimentação', 'refeição', 'merenda', 'alimento', 'cozinha', 'restaurante'
        ],
        'Veículos e Transporte': [
            'veículo', 'automóvel', 'carro', 'caminhão', 'ônibus', 'transporte', 'frete'
        ],
        'Limpeza e Conservação': [
            'limpeza', 'conservação', 'higienização', 'zeladoria', 'jardinagem'
        ],
        'Segurança': [
            'vigilância', 'segurança patrimonial', 'monitoramento', 'câmera', 'cftv'
        ],
    };

    for (const [area, palavras] of Object.entries(areaMap)) {
        if (palavras.some(p => objetoLower.includes(p))) {
            return area;
        }
    }

    return 'Outros';
}

// Buscar contratos do PNCP
async function buscarContratosPNCP(
    dataInicial: string,
    dataFinal: string,
    ufSigla?: string,
    pagina: number = 1
): Promise<{ data: PNCPContrato[]; totalPaginas: number }> {
    try {
        const params = new URLSearchParams({
            dataInicial,
            dataFinal,
            pagina: String(pagina),
            tamanhoPagina: '50',
        });

        if (ufSigla) {
            params.append('ufSigla', ufSigla);
        }

        const url = `${PNCP_BASE_URL}/contratos?${params.toString()}`;
        console.log(`[Histórico] Buscando: ${url}`);

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`[Histórico] Erro ${response.status}`);
            return { data: [], totalPaginas: 0 };
        }

        const result = await response.json();
        return {
            data: result.data || [],
            totalPaginas: result.totalPaginas || 0,
        };
    } catch (error) {
        console.error('[Histórico] Erro na busca:', error);
        return { data: [], totalPaginas: 0 };
    }
}

// Transformar contrato PNCP para nosso formato
function transformarContrato(contrato: PNCPContrato): ContratoHistorico | null {
    // Ignorar contratos sem fornecedor
    if (!contrato.niFornecedor) {
        return null;
    }

    const objeto = contrato.objetoContrato || '';

    return {
        id: `${contrato.orgaoEntidade.cnpj}-${contrato.anoContrato}-${contrato.sequencialContrato}`,
        cnpjOrgao: contrato.orgaoEntidade.cnpj,
        orgao: contrato.orgaoEntidade.razaoSocial,
        uf: contrato.unidadeOrgao.ufSigla,
        municipio: contrato.unidadeOrgao.municipioNome,
        objeto,
        fornecedorCnpj: contrato.niFornecedor,
        fornecedorNome: contrato.nomeRazaoSocialFornecedor || 'Não informado',
        valorContratado: contrato.valorGlobal || contrato.valorInicial || 0,
        dataAssinatura: contrato.dataAssinatura || contrato.dataPublicacaoPncp,
        dataPublicacao: contrato.dataPublicacaoPncp,
        tipoContrato: contrato.tipoContrato?.nome || 'Não informado',
        areaAtuacao: extrairAreaAtuacao(objeto),
        palavrasChave: extrairPalavrasChave(objeto),
    };
}

// GET - Obter estatísticas do histórico
export async function GET() {
    try {
        const stats = await obterEstatisticasHistorico();
        const dados = await carregarDadosHistoricos();

        return jsonResponse({
            success: true,
            stats,
            amostra: dados?.contratos.slice(0, 5) || [],
        });
    } catch (error) {
        console.error('[Histórico] Erro:', error);
        return jsonResponse(
            { success: false, error: 'Erro ao carregar histórico' },
            { status: 500 }
        );
    }
}

// POST - Carregar dados históricos do PNCP
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { meses = 6, uf, maxPaginas = 20 } = body;

        // Calcular período
        const dataFinal = new Date();
        const dataInicial = new Date();
        dataInicial.setMonth(dataInicial.getMonth() - meses);

        // Formato YYYYMMDD exigido pela API do PNCP
        const formatarData = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');
        const dataInicialStr = formatarData(dataInicial);
        const dataFinalStr = formatarData(dataFinal);

        console.log(`[Histórico] Iniciando carga: ${dataInicialStr} a ${dataFinalStr}`);

        const todosContratos: ContratoHistorico[] = [];
        let pagina = 1;
        let totalPaginas = 1;

        // Buscar todas as páginas (com limite)
        while (pagina <= Math.min(totalPaginas, maxPaginas)) {
            const resultado = await buscarContratosPNCP(dataInicialStr, dataFinalStr, uf, pagina);

            if (resultado.data.length === 0) break;

            totalPaginas = resultado.totalPaginas;

            // Transformar e filtrar contratos válidos
            const contratosValidos = resultado.data
                .map(transformarContrato)
                .filter((c): c is ContratoHistorico => c !== null);

            todosContratos.push(...contratosValidos);

            console.log(`[Histórico] Página ${pagina}/${totalPaginas}: ${contratosValidos.length} contratos`);
            pagina++;

            // Pequeno delay para não sobrecarregar a API
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Salvar no histórico
        const novosAdicionados = await adicionarContratos(todosContratos);
        const statsAtualizadas = await obterEstatisticasHistorico();

        return jsonResponse({
            success: true,
            message: `Carga concluída`,
            contratosEncontrados: todosContratos.length,
            novosAdicionados,
            paginasProcessadas: pagina - 1,
            totalPaginasDisponiveis: totalPaginas,
            stats: statsAtualizadas,
        });

    } catch (error) {
        console.error('[Histórico] Erro na carga:', error);
        return jsonResponse(
            { success: false, error: 'Erro ao carregar dados históricos' },
            { status: 500 }
        );
    }
}
