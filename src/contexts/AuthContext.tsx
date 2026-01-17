'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Usuario, Sessao, ConfiguracoesUsuario } from '@/types/usuario';

interface AuthContextType {
    usuario: Usuario | null;
    sessao: Sessao | null;
    configuracoes: ConfiguracoesUsuario;
    carregando: boolean;
    autenticado: boolean;
    login: (email: string, senha: string) => Promise<{ sucesso: boolean; erro?: string }>;
    logout: () => void;
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
