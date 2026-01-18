'use client';

import { useState, useEffect, useCallback } from 'react';
import { Usuario, Sessao, ConfiguracoesUsuario } from '@/types/usuario';

const STORAGE_KEY = 'sessao-usuario';
const PERFIL_KEY = 'perfil-usuario';
const CONFIG_KEY = 'config-usuario';
const FIXED_USER_ID = '999';

// Gera um ID único simples
const gerarId = () => Math.random().toString(36).substring(2, 15);

// Gera um token fake
const gerarToken = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export function useAuth() {
    const [sessao, setSessao] = useState<Sessao | null>(null);
    const [configuracoes, setConfiguracoes] = useState<ConfiguracoesUsuario>({
        notificacoesEmail: true,
        notificacoesPush: false,
        resumoDiario: false,
        resumoSemanal: true,
    });
    const [carregando, setCarregando] = useState(true);

    // No persistent client-side session: always start empty and fetch from server as needed
    useEffect(() => {
        setCarregando(false);
    }, []);

    // Login - por enquanto aceita qualquer credencial
    const login = useCallback(async (email: string, _senha: string): Promise<{ sucesso: boolean; erro?: string }> => {
        // Simula um delay de rede
        await new Promise(resolve => setTimeout(resolve, 800));

        // Por enquanto, sempre autentica e força o usuário para id 999
        const usuario: Usuario = {
            id: FIXED_USER_ID,
            nome: email.split('@')[0],
            email,
            criadoEm: new Date().toISOString(),
        };

        const expiraEm = new Date();
        expiraEm.setDate(expiraEm.getDate() + 7); // 7 dias

        const novaSessao: Sessao = {
            usuario,
            token: gerarToken(),
            expiraEm: expiraEm.toISOString(),
        };

        // Do not persist session/profile in localStorage; keep in-memory only
        setSessao(novaSessao);

        return { sucesso: true };
    }, []);

    // Logout
    const logout = useCallback(() => {
        setSessao(null);
    }, []);

    // Atualizar perfil do usuário
    const atualizarPerfil = useCallback((dadosAtualizados: Partial<Usuario>) => {
        if (!sessao) return;
        const usuarioAtualizado = { ...sessao.usuario, ...dadosAtualizados };
        const sessaoAtualizada = { ...sessao, usuario: usuarioAtualizado };
        setSessao(sessaoAtualizada);
    }, [sessao]);

    // Atualizar configurações
    const atualizarConfiguracoes = useCallback((novasConfigs: Partial<ConfiguracoesUsuario>) => {
        const configsAtualizadas = { ...configuracoes, ...novasConfigs };
        setConfiguracoes(configsAtualizadas);
    }, [configuracoes]);

    return {
        usuario: sessao?.usuario ?? null,
        sessao,
        configuracoes,
        carregando,
        autenticado: !!sessao,
        login,
        logout,
        atualizarPerfil,
        atualizarConfiguracoes,
    };
}
