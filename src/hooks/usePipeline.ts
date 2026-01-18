'use client';

import { useState, useEffect, useCallback } from 'react';
import { LicitacaoPipeline, StatusPipeline } from '@/types/pipeline';
import { Licitacao } from '@/types/licitacao';

const STORAGE_KEY = 'pipeline-licitacoes';

export function usePipeline() {
    const [licitacoes, setLicitacoes] = useState<LicitacaoPipeline[]>([]);
    const [carregado, setCarregado] = useState(false);
    // Carregar do servidor
    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/pipeline');
                if (!res.ok) throw new Error('API unavailable');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setLicitacoes(data as LicitacaoPipeline[]);
                    saveToStorage(data as LicitacaoPipeline[]);
                    setCarregado(true);
                    return;
                }
            } catch (e) {
                const stored = loadFromStorage();
                setLicitacoes(stored);
            } finally {
                setCarregado(true);
            }
        }
        load();
    }, []);

    function loadFromStorage(): LicitacaoPipeline[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            return JSON.parse(raw) as LicitacaoPipeline[];
        } catch (e) {
            return [];
        }
    }

    function saveToStorage(list: LicitacaoPipeline[]) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
            // ignore
        }
    }

    // Adicionar licitação ao pipeline
    const adicionarAoPipeline = useCallback((licitacao: Licitacao, status: StatusPipeline = 'encontrada') => {
        setLicitacoes(prev => {
            if (prev.some(l => l.id === licitacao.id)) return prev;
            const nova: LicitacaoPipeline = {
                id: licitacao.id,
                objeto: licitacao.objeto,
                orgao: licitacao.orgao,
                uf: licitacao.uf,
                valorEstimado: licitacao.valorEstimado,
                dataAbertura: licitacao.dataAbertura,
                modalidade: licitacao.modalidade,
                cnpjOrgao: licitacao.cnpjOrgao,
                status,
                adicionadoEm: new Date().toISOString(),
                atualizadoEm: new Date().toISOString(),
            };
            // persist server-side (fallback to local)
            const next = [...prev, nova];
            saveToStorage(next);
            fetch('/api/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nova) }).catch(() => { saveToStorage(getCurrent()); });
            return next;
        });
    }, []);

    // Mover licitação para outro status
    const moverParaStatus = useCallback((id: string, novoStatus: StatusPipeline) => {
        setLicitacoes(prev => {
            const next = prev.map(l => l.id === id ? { ...l, status: novoStatus, atualizadoEm: new Date().toISOString() } : l);
            saveToStorage(next);
            fetch('/api/pipeline', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: novoStatus }) }).catch(() => { saveToStorage(getCurrent()); });
            return next;
        });
    }, []);

    // Remover do pipeline
    const removerDoPipeline = useCallback((id: string) => {
        setLicitacoes(prev => {
            const next = prev.filter(l => l.id !== id);
            saveToStorage(next);
            fetch(`/api/pipeline?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => { saveToStorage(getCurrent()); });
            return next;
        });
    }, []);

    // Atualizar observações
    const atualizarObservacoes = useCallback((id: string, observacoes: string) => {
        setLicitacoes(prev => {
            const next = prev.map(l => l.id === id ? { ...l, observacoes, atualizadoEm: new Date().toISOString() } : l);
            saveToStorage(next);
            fetch('/api/pipeline', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, observacoes }) }).catch(() => { saveToStorage(getCurrent()); });
            return next;
        });
    }, []);

    // Verificar se licitação está no pipeline
    const estaNoIpeline = useCallback((id: string) => {
        return licitacoes.some(l => l.id === id);
    }, [licitacoes]);

    function getCurrent(): LicitacaoPipeline[] {
        try {
            return localStorage.getItem(STORAGE_KEY) ? JSON.parse(localStorage.getItem(STORAGE_KEY) as string) as LicitacaoPipeline[] : licitacoes;
        } catch (e) {
            return licitacoes;
        }
    }

    // Obter licitações por status
    const obterPorStatus = useCallback((status: StatusPipeline) => {
        return licitacoes.filter(l => l.status === status);
    }, [licitacoes]);

    // Estatísticas
    const estatisticas = {
        total: licitacoes.length,
        encontradas: licitacoes.filter(l => l.status === 'encontrada').length,
        analisando: licitacoes.filter(l => l.status === 'analisando').length,
        propostaEnviada: licitacoes.filter(l => l.status === 'proposta_enviada').length,
        aguardando: licitacoes.filter(l => l.status === 'aguardando').length,
        ganhas: licitacoes.filter(l => l.status === 'ganha').length,
        perdidas: licitacoes.filter(l => l.status === 'perdida').length,
        valorTotalGanhas: licitacoes
            .filter(l => l.status === 'ganha')
            .reduce((sum, l) => sum + (l.valorEstimado || 0), 0),
    };

    return {
        licitacoes,
        carregado,
        adicionarAoPipeline,
        moverParaStatus,
        removerDoPipeline,
        atualizarObservacoes,
        estaNoIpeline,
        obterPorStatus,
        estatisticas,
    };
}
