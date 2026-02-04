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
        dataEncerramento: item.dataEncerramentoProposta,
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

// ============================================================================
// SISTEMA DE CATEGORIZAÇÃO POR SCORING
// ============================================================================

interface TermoCategoria {
    termo: string;
    peso: number;  // 1 = genérico, 2 = moderado, 3 = muito específico
}

interface CategoriaConfig {
    termos: TermoCategoria[];
    exclusoes: string[];      // Se encontrar esses termos, descartar a categoria
    scoreMinimo: number;      // Score mínimo para classificar nesta categoria
}

// Configuração completa das categorias com pesos e exclusões
const CATEGORIAS_CONFIG: Record<string, CategoriaConfig> = {
    'Tecnologia da Informação': {
        termos: [
            // Peso 3 - Muito específicos (praticamente garantem TI)
            { termo: 'software', peso: 3 },
            { termo: 'sistema de informação', peso: 3 },
            { termo: 'desenvolvimento de sistema', peso: 3 },
            { termo: 'fábrica de software', peso: 3 },
            { termo: 'data center', peso: 3 },
            { termo: 'infraestrutura de ti', peso: 3 },
            { termo: 'suporte de ti', peso: 3 },
            { termo: 'helpdesk', peso: 3 },
            { termo: 'help desk', peso: 3 },
            { termo: 'licença de software', peso: 3 },
            { termo: 'segurança da informação', peso: 3 },
            { termo: 'banco de dados', peso: 3 },
            { termo: 'cloud computing', peso: 3 },
            { termo: 'computação em nuvem', peso: 3 },
            { termo: 'virtualização', peso: 3 },
            { termo: 'backup de dados', peso: 3 },
            { termo: 'rede de computadores', peso: 3 },
            { termo: 'cabeamento estruturado', peso: 3 },
            // Peso 2 - Moderados (fortes indicadores)
            { termo: 'informática', peso: 2 },
            { termo: 'computador', peso: 2 },
            { termo: 'notebook', peso: 2 },
            { termo: 'servidor de rede', peso: 2 },
            { termo: 'firewall', peso: 2 },
            { termo: 'antivírus', peso: 2 },
            { termo: 'antivirus', peso: 2 },
            { termo: 'programação', peso: 2 },
            { termo: 'aplicativo', peso: 2 },
            { termo: 'website', peso: 2 },
            { termo: 'portal web', peso: 2 },
            { termo: 'hosting', peso: 2 },
            { termo: 'hospedagem de site', peso: 2 },
            { termo: 'switch de rede', peso: 2 },
            { termo: 'roteador', peso: 2 },
            { termo: 'storage', peso: 2 },
            { termo: 'erp', peso: 2 },
            { termo: 'crm', peso: 2 },
            { termo: 'saas', peso: 2 },
            // Peso 1 - Genéricos (precisam de outros termos)
            { termo: 'rede de dados', peso: 1 },
            { termo: 'cloud', peso: 1 },
            { termo: 'nuvem', peso: 1 },
            { termo: 'backup', peso: 1 },
            { termo: 'servidor', peso: 1 },
            { termo: 'ti ', peso: 1 },
        ],
        exclusoes: ['ar condicionado', 'climatização', 'refrigeração'],
        scoreMinimo: 3
    },

    'Engenharia e Obras': {
        termos: [
            // Peso 3 - Muito específicos
            { termo: 'obra de engenharia', peso: 3 },
            { termo: 'construção civil', peso: 3 },
            { termo: 'pavimentação asfáltica', peso: 3 },
            { termo: 'pavimentação de via', peso: 3 },
            { termo: 'terraplanagem', peso: 3 },
            { termo: 'edificação', peso: 3 },
            { termo: 'construção de prédio', peso: 3 },
            { termo: 'reforma predial', peso: 3 },
            { termo: 'recuperação de prédio', peso: 3 },
            { termo: 'manutenção predial', peso: 3 },
            { termo: 'estrutura metálica', peso: 3 },
            { termo: 'estrutura de concreto', peso: 3 },
            { termo: 'fundação de obra', peso: 3 },
            { termo: 'saneamento básico', peso: 3 },
            { termo: 'rede de esgoto', peso: 3 },
            { termo: 'rede de água', peso: 3 },
            { termo: 'drenagem pluvial', peso: 3 },
            { termo: 'impermeabilização', peso: 3 },
            // Peso 2 - Moderados
            { termo: 'construção', peso: 2 },
            { termo: 'obra', peso: 2 },
            { termo: 'reforma', peso: 2 },
            { termo: 'pavimentação', peso: 2 },
            { termo: 'engenharia civil', peso: 2 },
            { termo: 'alvenaria', peso: 2 },
            { termo: 'concreto armado', peso: 2 },
            { termo: 'instalação hidráulica', peso: 2 },
            { termo: 'instalação elétrica predial', peso: 2 },
            { termo: 'pintura de parede', peso: 2 },
            { termo: 'pintura predial', peso: 2 },
            { termo: 'ponte', peso: 2 },
            { termo: 'viaduto', peso: 2 },
            // Peso 1 - Genéricos (evitar sozinhos)
            { termo: 'engenharia', peso: 1 },
            { termo: 'arquitetura', peso: 1 },
            { termo: 'projeto', peso: 1 },
            { termo: 'fundação', peso: 1 },
            { termo: 'hidráulica', peso: 1 },
            { termo: 'elétrica', peso: 1 },
            { termo: 'drenagem', peso: 1 },
            { termo: 'estrada', peso: 1 },
            { termo: 'pintura', peso: 1 },
        ],
        exclusoes: ['evento', 'carnaval', 'festa', 'show', 'palco', 'trio elétrico', 'som', 'iluminação de palco', 'cenário', 'decoração de festa', 'bombeiro', 'brigadista'],
        scoreMinimo: 3
    },

    'Saúde': {
        termos: [
            // Peso 3 - Muito específicos
            { termo: 'medicamento', peso: 3 },
            { termo: 'produto farmacêutico', peso: 3 },
            { termo: 'material hospitalar', peso: 3 },
            { termo: 'equipamento hospitalar', peso: 3 },
            { termo: 'material cirúrgico', peso: 3 },
            { termo: 'equipamento médico', peso: 3 },
            { termo: 'equipamento laboratorial', peso: 3 },
            { termo: 'unidade básica de saúde', peso: 3 },
            { termo: 'ubs', peso: 3 },
            { termo: 'pronto socorro', peso: 3 },
            { termo: 'uti', peso: 3 },
            { termo: 'centro cirúrgico', peso: 3 },
            { termo: 'ambulância', peso: 3 },
            { termo: 'serviço de saúde', peso: 3 },
            // Peso 2 - Moderados
            { termo: 'hospital', peso: 2 },
            { termo: 'hospitalar', peso: 2 },
            { termo: 'farmacêutico', peso: 2 },
            { termo: 'médico', peso: 2 },
            { termo: 'enfermagem', peso: 2 },
            { termo: 'cirúrgico', peso: 2 },
            { termo: 'laboratorial', peso: 2 },
            { termo: 'diagnóstico', peso: 2 },
            { termo: 'vacina', peso: 2 },
            { termo: 'clínica', peso: 2 },
            { termo: 'odontológico', peso: 2 },
            { termo: 'fisioterapia', peso: 2 },
            // Peso 1 - Genéricos
            { termo: 'saúde', peso: 1 },
            { termo: 'exame', peso: 1 },
            { termo: 'tratamento', peso: 1 },
        ],
        exclusoes: ['saúde financeira', 'saúde do servidor', 'saúde ocupacional'],
        scoreMinimo: 3
    },

    'Educação': {
        termos: [
            // Peso 3 - Muito específicos
            { termo: 'material didático', peso: 3 },
            { termo: 'material pedagógico', peso: 3 },
            { termo: 'material escolar', peso: 3 },
            { termo: 'merenda escolar', peso: 3 },
            { termo: 'transporte escolar', peso: 3 },
            { termo: 'uniforme escolar', peso: 3 },
            { termo: 'mobiliário escolar', peso: 3 },
            { termo: 'construção de escola', peso: 3 },
            { termo: 'reforma de escola', peso: 3 },
            // Peso 2 - Moderados
            { termo: 'escola', peso: 2 },
            { termo: 'educação', peso: 2 },
            { termo: 'ensino', peso: 2 },
            { termo: 'pedagógico', peso: 2 },
            { termo: 'escolar', peso: 2 },
            { termo: 'creche', peso: 2 },
            { termo: 'universidade', peso: 2 },
            { termo: 'faculdade', peso: 2 },
            { termo: 'biblioteca', peso: 2 },
            { termo: 'livro didático', peso: 2 },
            // Peso 1 - Genéricos
            { termo: 'professor', peso: 1 },
            { termo: 'capacitação', peso: 1 },
            { termo: 'treinamento', peso: 1 },
            { termo: 'curso', peso: 1 },
            { termo: 'livro', peso: 1 },
        ],
        exclusoes: ['educação financeira'],
        scoreMinimo: 3
    },

    'Alimentação': {
        termos: [
            // Peso 3 - Muito específicos
            { termo: 'gênero alimentício', peso: 3 },
            { termo: 'refeição preparada', peso: 3 },
            { termo: 'fornecimento de refeição', peso: 3 },
            { termo: 'merenda escolar', peso: 3 },
            { termo: 'kit alimentação', peso: 3 },
            { termo: 'cesta básica', peso: 3 },
            // Peso 2 - Moderados
            { termo: 'alimentação', peso: 2 },
            { termo: 'refeição', peso: 2 },
            { termo: 'alimento', peso: 2 },
            { termo: 'cozinha industrial', peso: 2 },
            { termo: 'restaurante', peso: 2 },
            { termo: 'hortifruti', peso: 2 },
            { termo: 'hortifrutigranjeiro', peso: 2 },
            // Peso 1 - Genéricos
            { termo: 'carne', peso: 1 },
            { termo: 'leite', peso: 1 },
            { termo: 'pão', peso: 1 },
            { termo: 'frutas', peso: 1 },
            { termo: 'verduras', peso: 1 },
            { termo: 'legumes', peso: 1 },
            { termo: 'lanche', peso: 1 },
            { termo: 'café', peso: 1 },
            { termo: 'água mineral', peso: 1 },
            { termo: 'bebida', peso: 1 },
        ],
        exclusoes: [],
        scoreMinimo: 3
    },

    'Veículos e Transporte': {
        termos: [
            // Peso 3 - Muito específicos
            { termo: 'aquisição de veículo', peso: 3 },
            { termo: 'locação de veículo', peso: 3 },
            { termo: 'manutenção de veículo', peso: 3 },
            { termo: 'manutenção veicular', peso: 3 },
            { termo: 'peça automotiva', peso: 3 },
            { termo: 'serviço de frete', peso: 3 },
            { termo: 'transporte de passageiro', peso: 3 },
            { termo: 'transporte escolar', peso: 3 },
            { termo: 'gestão de frota', peso: 3 },
            // Peso 2 - Moderados
            { termo: 'veículo', peso: 2 },
            { termo: 'automóvel', peso: 2 },
            { termo: 'carro', peso: 2 },
            { termo: 'caminhão', peso: 2 },
            { termo: 'ônibus', peso: 2 },
            { termo: 'motocicleta', peso: 2 },
            { termo: 'combustível', peso: 2 },
            { termo: 'gasolina', peso: 2 },
            { termo: 'diesel', peso: 2 },
            { termo: 'etanol', peso: 2 },
            { termo: 'frota', peso: 2 },
            // Peso 1 - Genéricos
            { termo: 'transporte', peso: 1 },
            { termo: 'frete', peso: 1 },
            { termo: 'pneu', peso: 1 },
        ],
        exclusoes: ['transporte de dados', 'transporte de informação'],
        scoreMinimo: 3
    },

    'Limpeza e Conservação': {
        termos: [
            // Peso 3 - Muito específicos
            { termo: 'serviço de limpeza', peso: 3 },
            { termo: 'limpeza predial', peso: 3 },
            { termo: 'limpeza hospitalar', peso: 3 },
            { termo: 'material de limpeza', peso: 3 },
            { termo: 'produto de limpeza', peso: 3 },
            { termo: 'coleta de lixo', peso: 3 },
            { termo: 'coleta de resíduo', peso: 3 },
            { termo: 'manutenção de área verde', peso: 3 },
            { termo: 'controle de pragas', peso: 3 },
            // Peso 2 - Moderados
            { termo: 'limpeza', peso: 2 },
            { termo: 'conservação', peso: 2 },
            { termo: 'higienização', peso: 2 },
            { termo: 'zeladoria', peso: 2 },
            { termo: 'jardinagem', peso: 2 },
            { termo: 'paisagismo', peso: 2 },
            { termo: 'dedetização', peso: 2 },
            { termo: 'desratização', peso: 2 },
            // Peso 1 - Genéricos
            { termo: 'resíduo', peso: 1 },
        ],
        exclusoes: ['limpeza de dados', 'conservação de documento'],
        scoreMinimo: 3
    },

    'Segurança': {
        termos: [
            // Peso 3 - Muito específicos
            { termo: 'vigilância patrimonial', peso: 3 },
            { termo: 'segurança patrimonial', peso: 3 },
            { termo: 'vigilância armada', peso: 3 },
            { termo: 'vigilância desarmada', peso: 3 },
            { termo: 'monitoramento eletrônico', peso: 3 },
            { termo: 'controle de acesso', peso: 3 },
            { termo: 'sistema de alarme', peso: 3 },
            { termo: 'cerca elétrica', peso: 3 },
            // Peso 2 - Moderados
            { termo: 'vigilância', peso: 2 },
            { termo: 'cftv', peso: 2 },
            { termo: 'câmera de segurança', peso: 2 },
            { termo: 'portaria', peso: 2 },
            { termo: 'guarda', peso: 2 },
            // Peso 1 - Genéricos
            { termo: 'monitoramento', peso: 1 },
            { termo: 'alarme', peso: 1 },
            { termo: 'câmera', peso: 1 },
        ],
        exclusoes: ['segurança da informação', 'segurança de ti', 'segurança do trabalho', 'segurança alimentar'],
        scoreMinimo: 3
    },

    'Mobiliário e Equipamentos': {
        termos: [
            // Peso 3 - Muito específicos
            { termo: 'mobiliário de escritório', peso: 3 },
            { termo: 'mobiliário escolar', peso: 3 },
            { termo: 'móvel de escritório', peso: 3 },
            { termo: 'ar condicionado', peso: 3 },
            { termo: 'sistema de climatização', peso: 3 },
            // Peso 2 - Moderados
            { termo: 'mobiliário', peso: 2 },
            { termo: 'móvel', peso: 2 },
            { termo: 'cadeira', peso: 2 },
            { termo: 'mesa de escritório', peso: 2 },
            { termo: 'armário', peso: 2 },
            { termo: 'estante', peso: 2 },
            { termo: 'climatização', peso: 2 },
            { termo: 'eletrodoméstico', peso: 2 },
            // Peso 1 - Genéricos
            { termo: 'equipamento', peso: 1 },
            { termo: 'máquina', peso: 1 },
            { termo: 'ferramenta', peso: 1 },
            { termo: 'mesa', peso: 1 },
        ],
        exclusoes: ['equipamento hospitalar', 'equipamento médico', 'equipamento de ti', 'equipamento de informática'],
        scoreMinimo: 3
    },

    'Comunicação e Marketing': {
        termos: [
            // Peso 3 - Muito específicos
            { termo: 'serviço de publicidade', peso: 3 },
            { termo: 'campanha publicitária', peso: 3 },
            { termo: 'assessoria de imprensa', peso: 3 },
            { termo: 'produção de vídeo', peso: 3 },
            { termo: 'material gráfico', peso: 3 },
            { termo: 'serviço gráfico', peso: 3 },
            { termo: 'organização de evento', peso: 3 },
            // Peso 2 - Moderados
            { termo: 'publicidade', peso: 2 },
            { termo: 'propaganda', peso: 2 },
            { termo: 'marketing', peso: 2 },
            { termo: 'comunicação social', peso: 2 },
            { termo: 'mídia', peso: 2 },
            { termo: 'impressão gráfica', peso: 2 },
            { termo: 'gráfica', peso: 2 },
            { termo: 'banner', peso: 2 },
            { termo: 'outdoor', peso: 2 },
            { termo: 'cerimonial', peso: 2 },
            // Peso 1 - Genéricos
            { termo: 'evento', peso: 1 },
            { termo: 'impressão', peso: 1 },
            { termo: 'comunicação', peso: 1 },
        ],
        exclusoes: ['comunicação de dados', 'rede de comunicação'],
        scoreMinimo: 3
    },

    'Jurídico e Contábil': {
        termos: [
            // Peso 3 - Muito específicos
            { termo: 'serviço jurídico', peso: 3 },
            { termo: 'assessoria jurídica', peso: 3 },
            { termo: 'consultoria jurídica', peso: 3 },
            { termo: 'serviço de advocacia', peso: 3 },
            { termo: 'serviço contábil', peso: 3 },
            { termo: 'consultoria contábil', peso: 3 },
            { termo: 'auditoria contábil', peso: 3 },
            { termo: 'perícia contábil', peso: 3 },
            // Peso 2 - Moderados
            { termo: 'jurídico', peso: 2 },
            { termo: 'advocacia', peso: 2 },
            { termo: 'advogado', peso: 2 },
            { termo: 'contábil', peso: 2 },
            { termo: 'contabilidade', peso: 2 },
            { termo: 'auditoria', peso: 2 },
            { termo: 'perícia', peso: 2 },
            // Peso 1 - Genéricos
            { termo: 'fiscal', peso: 1 },
        ],
        exclusoes: ['auditoria de sistema', 'auditoria de ti'],
        scoreMinimo: 3
    },

    'Recursos Humanos': {
        termos: [
            // Peso 3 - Muito específicos
            { termo: 'gestão de recursos humanos', peso: 3 },
            { termo: 'folha de pagamento', peso: 3 },
            { termo: 'terceirização de mão de obra', peso: 3 },
            { termo: 'gestão de pessoal', peso: 3 },
            { termo: 'recrutamento e seleção', peso: 3 },
            // Peso 2 - Moderados
            { termo: 'recursos humanos', peso: 2 },
            { termo: 'mão de obra', peso: 2 },
            { termo: 'recrutamento', peso: 2 },
            { termo: 'seleção de pessoal', peso: 2 },
            // Peso 1 - Genéricos
            { termo: 'rh', peso: 1 },
            { termo: 'seleção', peso: 1 },
        ],
        exclusoes: [],
        scoreMinimo: 3
    },
};

