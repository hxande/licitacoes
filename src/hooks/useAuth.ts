'use client';

import { useState, useEffect, useCallback } from 'react';
import { Usuario, Sessao, ConfiguracoesUsuario, ResultadoAuth } from '@/types/usuario';

const CONFIG_KEY = 'config-usuario';

export function useAuth() {
    const [sessao, setSessao] = useState<Sessao | null>(null);
    const [configuracoes, setConfiguracoes] = useState<ConfiguracoesUsuario>({
        notificacoesEmail: true,
        notificacoesPush: false,
        resumoDiario: false,
        resumoSemanal: true,
    });
    const [carregando, setCarregando] = useState(true);

    // Verificar sessão existente ao carregar
    useEffect(() => {
        const verificarSessao = async () => {
            try {
                const response = await fetch('/api/auth/me', {
                    credentials: 'include',
                });
                const data = await response.json();

                if (data.autenticado && data.usuario) {
                    setSessao({
                        usuario: data.usuario,
                        token: '', // Token está no cookie httpOnly
                        expiraEm: '',
                    });
                }
            } catch (error) {
                console.error('Erro ao verificar sessão:', error);
            } finally {
                setCarregando(false);
            }
        };

        verificarSessao();

        // Carregar configurações do localStorage
        if (typeof window !== 'undefined') {
            const configSalvas = localStorage.getItem(CONFIG_KEY);
            if (configSalvas) {
                try {
                    setConfiguracoes(JSON.parse(configSalvas));
                } catch { }
            }
        }
    }, []);

    // Login
    const login = useCallback(async (email: string, senha: string): Promise<ResultadoAuth> => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, senha }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { sucesso: false, erro: data.error || 'Erro ao fazer login' };
            }

            setSessao({
                usuario: data.usuario,
                token: data.token,
                expiraEm: data.expiraEm,
            });

            return { sucesso: true };
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
        }
    }, []);

    // Registro
    const registrar = useCallback(async (nome: string, email: string, senha: string): Promise<ResultadoAuth> => {
        try {
            const response = await fetch('/api/auth/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { sucesso: false, erro: data.error || 'Erro ao criar conta' };
            }

            return { sucesso: true, mensagem: data.message };
        } catch (error) {
            console.error('Erro ao registrar:', error);
            return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
        }
    }, []);

    // Logout
    const logout = useCallback(async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        } finally {
            setSessao(null);
        }
    }, []);

    // Reenviar verificação de email
    const reenviarVerificacao = useCallback(async (email: string): Promise<ResultadoAuth> => {
        try {
            const response = await fetch('/api/auth/reenviar-verificacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { sucesso: false, erro: data.error };
            }

            return { sucesso: true, mensagem: data.message };
        } catch (error) {
            console.error('Erro ao reenviar verificação:', error);
            return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
        }
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
        if (typeof window !== 'undefined') {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(configsAtualizadas));
        }
    }, [configuracoes]);

    return {
        usuario: sessao?.usuario ?? null,
        sessao,
        configuracoes,
        carregando,
        autenticado: !!sessao,
        login,
        logout,
        registrar,
        reenviarVerificacao,
        atualizarPerfil,
        atualizarConfiguracoes,
    };
}

