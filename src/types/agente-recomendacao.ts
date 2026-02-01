export interface RecomendacaoLicitacao {
    licitacaoId: string;
    objeto: string;
    orgao: string;
    uf: string;
    municipio?: string;
    modalidade: string;
    valorEstimado?: number;
    dataAbertura?: string;
    
    // Análise do agente
    scoreCompatibilidade: number;
    nivel: 'Excelente' | 'Bom' | 'Moderado' | 'Baixo';
    motivosMatch: string[];
    alertas: string[];
    estrategiaSugerida: string;
    prioridade: 'Alta' | 'Média' | 'Baixa';
}

export interface AnaliseAgente {
    // Resumo executivo
    resumoGeral: string;
    totalAnalisadas: number;
    totalRecomendadas: number;
    
    // Recomendações ordenadas por score
    recomendacoes: RecomendacaoLicitacao[];
    
    // Insights do agente
    insights: {
        oportunidadesDestaque: string[];
        tendenciasMercado: string[];
        alertasGerais: string[];
        sugestoesPerfilEmpresa: string[];
    };
    
    // Metadata
    dataAnalise: string;
    versaoAgente: string;
}

export interface ConfiguracaoAgente {
    // Quantidade máxima de licitações para analisar
    maxLicitacoesAnalise?: number;
    
    // Score mínimo para incluir na recomendação
    scoreMinimo?: number;
    
    // Priorizar por valor, data ou compatibilidade
    ordenarPor?: 'compatibilidade' | 'valor' | 'dataAbertura';
    
    // Filtros adicionais
    filtros?: {
        apenasNovasUltimas24h?: boolean;
        excluirModalidades?: number[];
        valorMaximoAbsoluto?: number;
    };
}

export interface RequestAgente {
    configuracao?: ConfiguracaoAgente;
}

export interface ResponseAgente {
    success: boolean;
    data?: AnaliseAgente;
    error?: string;
}
