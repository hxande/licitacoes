export type PeriodicidadeAlerta = 'instantaneo' | 'diario' | 'semanal';

export interface FiltrosAlerta {
    palavrasChave?: string[];
    orgaos?: string[];
    regioes?: string[];
    modalidades?: string[];
    valorMin?: number;
    valorMax?: number;
    diasAbertura?: number;
}

export interface AlertaLocal {
    id: string;
    nome: string;
    filtros: FiltrosAlerta;
    periodicidade: PeriodicidadeAlerta;
    criadoEm: string;
}
