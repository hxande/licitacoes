'use client';

import { useState, useEffect, useCallback } from 'react';
import { Usuario, Sessao, ConfiguracoesUsuario } from '@/types/usuario';

const STORAGE_KEY = 'sessao-usuario';
const PERFIL_KEY = 'perfil-usuario';
const CONFIG_KEY = 'config-usuario';

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

    // Carregar sessão do localStorage
    useEffect(() => {
        const sessaoSalva = localStorage.getItem(STORAGE_KEY);
        if (sessaoSalva) {
            try {
                const sessaoParsed = JSON.parse(sessaoSalva) as Sessao;
                // Verificar se não expirou (7 dias)
                if (new Date(sessaoParsed.expiraEm) > new Date()) {
                    setSessao(sessaoParsed);
                } else {
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch {
                localStorage.removeItem(STORAGE_KEY);
            }
        }

        const configSalva = localStorage.getItem(CONFIG_KEY);
        if (configSalva) {
            try {
                setConfiguracoes(JSON.parse(configSalva));
            } catch {
                // Ignora
            }
        }

        setCarregando(false);
    }, []);

    // Login - por enquanto aceita qualquer credencial
    const login = useCallback(async (email: string, _senha: string): Promise<{ sucesso: boolean; erro?: string }> => {
        // Simula um delay de rede
        await new Promise(resolve => setTimeout(resolve, 800));

        // Por enquanto, sempre autentica
        // TODO: Implementar autenticação real

        // Verifica se já existe um perfil salvo para este email
        const perfilSalvo = localStorage.getItem(PERFIL_KEY);
        let usuario: Usuario;

        if (perfilSalvo) {
            try {
                const perfilParsed = JSON.parse(perfilSalvo);
                if (perfilParsed.email === email) {
                    usuario = perfilParsed;
                } else {
                    // Email diferente, criar novo usuário
                    usuario = {
                        id: gerarId(),
                        nome: email.split('@')[0],
                        email,
                        criadoEm: new Date().toISOString(),
                    };
                }
            } catch {
                usuario = {
                    id: gerarId(),
                    nome: email.split('@')[0],
                    email,
                    criadoEm: new Date().toISOString(),
                };
            }
        } else {
            usuario = {
                id: gerarId(),
                nome: email.split('@')[0],
                email,
                criadoEm: new Date().toISOString(),
            };
        }

        const expiraEm = new Date();
        expiraEm.setDate(expiraEm.getDate() + 7); // 7 dias

        const novaSessao: Sessao = {
            usuario,
            token: gerarToken(),
            expiraEm: expiraEm.toISOString(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(novaSessao));
        localStorage.setItem(PERFIL_KEY, JSON.stringify(usuario));
        setSessao(novaSessao);

        return { sucesso: true };
    }, []);

    // Logout
    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setSessao(null);
    }, []);

    // Atualizar perfil do usuário
    const atualizarPerfil = useCallback((dadosAtualizados: Partial<Usuario>) => {
        if (!sessao) return;

        const usuarioAtualizado = {
            ...sessao.usuario,
            ...dadosAtualizados,
        };

        const sessaoAtualizada = {
            ...sessao,
            usuario: usuarioAtualizado,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessaoAtualizada));
        localStorage.setItem(PERFIL_KEY, JSON.stringify(usuarioAtualizado));
        setSessao(sessaoAtualizada);
    }, [sessao]);

    // Atualizar configurações
    const atualizarConfiguracoes = useCallback((novasConfigs: Partial<ConfiguracoesUsuario>) => {
        const configsAtualizadas = {
            ...configuracoes,
            ...novasConfigs,
        };

        localStorage.setItem(CONFIG_KEY, JSON.stringify(configsAtualizadas));
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
