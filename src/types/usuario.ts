export interface Usuario {
    id: string;
    nome: string;
    email: string;
    telefone?: string;
    avatarUrl?: string;
    criadoEm: string;
}

export interface Sessao {
    usuario: Usuario;
    token: string;
    expiraEm: string;
}

export interface ConfiguracoesUsuario {
    notificacoesEmail: boolean;
    notificacoesPush: boolean;
    resumoDiario: boolean;
    resumoSemanal: boolean;
}
