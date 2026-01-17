// Tipos para dados históricos salvos localmente

export interface ContratoHistorico {
    id: string;
    cnpjOrgao: string;
    orgao: string;
    uf: string;
    municipio?: string;
    objeto: string;
    fornecedorCnpj: string;
    fornecedorNome: string;
    valorContratado: number;
    dataAssinatura: string;
    dataPublicacao: string;
    tipoContrato: string;
    areaAtuacao: string;
    palavrasChave: string[];
}

export interface LicitacaoHistorica {
    id: string;
    cnpjOrgao: string;
    orgao: string;
    uf: string;
    municipio?: string;
    objeto: string;
    modalidade: string;
    valorEstimado?: number;
    valorHomologado?: number;
    dataPublicacao: string;
    dataAbertura?: string;
    situacao: string;
    areaAtuacao: string;
    palavrasChave: string[];
    temResultado: boolean;
}

export interface DadosHistoricos {
    ultimaAtualizacao: string;
    totalContratos: number;
    totalLicitacoes: number;
    periodoInicio: string;
    periodoFim: string;
    contratos: ContratoHistorico[];
    licitacoes: LicitacaoHistorica[];
}

export interface EstatisticasFornecedor {
    cnpj: string;
    nome: string;
    totalContratos: number;
    valorTotal: number;
    valorMedio: number;
    areasAtuacao: string[];
    orgaosAtendidos: string[];
    ufsAtuacao: string[];
}

export interface EstatisticasOrgao {
    cnpj: string;
    nome: string;
    uf: string;
    totalLicitacoes: number;
    totalContratos: number;
    valorTotalContratado: number;
    principaisFornecedores: string[];
    areasContratadas: string[];
}

export interface AnaliseMercado {
    totalContratosAnalisados: number;
    totalLicitacoesAnalisadas: number;
    periodoAnalise: { inicio: string; fim: string };
    faixaPrecos: {
        minimo: number;
        maximo: number;
        media: number;
        mediana: number;
    };
    principaisFornecedores: EstatisticasFornecedor[];
    concentracaoMercado: number; // % dos top 5 fornecedores
    insights: string[];
    recomendacoes: string[];
}
