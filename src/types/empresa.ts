export interface PerfilEmpresa {
    // Dados básicos
    nomeEmpresa: string;
    cnpj?: string;

    // Áreas de atuação (podem ser múltiplas)
    areasAtuacao: string[];

    // Capacidades técnicas / palavras-chave do que a empresa faz
    capacidades: string[];

    // Certificações
    certificacoes: string[];

    // Estados onde a empresa atua
    estadosAtuacao: string[];

    // Porte da empresa
    porte: 'MEI' | 'ME' | 'EPP' | 'Médio' | 'Grande';

    // Faixa de valores que costuma participar
    valorMinimo?: number;
    valorMaximo?: number;

    // Modalidades preferidas
    modalidadesPreferidas: number[];
}

export const PORTES_EMPRESA = [
    { value: 'MEI', label: 'MEI - Microempreendedor Individual' },
    { value: 'ME', label: 'ME - Microempresa' },
    { value: 'EPP', label: 'EPP - Empresa de Pequeno Porte' },
    { value: 'Médio', label: 'Empresa de Médio Porte' },
    { value: 'Grande', label: 'Empresa de Grande Porte' },
];

export const CERTIFICACOES_COMUNS = [
    'ISO 9001 - Gestão da Qualidade',
    'ISO 14001 - Gestão Ambiental',
    'ISO 27001 - Segurança da Informação',
    'ISO 45001 - Saúde e Segurança',
    'CMMI',
    'MPS.BR',
    'SOC 2',
    'PCI DSS',
    'LGPD Compliance',
    'Selo GPTW',
    'Certificação Microsoft',
    'Certificação AWS',
    'Certificação Google Cloud',
    'Certificação Oracle',
    'Atestado de Capacidade Técnica',
];

export const CAPACIDADES_TI = [
    'Desenvolvimento de Software',
    'Desenvolvimento Web',
    'Desenvolvimento Mobile',
    'Sistemas ERP',
    'Sistemas CRM',
    'Business Intelligence',
    'Data Analytics',
    'Inteligência Artificial',
    'Machine Learning',
    'Cloud Computing',
    'Infraestrutura de TI',
    'Redes de Computadores',
    'Segurança da Informação',
    'Suporte Técnico',
    'Help Desk',
    'NOC/SOC',
    'DevOps',
    'Virtualização',
    'Backup e Recuperação',
    'Outsourcing de TI',
    'Consultoria em TI',
    'Gestão de Projetos',
    'Treinamento e Capacitação',
    'Licenciamento de Software',
    'Hardware e Equipamentos',
    'Cabeamento Estruturado',
    'Data Center',
    'IoT',
    'Automação',
];

export const CAPACIDADES_GERAIS = [
    // Engenharia
    'Construção Civil',
    'Reformas',
    'Manutenção Predial',
    'Projetos de Engenharia',
    'Instalações Elétricas',
    'Instalações Hidráulicas',

    // Saúde
    'Equipamentos Médicos',
    'Medicamentos',
    'Materiais Hospitalares',
    'Serviços de Saúde',

    // Alimentação
    'Fornecimento de Refeições',
    'Gêneros Alimentícios',
    'Catering',

    // Limpeza
    'Limpeza e Conservação',
    'Jardinagem',
    'Controle de Pragas',

    // Segurança
    'Vigilância Patrimonial',
    'Segurança Eletrônica',
    'Monitoramento CFTV',

    // Veículos
    'Locação de Veículos',
    'Manutenção de Frota',
    'Combustíveis',

    // Comunicação
    'Publicidade',
    'Marketing Digital',
    'Produção de Eventos',
    'Assessoria de Imprensa',

    // Outros
    'Mobiliário',
    'Ar Condicionado',
    'Material de Escritório',
];

export interface MatchResult {
    percentual: number;
    fatores: {
        area: number;
        estado: number;
        valor: number;
        capacidades: number;
        modalidade: number;
    };
    destaques: string[];
}
