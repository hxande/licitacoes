export type NivelRisco = 'baixo' | 'medio' | 'alto';

export interface ItemRisco {
    id: string;
    tipo: TipoRisco;
    titulo: string;
    descricao: string;
    severidade: NivelRisco;
    recomendacao?: string;
}

export type TipoRisco =
    | 'clausula_restritiva'
    | 'requisito_tecnico'
    | 'prazo'
    | 'garantia'
    | 'penalidade'
    | 'financeiro'
    | 'juridico'
    | 'outros';

export interface AnaliseRisco {
    id: string;
    licitacaoId: string;
    scoreGeral: number; // 0-100 (quanto maior, mais arriscado)
    nivelRisco: NivelRisco;
    resumo: string;
    itensRisco: ItemRisco[];
    pontosPositivos: string[];
    recomendacaoGeral: string;
    analisadoEm: string;
}

export const TIPOS_RISCO: Record<TipoRisco, { label: string; icone: string }> = {
    clausula_restritiva: { label: 'Cláusula Restritiva', icone: '⚠️' },
    requisito_tecnico: { label: 'Requisito Técnico', icone: '🔧' },
    prazo: { label: 'Prazo', icone: '⏰' },
    garantia: { label: 'Garantia', icone: '🛡️' },
    penalidade: { label: 'Penalidade', icone: '⚖️' },
    financeiro: { label: 'Financeiro', icone: '💰' },
    juridico: { label: 'Jurídico', icone: '📜' },
    outros: { label: 'Outros', icone: '📋' },
};

export const NIVEL_RISCO_CONFIG: Record<NivelRisco, { label: string; cor: string; bgCor: string }> = {
    baixo: { label: 'Baixo', cor: 'text-green-700', bgCor: 'bg-green-100' },
    medio: { label: 'Médio', cor: 'text-yellow-700', bgCor: 'bg-yellow-100' },
    alto: { label: 'Alto', cor: 'text-red-700', bgCor: 'bg-red-100' },
};
