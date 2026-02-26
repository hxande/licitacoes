export interface Licitacao {
    id: string;
    orgao: string;
    cnpjOrgao: string;
    uf: string;
    municipio?: string;
    objeto: string;
    modalidade: string;
    dataPublicacao: string;
    dataAbertura?: string;
    dataEncerramento?: string;
    valorEstimado?: number;
    situacao: string;
    linkEdital?: string;
    fonte: 'PNCP' | 'COMPRASNET' | 'SESI' | 'SENAI' | 'SENAC';
    areaAtuacao: string;
    categorias?: string[];
}

export interface FiltrosLicitacao {
    termo?: string;
    uf?: string;
    modalidade?: string;
    area?: string;
    dataInicio?: string;
    dataFim?: string;
    valorMinimo?: number;
    valorMaximo?: number;
    fontes?: string[];
}

export interface PNCPItem {
    numeroItem: number;
    descricao: string;
    materialOuServico?: string; // 'M' = material, 'S' = serviço
    quantidade?: number;
    unidadeMedida?: string;
    valorUnitarioEstimado?: number;
    valorTotal?: number;
    criterioJulgamentoNome?: string;
}

export interface PNCPContratacao {
    orgaoEntidade: {
        cnpj: string;
        razaoSocial: string;
        poderId: string;
        esferaId: string;
    };
    unidadeOrgao: {
        ufNome: string;
        ufSigla: string;
        municipioNome?: string;
        codigoUnidade: string;
        nomeUnidade: string;
    };
    anoCompra: number;
    sequencialCompra: number;
    numeroCompra: string;
    objetoCompra: string;
    informacaoComplementar?: string;
    modalidadeId: number;
    modalidadeNome: string;
    situacaoCompraId: number;
    situacaoCompraNome: string;
    dataPublicacaoPncp: string;
    dataAberturaProposta?: string;
    dataEncerramentoProposta?: string;
    valorTotalEstimado?: number;
    valorTotalHomologado?: number;
    linkSistemaOrigem?: string;
    justificativaPresencial?: string;
    srp: boolean;
    existeResultado: boolean;
    dataInclusao: string;
    dataAtualizacao: string;
}

export interface PNCPResponse {
    data: PNCPContratacao[];
    paginaAtual: number;
    totalPaginas: number;
    totalRegistros: number;
    itensPorPagina: number;
    temMaisPaginas: boolean;
}

export const MODALIDADES: Record<number, string> = {
    1: 'Leilão - Eletrônico',
    2: 'Diálogo Competitivo',
    3: 'Concurso',
    4: 'Concorrência - Eletrônica',
    5: 'Concorrência - Presencial',
    6: 'Pregão - Eletrônico',
    7: 'Pregão - Presencial',
    8: 'Dispensa de Licitação',
    9: 'Inexigibilidade',
    10: 'Manifestação de Interesse',
    11: 'Pré-qualificação',
    12: 'Credenciamento',
    13: 'Leilão - Presencial',
};

export const UFS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const AREAS_ATUACAO = [
    'Tecnologia da Informação',
    'Engenharia e Obras',
    'Saúde',
    'Educação',
    'Alimentação',
    'Veículos e Transporte',
    'Limpeza e Conservação',
    'Segurança',
    'Mobiliário e Equipamentos',
    'Comunicação e Marketing',
    'Jurídico e Contábil',
    'Recursos Humanos',
    'Outros',
];
