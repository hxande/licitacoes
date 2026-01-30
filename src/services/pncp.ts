import { PNCPResponse, MODALIDADES, Licitacao, PNCPContratacao } from '@/types/licitacao';

const PNCP_BASE_URL = 'https://pncp.gov.br/api/consulta/v1';

// Todas as modalidades disponíveis (1..13)
const TODAS_MODALIDADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export function transformPNCPToLicitacao(item: PNCPContratacao): Licitacao {
    const objeto = item.objetoCompra;
    return {
        id: `${item.orgaoEntidade.cnpj}-${item.anoCompra}-${item.sequencialCompra}`,
        orgao: item.orgaoEntidade.razaoSocial,
        cnpjOrgao: item.orgaoEntidade.cnpj,
        uf: item.unidadeOrgao.ufSigla,
        municipio: item.unidadeOrgao.municipioNome,
        objeto: objeto,
        modalidade: MODALIDADES[item.modalidadeId] || item.modalidadeNome || 'Não informado',
        dataPublicacao: item.dataPublicacaoPncp,
        dataAbertura: item.dataAberturaProposta,
        valorEstimado: item.valorTotalEstimado,
        situacao: item.situacaoCompraNome,
        linkEdital: item.linkSistemaOrigem,
        fonte: 'PNCP',
        areaAtuacao: extractAreaAtuacao(objeto),
        categorias: extractCategoriasTI(objeto),
    };
}

// Extrai categorias de TI para exibir tags nos cards
function extractCategoriasTI(objeto: string): string[] {
    const categorias: string[] = [];
    const objetoLower = objeto.toLowerCase();

    const categoriaMap: Record<string, string[]> = {
        'Software': ['software', 'aplicativo', 'app', 'erp', 'crm', 'saas'],
        'Desenvolvimento': ['desenvolvimento de sistema', 'desenvolvimento de software', 'programação', 'fábrica de software', 'codificação'],
        'Hardware': ['computador', 'notebook', 'servidor', 'desktop', 'monitor', 'impressora'],
        'Infraestrutura TI': ['rede de dados', 'cabeamento estruturado', 'data center', 'infraestrutura de ti', 'switch', 'roteador'],
        'Cloud': ['cloud', 'nuvem', 'hosting', 'hospedagem', 'aws', 'azure', 'google cloud'],
        'Segurança TI': ['segurança da informação', 'firewall', 'antivirus', 'antivírus', 'backup'],
        'Suporte TI': ['suporte técnico de ti', 'suporte de ti', 'manutenção de sistema', 'helpdesk'],
        'Consultoria TI': ['consultoria de ti', 'consultoria em tecnologia', 'assessoria de informática'],
        'Licenças': ['licença de software', 'licenciamento', 'assinatura de software'],
        'Web': ['web', 'site', 'portal', 'website'],
        'Mobile': ['mobile', 'android', 'ios', 'aplicativo móvel'],
        'BI/Analytics': ['business intelligence', 'analytics', 'análise de dados'],
        'IA': ['inteligência artificial', 'machine learning'],
    };

    for (const [categoria, palavras] of Object.entries(categoriaMap)) {
        if (palavras.some(palavra => objetoLower.includes(palavra))) {
            categorias.push(categoria);
        }
    }

    return categorias;
}

