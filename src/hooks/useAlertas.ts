import { useEffect, useState } from 'react';
import { AlertaLocal } from '@/types/alerta';

const STORAGE_KEY = 'licitacoes_alertas';

export function useAlertas() {
    const [alertas, setAlertas] = useState<AlertaLocal[]>([]);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/alertas');
                if (!res.ok) throw new Error('API unavailable');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setAlertas(data as AlertaLocal[]);
                    saveToStorage(data as AlertaLocal[]);
                    return;
                }
            } catch (e) {
                const stored = loadFromStorage();
                if (stored) setAlertas(stored);
            }
        }
        load();
    }, []);

    function loadFromStorage(): AlertaLocal[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            return JSON.parse(raw) as AlertaLocal[];
        } catch (e) {
            return [];
        }
    }

    function saveToStorage(list: AlertaLocal[]) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
            // ignore
        }
    }

    async function criarAlerta(partial: Partial<AlertaLocal>) {
        try {
            const res = await fetch('/api/alertas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(partial) });
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
            await fetch('/api/alertas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...partial }) });
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
            await fetch(`/api/alertas?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
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
