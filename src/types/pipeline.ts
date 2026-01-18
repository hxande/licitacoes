// Tipos para o Pipeline de Licitações

export type StatusPipeline =
    | 'encontrada'
    | 'analisando'
    | 'proposta_enviada'
    | 'aguardando'
    | 'ganha'
    | 'perdida';

export interface LicitacaoPipeline {
    id: string;
    objeto: string;
    orgao: string;
    uf: string;
    valorEstimado?: number;
    dataAbertura?: string;
    status: StatusPipeline;
    criadoEm: string;
    atualizadoEm: string;
    observacoes?: string;
    // Dados opcionais para referência
    modalidade?: string;
    cnpjOrgao?: string;
}

export interface ColunaPipeline {
    id: StatusPipeline;
    titulo: string;
    cor: string;
    bgColor: string;
}

export const COLUNAS_PIPELINE: ColunaPipeline[] = [
    { id: 'encontrada', titulo: 'Encontrada', cor: 'text-blue-600', bgColor: 'bg-blue-50' },
    { id: 'analisando', titulo: 'Analisando', cor: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { id: 'proposta_enviada', titulo: 'Proposta Enviada', cor: 'text-purple-600', bgColor: 'bg-purple-50' },
    { id: 'aguardando', titulo: 'Aguardando', cor: 'text-orange-600', bgColor: 'bg-orange-50' },
    { id: 'ganha', titulo: 'Ganha', cor: 'text-green-600', bgColor: 'bg-green-50' },
    { id: 'perdida', titulo: 'Perdida', cor: 'text-red-600', bgColor: 'bg-red-50' },
];