// Extrai a área de atuação principal da licitação
function extractAreaAtuacao(objeto: string): string {
    const objetoLower = objeto.toLowerCase();

    const areaMap: Record<string, string[]> = {
        'Tecnologia da Informação': [
            'software', 'sistema de informação', 'informática', 'ti ', 'computador', 'notebook',
            'servidor', 'rede de dados', 'data center', 'cloud', 'nuvem', 'desenvolvimento de sistema',
            'programação', 'aplicativo', 'website', 'portal web', 'segurança da informação',
            'backup', 'firewall', 'helpdesk', 'suporte de ti', 'licença de software'
        ],
        'Engenharia e Obras': [
            'construção', 'obra', 'reforma', 'pavimentação', 'edificação', 'engenharia',
            'arquitetura', 'projeto', 'terraplanagem', 'fundação', 'estrutura', 'alvenaria',
            'hidráulica', 'elétrica', 'saneamento', 'drenagem', 'ponte', 'viaduto', 'estrada',
            'recuperação de prédio', 'manutenção predial', 'pintura', 'impermeabilização'
        ],
        'Saúde': [
            'medicamento', 'farmacêutico', 'hospitalar', 'saúde', 'médico', 'enfermagem',
            'cirúrgico', 'laboratorial', 'diagnóstico', 'vacina', 'ambulância', 'ubs',
            'hospital', 'clínica', 'odontológico', 'fisioterapia', 'exame', 'tratamento'
        ],
        'Educação': [
            'escola', 'educação', 'ensino', 'pedagógico', 'didático', 'escolar', 'professor',
            'creche', 'universidade', 'faculdade', 'capacitação', 'treinamento', 'curso',
            'material didático', 'livro', 'biblioteca'
        ],
        'Alimentação': [
            'alimentação', 'refeição', 'merenda', 'alimento', 'gênero alimentício', 'cozinha',
            'restaurante', 'lanche', 'café', 'água mineral', 'bebida', 'hortifruti',
            'carne', 'leite', 'pão', 'frutas', 'verduras', 'legumes'
        ],
        'Veículos e Transporte': [
            'veículo', 'automóvel', 'carro', 'caminhão', 'ônibus', 'motocicleta', 'transporte',
            'frete', 'combustível', 'gasolina', 'diesel', 'etanol', 'pneu', 'peça automotiva',
            'manutenção veicular', 'locação de veículo', 'frota'
        ],
        'Limpeza e Conservação': [
            'limpeza', 'conservação', 'higienização', 'zeladoria', 'jardinagem', 'paisagismo',
            'manutenção de área verde', 'coleta de lixo', 'resíduo', 'dedetização', 'desratização',
            'material de limpeza', 'produto de limpeza'
        ],
        'Segurança': [
            'vigilância', 'segurança patrimonial', 'monitoramento', 'alarme', 'câmera',
            'cftv', 'portaria', 'controle de acesso', 'cerca elétrica', 'guarda'
        ],
        'Mobiliário e Equipamentos': [
            'mobiliário', 'móvel', 'cadeira', 'mesa', 'armário', 'estante', 'ar condicionado',
            'climatização', 'eletrodoméstico', 'equipamento', 'máquina', 'ferramenta'
        ],
        'Comunicação e Marketing': [
            'publicidade', 'propaganda', 'marketing', 'comunicação', 'mídia', 'impressão',
            'gráfica', 'banner', 'outdoor', 'evento', 'cerimonial', 'assessoria de imprensa'
        ],
        'Jurídico e Contábil': [
            'jurídico', 'advocacia', 'advogado', 'contábil', 'contabilidade', 'auditoria',
            'perícia', 'assessoria jurídica', 'consultoria contábil', 'fiscal'
        ],
        'Recursos Humanos': [
            'recursos humanos', 'rh', 'folha de pagamento', 'recrutamento', 'seleção',
            'terceirização de mão de obra', 'gestão de pessoal'
        ],
    };

    for (const [area, palavras] of Object.entries(areaMap)) {
        if (palavras.some(palavra => objetoLower.includes(palavra))) {
            return area;
        }
    }

    return 'Outros';
}

