export interface ResumoEdital {
    objetoResumido: string;
    requisitosHabilitacao: string[];
    criteriosJulgamento: string;
    prazosImportantes: {
        descricao: string;
        data?: string;
    }[];
    valorEstimado?: string;
    observacoesAdicionais?: string[];
}
