'use client';

import { LicitacaoCard } from './LicitacaoCard';
import { Licitacao } from '@/types/licitacao';
import { FileQuestion, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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
        itensPorPagina: number;
    };
    onCarregarMais: () => void;
    onIrParaPagina: (pagina: number) => void;
}

function Paginacao({
    paginaAtual,
    totalPaginas,
    onIrParaPagina,
    loading
}: {
    paginaAtual: number;
    totalPaginas: number;
    onIrParaPagina: (pagina: number) => void;
    loading: boolean;
}) {
    if (totalPaginas <= 1) return null;

    // Gerar array de páginas a exibir
    const gerarPaginas = () => {
        const paginas: (number | 'ellipsis')[] = [];
        const maxPaginasVisiveis = 5;

        if (totalPaginas <= maxPaginasVisiveis + 2) {
            // Mostrar todas as páginas
            for (let i = 1; i <= totalPaginas; i++) {
                paginas.push(i);
            }
        } else {
            // Sempre mostrar primeira página
            paginas.push(1);

            if (paginaAtual <= 3) {
                // Início: 1 2 3 4 ... última
                for (let i = 2; i <= 4; i++) {
                    paginas.push(i);
                }
                paginas.push('ellipsis');
            } else if (paginaAtual >= totalPaginas - 2) {
                // Fim: 1 ... antepenúltima penúltima última
                paginas.push('ellipsis');
                for (let i = totalPaginas - 3; i < totalPaginas; i++) {
                    paginas.push(i);
                }
            } else {
                // Meio: 1 ... anterior atual próxima ... última
                paginas.push('ellipsis');
                for (let i = paginaAtual - 1; i <= paginaAtual + 1; i++) {
                    paginas.push(i);
                }
                paginas.push('ellipsis');
            }

            // Sempre mostrar última página
            paginas.push(totalPaginas);
        }

        return paginas;
    };

    const paginas = gerarPaginas();

    return (
        <div className="flex items-center justify-center gap-1 mt-8">
            {/* Primeira página */}
            <button
                onClick={() => onIrParaPagina(1)}
                disabled={paginaAtual === 1 || loading}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Primeira página"
            >
                <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Página anterior */}
            <button
                onClick={() => onIrParaPagina(paginaAtual - 1)}
                disabled={paginaAtual === 1 || loading}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Página anterior"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Números das páginas */}
            <div className="flex items-center gap-1 mx-2">
                {paginas.map((pagina, index) => (
                    pagina === 'ellipsis' ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
                    ) : (
                        <button
                            key={pagina}
                            onClick={() => onIrParaPagina(pagina)}
                            disabled={loading}
                            className={`min-w-[40px] h-10 rounded-lg font-medium transition ${pagina === paginaAtual
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                                } disabled:opacity-50`}
                        >
                            {pagina}
                        </button>
                    )
                ))}
            </div>

            {/* Próxima página */}
            <button
                onClick={() => onIrParaPagina(paginaAtual + 1)}
                disabled={paginaAtual === totalPaginas || loading}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Próxima página"
            >
                <ChevronRight className="w-4 h-4" />
            </button>

            {/* Última página */}
            <button
                onClick={() => onIrParaPagina(totalPaginas)}
                disabled={paginaAtual === totalPaginas || loading}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Última página"
            >
                <ChevronsRight className="w-4 h-4" />
            </button>
        </div>
    );
}

export function ListaLicitacoes({
    licitacoes,
    loading,
    error,
    meta,
    onCarregarMais,
    onIrParaPagina
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

    const inicio = (meta.paginaAtual - 1) * meta.itensPorPagina + 1;
    const fim = Math.min(meta.paginaAtual * meta.itensPorPagina, meta.totalFiltrado);

    return (
        <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <p className="text-gray-600">
                        Exibindo <span className="font-semibold text-gray-900">{inicio}-{fim}</span> de{' '}
                        <span className="font-semibold text-gray-900">{meta.totalFiltrado}</span> licitações
                        {meta.totalRegistros > meta.totalFiltrado && (
                            <span className="text-gray-400"> (filtradas de {meta.totalRegistros} no período)</span>
                        )}
                    </p>
                </div>
                {loading && (
                    <div className="flex items-center gap-2 text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Carregando...</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {licitacoes.map((licitacao) => (
                    <LicitacaoCard key={licitacao.id} licitacao={licitacao} />
                ))}
            </div>

            <Paginacao
                paginaAtual={meta.paginaAtual}
                totalPaginas={meta.totalPaginas}
                onIrParaPagina={onIrParaPagina}
                loading={loading}
            />

            {meta.totalPaginas > 1 && (
                <p className="text-center text-sm text-gray-500 mt-4">
                    Página {meta.paginaAtual} de {meta.totalPaginas}
                </p>
            )}
        </div>
    );
}
