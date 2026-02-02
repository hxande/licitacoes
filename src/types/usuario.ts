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

export interface RegistroUsuario {
    nome: string;
    email: string;
    senha: string;
}

export interface LoginCredenciais {
    email: string;
    senha: string;
}

export interface ResultadoAuth {
    sucesso: boolean;
    erro?: string;
    mensagem?: string;
}
