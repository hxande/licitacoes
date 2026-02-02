'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Usuario, Sessao, ConfiguracoesUsuario, ResultadoAuth } from '@/types/usuario';

interface AuthContextType {
    usuario: Usuario | null;
    sessao: Sessao | null;
    configuracoes: ConfiguracoesUsuario;
    carregando: boolean;
    autenticado: boolean;
    login: (email: string, senha: string) => Promise<ResultadoAuth>;
    logout: () => Promise<void>;
    registrar: (nome: string, email: string, senha: string) => Promise<ResultadoAuth>;
    reenviarVerificacao: (email: string) => Promise<ResultadoAuth>;
    atualizarPerfil: (dados: Partial<Usuario>) => void;
    atualizarConfiguracoes: (configs: Partial<ConfiguracoesUsuario>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const auth = useAuth();

    return (
        <AuthContext.Provider value={auth}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext deve ser usado dentro de um AuthProvider');
    }
    return context;
}
