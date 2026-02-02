'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

const STORAGE_KEY = 'licitacoes_favoritas';

export function useFavoritos() {
    const { autenticado } = useAuthContext();
    const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
    const [loaded, setLoaded] = useState(false);

    // Carregar favoritos do servidor com fallback
    useEffect(() => {
        if (!autenticado) {
            setFavoritos(new Set());
            setLoaded(true);
            return;
        }

        async function load() {
            try {
                const res = await fetch('/api/favoritos', { credentials: 'include' });
                if (!res.ok) throw new Error('API unavailable');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setFavoritos(new Set(data));
                    setLoaded(true);
                    return;
                }
            } catch (e) {
                // If API fails, start with empty set (no local persistence)
                setFavoritos(new Set());
            } finally {
                setLoaded(true);
            }
        }
        load();
    }, [autenticado]);

    function loadFromStorage(): Set<string> { return new Set(); }
    function saveToStorage(_: Set<string>) { /* noop - server persists data */ }

    const toggleFavorito = useCallback((licitacaoId: string) => {
        // Optimistic toggle and server update
        setFavoritos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(licitacaoId)) {
                newSet.delete(licitacaoId);
            } else {
                newSet.add(licitacaoId);
            }
            // no-op client persistence; server holds authoritative data
            return newSet;
        });
        fetch('/api/favoritos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ licitacaoId }),
            credentials: 'include'
        }).catch(() => { /* ignore */ });
    }, []);

    function getCurrentFavoritos(): Set<string> { return favoritos; }

    const isFavorito = useCallback((licitacaoId: string) => {
        return favoritos.has(licitacaoId);
    }, [favoritos]);

    const totalFavoritos = favoritos.size;

    return {
        favoritos,
        toggleFavorito,
        isFavorito,
        totalFavoritos,
        loaded,
    };
}
