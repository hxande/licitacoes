'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'licitacoes_favoritas';

export function useFavoritos() {
    const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
    const [loaded, setLoaded] = useState(false);
    // Carregar favoritos do servidor com fallback
    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/favoritos');
                if (!res.ok) throw new Error('API unavailable');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setFavoritos(new Set(data));
                    saveToStorage(new Set(data));
                    setLoaded(true);
                    return;
                }
            } catch (e) {
                const stored = loadFromStorage();
                setFavoritos(stored);
            } finally {
                setLoaded(true);
            }
        }
        load();
    }, []);

    function loadFromStorage(): Set<string> {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return new Set();
            const arr = JSON.parse(raw) as string[];
            return new Set(arr);
        } catch (e) {
            return new Set();
        }
    }

    function saveToStorage(set: Set<string>) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
        } catch (e) {
            // ignore
        }
    }

    const toggleFavorito = useCallback((licitacaoId: string) => {
        // Optimistic toggle and server update
        setFavoritos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(licitacaoId)) {
                newSet.delete(licitacaoId);
            } else {
                newSet.add(licitacaoId);
            }
            saveToStorage(newSet);
            return newSet;
        });
        fetch('/api/favoritos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ licitacaoId }) }).catch(() => { saveToStorage(getCurrentFavoritos()); });
    }, []);

    function getCurrentFavoritos(): Set<string> {
        try {
            return localStorage.getItem(STORAGE_KEY) ? new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)) : favoritos;
        } catch (e) {
            return favoritos;
        }
    }

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