// Limite máximo da API do PNCP
const PNCP_MAX_PAGE_SIZE = 50;

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
        : TODAS_MODALIDADES;

    const allData: PNCPContratacao[] = [];
    let totalRegistros = 0;
    let totalPaginasMax = 1;

    // Buscar todas as modalidades em paralelo para melhor performance
    const fetchPromises = modalidades.map(async (modalidade) => {
        try {
            const searchParams = new URLSearchParams({
                dataInicial: params.dataInicial,
                dataFinal: params.dataFinal,
                pagina: String(params.pagina || 1),
                tamanhoPagina: String(PNCP_MAX_PAGE_SIZE), // Usar limite máximo da API
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
                cache: 'no-store', // Desabilitar cache para garantir dados frescos
            });

            if (response.ok) {
                console.log(response)
                const text = await response.text();
                if (!text || text.trim() === '') {
                    console.warn(`[PNCP] Empty response for modalidade ${modalidade}`);
                    return { data: [], totalRegistros: 0, totalPaginas: 1 };
                }
                try {
                    const rawData = JSON.parse(text);
                    console.log(rawData);
                    return {
                        data: rawData.data || [],
                        totalRegistros: rawData.totalRegistros || 0,
                        totalPaginas: rawData.totalPaginas || 1,
                    };
                } catch (parseError) {
                    console.error(`[PNCP] JSON parse error for modalidade ${modalidade}:`, parseError);
                    return { data: [], totalRegistros: 0, totalPaginas: 1 };
                }
            }
            console.error(`[PNCP] Response ${response.status} for modalidade ${modalidade}`);
            return { data: [], totalRegistros: 0, totalPaginas: 1 };
        } catch (error) {
            console.error(`Erro ao buscar modalidade ${modalidade}:`, error);
            return { data: [], totalRegistros: 0, totalPaginas: 1 };
        }
    });

    const results = await Promise.all(fetchPromises);

    for (const result of results) {
        if (result.data && Array.isArray(result.data)) {
            allData.push(...result.data);
            totalRegistros += result.totalRegistros;
            totalPaginasMax = Math.max(totalPaginasMax, result.totalPaginas);
        }
    }

    const pagina = params.pagina || 1;
    const tamanhoPagina = params.tamanhoPagina || 20;

    return {
        data: allData,
        paginaAtual: pagina,
        totalPaginas: totalPaginasMax,
        totalRegistros: totalRegistros,
        itensPorPagina: tamanhoPagina,
        temMaisPaginas: pagina < totalPaginasMax,
    };
}

export function filtrarLicitacoesTI(licitacoes: Licitacao[], apenasRelacionadasTI: boolean = true): Licitacao[] {
    if (!apenasRelacionadasTI) return licitacoes;

    // Palavras-chave mais específicas para evitar falsos positivos
    // Usamos regex com limites de palavra para evitar matches parciais
    const palavrasChaveRegex = [
        /\bsoftware\b/i,
        /\binformática\b/i,
        /\bti\b/i,
        /\bsistema de informação/i,
        /\bdesenvolvimento de sistema/i,
        /\bprogramação\b/i,
        /\baplicativo\b/i,
        /\bcomputador/i,
        /\bnotebook/i,
        /\bservidor(es)? de dados/i,
        /\bcloud\b/i,
        /\bnuvem\b/i,
        /\bbanco de dados/i,
        /\bsuporte técnico de ti/i,
        /\bsuporte de informática/i,
        /\blicença de software/i,
        /\bsaas\b/i,
        /\bhosting\b/i,
        /\bhospedagem de (dados|site|sistema)/i,
        /\bdata center/i,
        /\bbackup\b/i,
        /\bconsultoria (de ti|em tecnologia)/i,
        /\bdevops\b/i,
        /\berp\b/i,
        /\bcrm\b/i,
        /\bbusiness intelligence/i,
        /\bandroid\b/i,
        /\bios\b/i,
        /\bfrontend\b/i,
        /\bbackend\b/i,
        /\bfullstack\b/i,
        /\bfull stack\b/i,
        /\binteligência artificial/i,
        /\bmachine learning/i,
        /\bcibersegurança\b/i,
        /\bfirewall\b/i,
        /\bantivírus\b/i,
        /\bantivirus\b/i,
        /\bhelpdesk\b/i,
        /\bhelp desk/i,
        /\brede de computadores/i,
        /\binfraestrutura de ti/i,
        /\bcabeamento estruturado/i,
        /\bswitch\b/i,
        /\broteador/i,
        /\bstorage\b/i,
        /\bvirtualização\b/i,
        /\blinux\b/i,
        /\bwindows server/i,
        /\bapi\b/i,
        /\bweb site\b/i,
        /\bwebsite\b/i,
        /\bportal (web|eletrônico)/i,
    ];

    return licitacoes.filter(licitacao => {
        const objeto = licitacao.objeto;
        return palavrasChaveRegex.some(regex => regex.test(objeto));
    });
}
