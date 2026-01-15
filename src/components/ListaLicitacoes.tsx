'use client';

import { LicitacaoCard } from './LicitacaoCard';
import { Licitacao } from '@/types/licitacao';
import { FileQuestion, Loader2 } from 'lucide-react';

interface ListaLicitacoesProps {
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
    onCarregarMais: () => void;
}

export function ListaLicitacoes({
    licitacoes,
    loading,
    error,
    meta,
    onCarregarMais
}: ListaLicitacoesProps) {
    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                <p className="text-red-600 font-medium">Erro ao carregar licitações</p>
                <p className="text-red-500 text-sm mt-2">{error}</p>
            </div>
        );
    }

    if (loading && licitacoes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-600">Buscando licitações...</p>
                <p className="text-gray-400 text-sm mt-1">Isso pode levar alguns segundos</p>
            </div>
        );
    }

    if (licitacoes.length === 0) {
        return (
            <div className="bg-gray-50 rounded-xl p-12 text-center">
                <FileQuestion className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium text-lg">Nenhuma licitação encontrada</p>
                <p className="text-gray-400 text-sm mt-2">
                    Clique em &quot;Buscar Licitações&quot; para começar ou ajuste os filtros
                </p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <p className="text-gray-600">
                        <span className="font-semibold text-gray-900">{licitacoes.length}</span> licitações
                        {meta.totalRegistros > 0 && (
                            <span className="text-gray-400"> (de {meta.totalRegistros} no período)</span>
                        )}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {licitacoes.map((licitacao) => (
                    <LicitacaoCard key={licitacao.id} licitacao={licitacao} />
                ))}
            </div>

            {meta.temMaisPaginas && (
                <div className="flex justify-center mt-8">
                    <button
                        onClick={onCarregarMais}
                        disabled={loading}
                        className="px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 font-medium flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Carregando...
                            </>
                        ) : (
                            'Carregar mais licitações'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
