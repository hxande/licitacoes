import { useEffect, useState } from 'react';
import { AlertaLocal } from '@/types/alerta';

const STORAGE_KEY = 'alertas-usuario';

export function useAlertas() {
    const [alertas, setAlertas] = useState<AlertaLocal[]>([]);

    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                setAlertas(JSON.parse(raw));
            } catch { }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(alertas));
    }, [alertas]);

    function criarAlerta(partial: Partial<AlertaLocal>) {
        const novo: AlertaLocal = {
            id: Date.now().toString(),
            nome: partial.nome || 'Alerta sem nome',
            filtros: partial.filtros || {},
            periodicidade: partial.periodicidade || 'diario',
            criadoEm: new Date().toISOString(),
        };
        setAlertas(prev => [novo, ...prev]);
        return novo;
    }

    function removerAlerta(id: string) {
        setAlertas(prev => prev.filter(a => a.id !== id));
    }

    return { alertas, criarAlerta, removerAlerta };
}
