export interface DocumentoChecklist {
    id: string;
    nome: string;
    descricao?: string;
    categoria: CategoriaDocumento;
    obrigatorio: boolean;
    status: StatusDocumento;
    dataValidade?: string; // ISO date
    observacoes?: string;
    ordem: number;
}

export type CategoriaDocumento =
    | 'habilitacao_juridica'
    | 'regularidade_fiscal'
    | 'qualificacao_tecnica'
    | 'qualificacao_economica'
    | 'declaracoes'
    | 'proposta'
    | 'outros';

export type StatusDocumento = 'pendente' | 'pronto' | 'vencido' | 'vencendo';

export interface Checklist {
    id: string;
    licitacaoId?: string;
    titulo: string;
    orgao?: string;
    objeto?: string;
    dataAbertura?: string;
    documentos: DocumentoChecklist[];
    criadoEm: string;
    atualizadoEm: string;
}

export interface ChecklistSummary {
    total: number;
    prontos: number;
    pendentes: number;
    vencidos: number;
    vencendo: number; // próximos 7 dias
    percentualConcluido: number;
}

export const CATEGORIAS_DOCUMENTO: Record<CategoriaDocumento, string> = {
    habilitacao_juridica: 'Habilitação Jurídica',
    regularidade_fiscal: 'Regularidade Fiscal e Trabalhista',
    qualificacao_tecnica: 'Qualificação Técnica',
    qualificacao_economica: 'Qualificação Econômico-Financeira',
    declaracoes: 'Declarações',
    proposta: 'Proposta',
    outros: 'Outros Documentos',
};

export const STATUS_DOCUMENTO: Record<StatusDocumento, { label: string; cor: string }> = {
    pendente: { label: 'Pendente', cor: 'gray' },
    pronto: { label: 'Pronto', cor: 'green' },
    vencido: { label: 'Vencido', cor: 'red' },
    vencendo: { label: 'Vencendo', cor: 'yellow' },
};

// Documentos comuns em licitações para sugestão padrão
export const DOCUMENTOS_COMUNS: Omit<DocumentoChecklist, 'id' | 'status' | 'ordem'>[] = [
    // Habilitação Jurídica
    { nome: 'Contrato Social e Alterações', categoria: 'habilitacao_juridica', obrigatorio: true, descricao: 'Ou documento equivalente (estatuto, ata de eleição)' },
    { nome: 'Documento de Identidade do Representante', categoria: 'habilitacao_juridica', obrigatorio: true },
    { nome: 'Procuração (se aplicável)', categoria: 'habilitacao_juridica', obrigatorio: false },

    // Regularidade Fiscal
    { nome: 'CNPJ - Cartão de Inscrição', categoria: 'regularidade_fiscal', obrigatorio: true },
    { nome: 'Inscrição Estadual', categoria: 'regularidade_fiscal', obrigatorio: false },
    { nome: 'Inscrição Municipal', categoria: 'regularidade_fiscal', obrigatorio: false },
    { nome: 'CND Federal (Tributos e Dívida Ativa)', categoria: 'regularidade_fiscal', obrigatorio: true, descricao: 'Certidão Negativa de Débitos Federais' },
    { nome: 'CND Estadual', categoria: 'regularidade_fiscal', obrigatorio: true, descricao: 'Certidão Negativa de Débitos Estaduais' },
    { nome: 'CND Municipal', categoria: 'regularidade_fiscal', obrigatorio: true, descricao: 'Certidão Negativa de Débitos Municipais' },
    { nome: 'CRF - FGTS', categoria: 'regularidade_fiscal', obrigatorio: true, descricao: 'Certificado de Regularidade do FGTS' },
    { nome: 'CNDT - Débitos Trabalhistas', categoria: 'regularidade_fiscal', obrigatorio: true, descricao: 'Certidão Negativa de Débitos Trabalhistas' },

    // Qualificação Econômico-Financeira
    { nome: 'Balanço Patrimonial', categoria: 'qualificacao_economica', obrigatorio: true, descricao: 'Último exercício social' },
    { nome: 'Certidão Negativa de Falência', categoria: 'qualificacao_economica', obrigatorio: true },

    // Qualificação Técnica
    { nome: 'Atestado de Capacidade Técnica', categoria: 'qualificacao_tecnica', obrigatorio: true, descricao: 'Comprovando experiência anterior' },
    { nome: 'Registro no Conselho Profissional', categoria: 'qualificacao_tecnica', obrigatorio: false, descricao: 'CRA, CREA, CRC, etc.' },

    // Declarações
    { nome: 'Declaração de Inexistência de Fatos Impeditivos', categoria: 'declaracoes', obrigatorio: true },
    { nome: 'Declaração de Menor', categoria: 'declaracoes', obrigatorio: true, descricao: 'Não emprega menor de 18 anos em trabalho noturno, perigoso ou insalubre' },
    { nome: 'Declaração de ME/EPP', categoria: 'declaracoes', obrigatorio: false, descricao: 'Se aplicável' },
    { nome: 'Declaração de Elaboração Independente de Proposta', categoria: 'declaracoes', obrigatorio: true },

    // Proposta
    { nome: 'Proposta Comercial', categoria: 'proposta', obrigatorio: true },
    { nome: 'Planilha de Custos', categoria: 'proposta', obrigatorio: false },
];
