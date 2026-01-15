'use client';

import { useState, useCallback } from 'react';
import { Licitacao, FiltrosLicitacao } from '@/types/licitacao';

interface UseLicitacoesReturn {
    licitacoes: Licitacao[];
    loading: boolean;
    error: string | null;
    meta: {
        paginaAtual: number;
        totalPaginas: number;
        totalRegistros: number;
        totalFiltrado: number;
        temMaisPaginas: boolean;
        itensPorPagina: number;
    };
    buscar: (filtros: FiltrosLicitacao) => Promise<void>;
    irParaPagina: (pagina: number) => Promise<void>;
    carregarMais: () => Promise<void>;
}

const ITENS_POR_PAGINA = 20;

export function useLicitacoes(): UseLicitacoesReturn {
    const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filtrosAtuais, setFiltrosAtuais] = useState<FiltrosLicitacao>({});
    const [meta, setMeta] = useState({
        paginaAtual: 1,
        totalPaginas: 0,
        totalRegistros: 0,
        totalFiltrado: 0,
        temMaisPaginas: false,
        itensPorPagina: ITENS_POR_PAGINA,
    });

    const fetchLicitacoes = useCallback(async (filtros: FiltrosLicitacao, pagina: number) => {
        const params = new URLSearchParams();

        if (filtros.termo) params.append('termo', filtros.termo);
        if (filtros.uf) params.append('uf', filtros.uf);
        if (filtros.modalidade) params.append('modalidade', filtros.modalidade);
        if (filtros.area) params.append('area', filtros.area);
        if (filtros.dataInicio) params.append('dataInicial', filtros.dataInicio.replace(/-/g, ''));
        if (filtros.dataFim) params.append('dataFinal', filtros.dataFim.replace(/-/g, ''));

        params.append('pagina', String(pagina));
        params.append('tamanhoPagina', String(ITENS_POR_PAGINA));

        const response = await fetch(`/api/licitacoes?${params.toString()}`);
        return response.json();
    }, []);

    const buscar = useCallback(async (filtros: FiltrosLicitacao) => {
        setLoading(true);
        setError(null);
        setFiltrosAtuais(filtros);

        try {
            const data = await fetchLicitacoes(filtros, 1);

            if (data.success) {
                setLicitacoes(data.data);
                setMeta(data.meta);
            } else {
                setError(data.error || 'Erro ao buscar licitações');
                setLicitacoes([]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido');
            setLicitacoes([]);
        } finally {
            setLoading(false);
        }
    }, [fetchLicitacoes]);

    const irParaPagina = useCallback(async (pagina: number) => {
        if (pagina < 1 || pagina > meta.totalPaginas || loading) return;

        setLoading(true);
        setError(null);

        try {
            const data = await fetchLicitacoes(filtrosAtuais, pagina);

            if (data.success) {
                setLicitacoes(data.data);
                setMeta(data.meta);
                // Scroll para o topo da lista
                window.scrollTo({ top: 300, behavior: 'smooth' });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar página');
        } finally {
            setLoading(false);
        }
    }, [filtrosAtuais, meta.totalPaginas, loading, fetchLicitacoes]);

    const carregarMais = useCallback(async () => {
        if (!meta.temMaisPaginas || loading) return;
        await irParaPagina(meta.paginaAtual + 1);
    }, [meta.temMaisPaginas, meta.paginaAtual, loading, irParaPagina]);

    return {
        licitacoes,
        loading,
        error,
        meta,
        buscar,
        irParaPagina,
        carregarMais,
    };
}
