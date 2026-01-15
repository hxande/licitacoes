import { PNCPResponse, MODALIDADES, Licitacao, PNCPContratacao } from '@/types/licitacao';

const PNCP_BASE_URL = 'https://pncp.gov.br/api/consulta/v1';

// Modalidades mais relevantes para TI
const MODALIDADES_TI = [4, 5, 6, 7, 8];

export function transformPNCPToLicitacao(item: PNCPContratacao): Licitacao {
    return {
        id: `${item.orgaoEntidade.cnpj}-${item.anoCompra}-${item.sequencialCompra}`,
        orgao: item.orgaoEntidade.razaoSocial,
        cnpjOrgao: item.orgaoEntidade.cnpj,
        uf: item.unidadeOrgao.ufSigla,
        municipio: item.unidadeOrgao.municipioNome,
        objeto: item.objetoCompra,
        modalidade: MODALIDADES[item.modalidadeId] || item.modalidadeNome || 'Não informado',
        dataPublicacao: item.dataPublicacaoPncp,
        dataAbertura: item.dataAberturaProposta,
        valorEstimado: item.valorTotalEstimado,
        situacao: item.situacaoCompraNome,
        linkEdital: item.linkSistemaOrigem,
        fonte: 'PNCP',
        categorias: extractCategorias(item.objetoCompra),
    };
}

function extractCategorias(objeto: string): string[] {
    const categorias: string[] = [];
    const objetoLower = objeto.toLowerCase();

    const categoriaMap: Record<string, string[]> = {
        'Software': ['software', 'sistema', 'aplicativo', 'app', 'erp', 'crm', 'saas'],
        'Desenvolvimento': ['desenvolvimento', 'programação', 'fábrica de software', 'codificação'],
        'Hardware': ['computador', 'notebook', 'servidor', 'desktop', 'monitor', 'impressora'],
        'Infraestrutura': ['rede', 'cabeamento', 'data center', 'infraestrutura', 'switch', 'roteador'],
        'Cloud': ['cloud', 'nuvem', 'hosting', 'hospedagem', 'aws', 'azure', 'google cloud'],
        'Segurança': ['segurança', 'firewall', 'antivirus', 'backup', 'proteção'],
        'Suporte': ['suporte', 'manutenção', 'assistência técnica', 'helpdesk'],
        'Consultoria': ['consultoria', 'assessoria', 'diagnóstico'],
        'Licenças': ['licença', 'licenciamento', 'assinatura'],
        'Web': ['web', 'site', 'portal', 'website', 'internet'],
        'Mobile': ['mobile', 'android', 'ios', 'celular', 'smartphone'],
        'BI/Analytics': ['bi', 'business intelligence', 'analytics', 'dados', 'relatório'],
        'IA': ['inteligência artificial', 'machine learning', 'ia', 'ml', 'automação'],
    };

    for (const [categoria, palavras] of Object.entries(categoriaMap)) {
        if (palavras.some(palavra => objetoLower.includes(palavra))) {
            categorias.push(categoria);
        }
    }

    return categorias.length > 0 ? categorias : ['Outros'];
}

export async function buscarLicitacoesPNCP(params: {
    dataInicial: string;
    dataFinal: string;
    ufSigla?: string;
    codigoModalidadeContratacao?: number;
    pagina?: number;
    tamanhoPagina?: number;
}): Promise<PNCPResponse> {
    const modalidades = params.codigoModalidadeContratacao
        ? [params.codigoModalidadeContratacao]
        : MODALIDADES_TI;

    const allData: PNCPContratacao[] = [];
    let totalRegistros = 0;

    for (const modalidade of modalidades) {
        try {
            const searchParams = new URLSearchParams({
                dataInicial: params.dataInicial,
                dataFinal: params.dataFinal,
                pagina: String(params.pagina || 1),
                tamanhoPagina: String(Math.max(10, params.tamanhoPagina || 20)),
                codigoModalidadeContratacao: String(modalidade),
            });

            if (params.ufSigla) {
                searchParams.append('ufSigla', params.ufSigla);
            }

            const url = `${PNCP_BASE_URL}/contratacoes/publicacao?${searchParams.toString()}`;

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                },
                next: { revalidate: 300 },
            });

            if (response.ok) {
                const rawData = await response.json();
                if (rawData.data && Array.isArray(rawData.data)) {
                    allData.push(...rawData.data);
                    totalRegistros += rawData.totalRegistros || rawData.data.length;
                }
            }
        } catch (error) {
            console.error(`Erro ao buscar modalidade ${modalidade}:`, error);
        }
    }

    return {
        data: allData,
        paginaAtual: params.pagina || 1,
        totalPaginas: 1,
        totalRegistros: totalRegistros,
        itensPorPagina: params.tamanhoPagina || 20,
        temMaisPaginas: false,
    };
}

export function filtrarLicitacoesTI(licitacoes: Licitacao[], apenasRelacionadasTI: boolean = true): Licitacao[] {
    if (!apenasRelacionadasTI) return licitacoes;

    const palavrasChave = [
        'software', 'sistema', 'tecnologia', 'informática', 'ti ',
        'desenvolvimento', 'programação', 'aplicativo', 'app', 'web',
        'computador', 'notebook', 'servidor', 'rede', 'cloud', 'nuvem',
        'banco de dados', 'segurança', 'suporte técnico', 'digital',
        'manutenção de sistema', 'licença', 'saas', 'hosting',
        'infraestrutura de ti', 'data center', 'backup', 'consultoria',
        'devops', 'api', 'integração', 'erp', 'crm', 'bi', 'portal',
        'mobile', 'android', 'ios', 'frontend', 'backend', 'fullstack',
        'inteligência artificial', 'machine learning', 'automação'
    ];

    return licitacoes.filter(licitacao => {
        const objetoLower = licitacao.objeto.toLowerCase();
        return palavrasChave.some(palavra => objetoLower.includes(palavra));
    });
}