// Extrai a área de atuação principal da licitação usando sistema de scoring
function extractAreaAtuacao(objeto: string): string {
    const objetoLower = objeto.toLowerCase();

    let melhorCategoria = 'Outros';
    let melhorScore = 0;

    for (const [categoria, config] of Object.entries(CATEGORIAS_CONFIG)) {
        // Verificar exclusões primeiro - se encontrar, pular esta categoria
        const temExclusao = config.exclusoes.some(exclusao =>
            objetoLower.includes(exclusao.toLowerCase())
        );
        if (temExclusao) continue;

        // Calcular score somando pesos dos termos encontrados
        let score = 0;
        let termosEncontrados = 0;

        for (const { termo, peso } of config.termos) {
            if (objetoLower.includes(termo.toLowerCase())) {
                score += peso;
                termosEncontrados++;
            }
        }

        // Verificar se atinge o score mínimo e é melhor que o atual
        if (score >= config.scoreMinimo && score > melhorScore) {
            melhorScore = score;
            melhorCategoria = categoria;
        }
    }

    return melhorCategoria;
}

// Limite máximo da API do PNCP
const PNCP_MAX_PAGE_SIZE = 50;

// Função auxiliar para fetch com retry e timeout
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 2,
    timeoutMs: number = 15000
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Se não for última tentativa, aguardar antes de retry (backoff exponencial)
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 500; // 500ms, 1000ms, 2000ms...
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error('Fetch failed after retries');
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
        : TODAS_MODALIDADES;

    const allData: PNCPContratacao[] = [];
    let totalRegistros = 0;
    let totalPaginasMax = 1;
    let errosModalidades: string[] = [];

    // Buscar todas as modalidades em paralelo para melhor performance
    const fetchPromises = modalidades.map(async (modalidade) => {
        try {
            const searchParams = new URLSearchParams({
                dataInicial: params.dataInicial,
                dataFinal: params.dataFinal,
                pagina: String(params.pagina || 1),
                tamanhoPagina: String(PNCP_MAX_PAGE_SIZE),
                codigoModalidadeContratacao: String(modalidade),
            });

            if (params.ufSigla) {
                searchParams.append('ufSigla', params.ufSigla);
            }

            const url = `${PNCP_BASE_URL}/contratacoes/publicacao?${searchParams.toString()}`;

            const response = await fetchWithRetry(url, {
                headers: {
                    'Accept': 'application/json',
                },
                cache: 'no-store',
            });

            if (response.ok) {
                const text = await response.text();
                if (!text || text.trim() === '') {
                    console.warn(`[PNCP] Empty response for modalidade ${modalidade}`);
                    return { modalidade, data: [], totalRegistros: 0, totalPaginas: 1, success: true };
                }
                try {
                    const rawData = JSON.parse(text);
                    return {
                        modalidade,
                        data: rawData.data || [],
                        totalRegistros: rawData.totalRegistros || 0,
                        totalPaginas: rawData.totalPaginas || 1,
                        success: true,
                    };
                } catch (parseError) {
                    console.error(`[PNCP] JSON parse error for modalidade ${modalidade}:`, parseError);
                    return { modalidade, data: [], totalRegistros: 0, totalPaginas: 1, success: false, error: 'JSON parse error' };
                }
            }
            console.error(`[PNCP] Response ${response.status} for modalidade ${modalidade}`);
            return { modalidade, data: [], totalRegistros: 0, totalPaginas: 1, success: false, error: `HTTP ${response.status}` };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Erro ao buscar modalidade ${modalidade}:`, errorMsg);
            return { modalidade, data: [], totalRegistros: 0, totalPaginas: 1, success: false, error: errorMsg };
        }
    });

    // Usar Promise.allSettled para capturar todos os resultados (sucesso e falha)
    const settledResults = await Promise.allSettled(fetchPromises);

    // Processar resultados na ordem das modalidades (determinístico)
    for (let i = 0; i < settledResults.length; i++) {
        const settled = settledResults[i];
        const modalidade = modalidades[i];

        if (settled.status === 'fulfilled') {
            const result = settled.value;
            if (result.data && Array.isArray(result.data)) {
                allData.push(...result.data);
                totalRegistros += result.totalRegistros;
                totalPaginasMax = Math.max(totalPaginasMax, result.totalPaginas);
            }
            if (!result.success && result.error) {
                errosModalidades.push(`Modalidade ${modalidade}: ${result.error}`);
            }
        } else {
            errosModalidades.push(`Modalidade ${modalidade}: ${settled.reason}`);
        }
    }

    // Log de erros para diagnóstico (se houver)
    if (errosModalidades.length > 0) {
        console.warn(`[PNCP] Erros em ${errosModalidades.length} modalidade(s):`, errosModalidades);
    }

    // ORDENAÇÃO DETERMINÍSTICA: garantir mesma ordem sempre
    // Ordena por: dataPublicacaoPncp (DESC) -> anoCompra (DESC) -> sequencialCompra (DESC) -> CNPJ (ASC)
    allData.sort((a, b) => {
        // 1. Data de publicação (mais recente primeiro)
        const dataComp = (b.dataPublicacaoPncp || '').localeCompare(a.dataPublicacaoPncp || '');
        if (dataComp !== 0) return dataComp;

        // 2. Ano da compra (mais recente primeiro)
        const anoComp = (b.anoCompra || 0) - (a.anoCompra || 0);
        if (anoComp !== 0) return anoComp;

        // 3. Sequencial da compra (maior primeiro)
        const seqComp = (b.sequencialCompra || 0) - (a.sequencialCompra || 0);
        if (seqComp !== 0) return seqComp;

        // 4. CNPJ do órgão (ordem alfabética para desempate final)
        return (a.orgaoEntidade?.cnpj || '').localeCompare(b.orgaoEntidade?.cnpj || '');
    });

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
