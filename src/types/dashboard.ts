export interface EstatisticasGerais {
    totalLicitacoes: number;
    valorTotalEstimado: number;
    valorMedio: number;
    licitacoesAbertas: number;
    orgaosUnicos: number;
    estadosAtivos: number;
}

export interface DadosPorUF {
    uf: string;
    quantidade: number;
    valorTotal: number;
    valorMedio: number;
}

export interface DadosPorModalidade {
    modalidade: string;
    quantidade: number;
    valorTotal: number;
    percentual: number;
}

export interface DadosPorArea {
    area: string;
    quantidade: number;
    valorTotal: number;
    percentual: number;
}

export interface DadosPorOrgao {
    orgao: string;
    cnpj: string;
    uf: string;
    quantidade: number;
    valorTotal: number;
}

export interface TendenciaTemporal {
    data: string;
    mes: string;
    quantidade: number;
    valorTotal: number;
}

export interface DadosSazonalidade {
    mes: string;
    mesNumero: number;
    quantidade: number;
    valorMedio: number;
}

export interface DashboardData {
    estatisticas: EstatisticasGerais;
    porUF: DadosPorUF[];
    porModalidade: DadosPorModalidade[];
    porArea: DadosPorArea[];
    topOrgaos: DadosPorOrgao[];
    tendencia: TendenciaTemporal[];
    sazonalidade: DadosSazonalidade[];
    periodo: {
        inicio: string;
        fim: string;
    };
}
