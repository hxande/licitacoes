'use client';

import { useState, useEffect, useCallback } from 'react';
import { PerfilEmpresa, MatchResult } from '@/types/empresa';
import { Licitacao } from '@/types/licitacao';
import { useAuthContext } from '@/contexts/AuthContext';
import { calcularMatch as calcularMatchService } from '@/services/calcular-match';

const STORAGE_KEY = 'perfil-empresa';

export function usePerfilEmpresa() {
    const { autenticado } = useAuthContext();
    const [perfil, setPerfil] = useState<PerfilEmpresa | null>(null);
    const [loaded, setLoaded] = useState(false);

    // Carregar perfil do servidor
    useEffect(() => {
        if (!autenticado) {
            setPerfil(null);
            setLoaded(true);
            return;
        }

        async function load() {
            try {
                const res = await fetch('/api/perfil-empresa', { credentials: 'include' });
                if (!res.ok) throw new Error('API unavailable');
                const data = await res.json();
                if (data) {
                    const p = data.dados || data;
                    setPerfil(p);
                    setLoaded(true);
                    return;
                }
            } catch (e) {
                // If API fails, leave perfil as null (no local persistence)
                setPerfil(null);
            } finally {
                setLoaded(true);
            }
        }
        load();
    }, [autenticado]);

    function loadFromStorage(): PerfilEmpresa | null { return null; }
    function saveToStorage(_: PerfilEmpresa | null) { /* noop - server persists data */ }

    // Salvar perfil
    const salvarPerfil = useCallback((novoPerfil: PerfilEmpresa) => {
        setPerfil(novoPerfil);
        saveToStorage(novoPerfil);
        fetch('/api/perfil-empresa', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoPerfil), credentials: 'include' }).catch(() => { saveToStorage(novoPerfil); });
    }, []);

    // Limpar perfil
    const limparPerfil = useCallback(() => {
        setPerfil(null);
        saveToStorage(null);
        fetch('/api/perfil-empresa', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}), credentials: 'include' }).catch(() => { saveToStorage(null); });
    }, []);

    // Calcular match com uma licitação
    const calcularMatch = useCallback((licitacao: Licitacao): MatchResult | null => {
        if (!perfil) return null;
        return calcularMatchService(licitacao, perfil);
    }, [perfil]);

    return {
        perfil,
        loaded,
        salvarPerfil,
        limparPerfil,
        calcularMatch,
        temPerfil: !!perfil,
    };
}
