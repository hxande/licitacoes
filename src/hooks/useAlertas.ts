import { useEffect, useState } from 'react';
import { AlertaLocal } from '@/types/alerta';
import { useAuthContext } from '@/contexts/AuthContext';

const STORAGE_KEY = 'licitacoes_alertas';

export function useAlertas() {
    const { autenticado } = useAuthContext();
    const [alertas, setAlertas] = useState<AlertaLocal[]>([]);

    useEffect(() => {
        if (!autenticado) {
            setAlertas([]);
            return;
        }

        async function load() {
            try {
                const res = await fetch('/api/alertas', { credentials: 'include' });
                if (!res.ok) throw new Error('API unavailable');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setAlertas(data as AlertaLocal[]);
                    return;
                }
            } catch (e) {
                // If API fails, keep alertas empty (no local persistence)
                setAlertas([]);
            }
        }
        load();
    }, [autenticado]);

    function loadFromStorage(): AlertaLocal[] { return []; }
    function saveToStorage(_: AlertaLocal[]) { /* noop - persistence moved to server */ }

    async function criarAlerta(partial: Partial<AlertaLocal>) {
        try {
            const res = await fetch('/api/alertas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(partial), credentials: 'include' });
            const data = await res.json();
            const novo: AlertaLocal = {
                id: data.id,
                nome: data.nome,
                filtros: data.filtros || {},
                periodicidade: data.periodicidade || 'diario',
                criadoEm: data.criadoEm || new Date().toISOString(),
            };
            setAlertas(prev => {
                const next = [novo, ...prev];
                saveToStorage(next);
                return next;
            });
            return novo;
        } catch (err) {
            console.error('Erro ao criar alerta', err);
            const novo: AlertaLocal = {
                id: Date.now().toString(),
                nome: partial.nome || 'Alerta sem nome',
                filtros: partial.filtros || {},
                periodicidade: partial.periodicidade || 'diario',
                criadoEm: new Date().toISOString(),
            };
            setAlertas(prev => {
                const next = [novo, ...prev];
                saveToStorage(next);
                return next;
            });
            return novo;
        }
    }

    async function atualizarAlerta(id: string, partial: Partial<AlertaLocal>) {
        try {
            await fetch('/api/alertas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...partial }), credentials: 'include' });
            setAlertas(prev => {
                const next = prev.map(a => a.id === id ? { ...a, ...partial } : a);
                saveToStorage(next);
                return next;
            });
        } catch (err) {
            console.error('Erro ao atualizar alerta', err);
            setAlertas(prev => {
                const next = prev.map(a => a.id === id ? { ...a, ...partial } : a);
                saveToStorage(next);
                return next;
            });
        }
    }

    async function removerAlerta(id: string) {
        try {
            await fetch(`/api/alertas?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
            setAlertas(prev => {
                const next = prev.filter(a => a.id !== id);
                saveToStorage(next);
                return next;
            });
        } catch (err) {
            console.error('Erro ao remover alerta', err);
            setAlertas(prev => {
                const next = prev.filter(a => a.id !== id);
                saveToStorage(next);
                return next;
            });
        }
    }

    return { alertas, criarAlerta, atualizarAlerta, removerAlerta };
}
