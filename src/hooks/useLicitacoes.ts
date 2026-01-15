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
    };
    buscar: (filtros: FiltrosLicitacao) => Promise<void>;
    carregarMais: () => Promise<void>;
}

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
    });

    const buscar = useCallback(async (filtros: FiltrosLicitacao) => {
        setLoading(true);
        setError(null);
        setFiltrosAtuais(filtros);

        try {
            const params = new URLSearchParams();

            if (filtros.termo) params.append('termo', filtros.termo);
            if (filtros.uf) params.append('uf', filtros.uf);
            if (filtros.modalidade) params.append('modalidade', filtros.modalidade);
            if (filtros.dataInicio) params.append('dataInicial', filtros.dataInicio.replace(/-/g, ''));
            if (filtros.dataFim) params.append('dataFinal', filtros.dataFim.replace(/-/g, ''));

            params.append('pagina', '1');
            params.append('tamanhoPagina', '50');

            const response = await fetch(`/api/licitacoes?${params.toString()}`);
            const data = await response.json();

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
    }, []);

    const carregarMais = useCallback(async () => {
        if (!meta.temMaisPaginas || loading) return;

        setLoading(true);

        try {
            const params = new URLSearchParams();

            if (filtrosAtuais.termo) params.append('termo', filtrosAtuais.termo);
            if (filtrosAtuais.uf) params.append('uf', filtrosAtuais.uf);
            if (filtrosAtuais.modalidade) params.append('modalidade', filtrosAtuais.modalidade);
            if (filtrosAtuais.dataInicio) params.append('dataInicial', filtrosAtuais.dataInicio.replace(/-/g, ''));
            if (filtrosAtuais.dataFim) params.append('dataFinal', filtrosAtuais.dataFim.replace(/-/g, ''));

            params.append('pagina', String(meta.paginaAtual + 1));
            params.append('tamanhoPagina', '50');

            const response = await fetch(`/api/licitacoes?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setLicitacoes(prev => [...prev, ...data.data]);
                setMeta(data.meta);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar mais');
        } finally {
            setLoading(false);
        }
    }, [filtrosAtuais, meta.paginaAtual, meta.temMaisPaginas, loading]);

    return {
        licitacoes,
        loading,
        error,
        meta,
        buscar,
        carregarMais,
    };
}
