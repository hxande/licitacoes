'use client';

import { useState, useEffect, useCallback } from 'react';
import { LicitacaoPipeline, StatusPipeline } from '@/types/pipeline';
import { Licitacao } from '@/types/licitacao';

const STORAGE_KEY = 'pipeline-licitacoes';

export function usePipeline() {
    const [licitacoes, setLicitacoes] = useState<LicitacaoPipeline[]>([]);
    const [carregado, setCarregado] = useState(false);

    // Carregar do localStorage
    useEffect(() => {
        const salvo = localStorage.getItem(STORAGE_KEY);
        if (salvo) {
            try {
                setLicitacoes(JSON.parse(salvo));
            } catch {
                setLicitacoes([]);
            }
        }
        setCarregado(true);
    }, []);

    // Salvar no localStorage
    useEffect(() => {
        if (carregado) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(licitacoes));
        }
    }, [licitacoes, carregado]);

    // Adicionar licitação ao pipeline
    const adicionarAoPipeline = useCallback((licitacao: Licitacao, status: StatusPipeline = 'encontrada') => {
        setLicitacoes(prev => {
            // Verificar se já existe
            if (prev.some(l => l.id === licitacao.id)) {
                return prev;
            }

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

            return [...prev, nova];
        });
    }, []);

    // Mover licitação para outro status
    const moverParaStatus = useCallback((id: string, novoStatus: StatusPipeline) => {
        setLicitacoes(prev => prev.map(l =>
            l.id === id
                ? { ...l, status: novoStatus, atualizadoEm: new Date().toISOString() }
                : l
        ));
    }, []);

    // Remover do pipeline
    const removerDoPipeline = useCallback((id: string) => {
        setLicitacoes(prev => prev.filter(l => l.id !== id));
    }, []);

    // Atualizar observações
    const atualizarObservacoes = useCallback((id: string, observacoes: string) => {
        setLicitacoes(prev => prev.map(l =>
            l.id === id
                ? { ...l, observacoes, atualizadoEm: new Date().toISOString() }
                : l
        ));
    }, []);

    // Verificar se licitação está no pipeline
    const estaNoIpeline = useCallback((id: string) => {
        return licitacoes.some(l => l.id === id);
    }, [licitacoes]);

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
