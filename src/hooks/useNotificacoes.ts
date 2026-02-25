'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

export interface Notificacao {
    id: string;
    tipo: 'nova_licitacao' | 'prazo_chegando';
    titulo: string;
    corpo: string;
    licitacaoId?: string | null;
    lida: boolean;
    criadoEm: string;
}

interface NotificacoesState {
    notificacoes: Notificacao[];
    totalNaoLidas: number;
    carregando: boolean;
    marcarComoLida: (ids: string[]) => Promise<void>;
    marcarTodasComoLidas: () => Promise<void>;
    recarregar: () => void;
}

export function useNotificacoes(): NotificacoesState {
    const { autenticado } = useAuthContext();
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [totalNaoLidas, setTotalNaoLidas] = useState(0);
    const [carregando, setCarregando] = useState(false);
    const [tick, setTick] = useState(0);

    const recarregar = useCallback(() => setTick((t) => t + 1), []);

    useEffect(() => {
        if (!autenticado) {
            setNotificacoes([]);
            setTotalNaoLidas(0);
            return;
        }

        let cancelado = false;

        async function carregar() {
            setCarregando(true);
            try {
                const res = await fetch('/api/notificacoes?limit=20', { credentials: 'include' });
                if (!res.ok || cancelado) return;
                const data = await res.json();
                if (cancelado) return;
                setNotificacoes(data.notificacoes ?? []);
                setTotalNaoLidas(data.totalNaoLidas ?? 0);
            } catch {
                // silently ignore
            } finally {
                if (!cancelado) setCarregando(false);
            }
        }

        carregar();

        const intervalo = setInterval(carregar, 60_000);

        return () => {
            cancelado = true;
            clearInterval(intervalo);
        };
    }, [autenticado, tick]);

    const marcarComoLida = useCallback(async (ids: string[]) => {
        // Optimistic update
        setNotificacoes((prev) =>
            prev.map((n) => (ids.includes(n.id) ? { ...n, lida: true } : n))
        );
        setTotalNaoLidas((prev) => Math.max(0, prev - ids.filter((id) =>
            notificacoes.find((n) => n.id === id && !n.lida)
        ).length));

        try {
            await fetch('/api/notificacoes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
                credentials: 'include',
            });
        } catch {
            // revert on failure
            recarregar();
        }
    }, [notificacoes, recarregar]);

    const marcarTodasComoLidas = useCallback(async () => {
        // Optimistic update
        setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
        setTotalNaoLidas(0);

        try {
            await fetch('/api/notificacoes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
                credentials: 'include',
            });
        } catch {
            recarregar();
        }
    }, [recarregar]);

    return { notificacoes, totalNaoLidas, carregando, marcarComoLida, marcarTodasComoLidas, recarregar };
}
