'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'licitacoes_favoritas';

export function useFavoritos() {
    const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
    const [loaded, setLoaded] = useState(false);

    // Carregar favoritos do localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as string[];
                setFavoritos(new Set(parsed));
            } catch (e) {
                console.error('Erro ao carregar favoritos:', e);
            }
        }
        setLoaded(true);
    }, []);

    // Salvar no localStorage quando mudar
    useEffect(() => {
        if (loaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...favoritos]));
        }
    }, [favoritos, loaded]);

    const toggleFavorito = useCallback((licitacaoId: string) => {
        setFavoritos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(licitacaoId)) {
                newSet.delete(licitacaoId);
            } else {
                newSet.add(licitacaoId);
            }
            return newSet;
        });
    }, []);

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
