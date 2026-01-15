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
    valorEstimado?: number;
    situacao: string;
    linkEdital?: string;
    fonte: 'PNCP' | 'COMPRASNET';
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
    1: 'Leilão - Lei 14.133/2021',
    2: 'Diálogo Competitivo',
    3: 'Concurso',
    4: 'Concorrência - Lei 14.133/2021',
    5: 'Pregão - Lei 14.133/2021',
    6: 'Dispensa de Licitação',
    7: 'Inexigibilidade',
    8: 'Pregão - Lei 10.520/2002',
    9: 'Concorrência - Lei 8.666/1993',
    10: 'Tomada de Preços - Lei 8.666/1993',
    11: 'Convite - Lei 8.666/1993',
    12: 'Leilão - Lei 8.666/1993',
    13: 'Manifestação de Interesse',
    14: 'Pré-qualificação',
    15: 'Credenciamento',
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
