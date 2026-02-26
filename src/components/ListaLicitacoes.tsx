'use client';

import { useState, useMemo } from 'react';
import { LicitacaoCard } from './LicitacaoCard';
import { Licitacao } from '@/types/licitacao';
import { MatchResult, PerfilEmpresa } from '@/types/empresa';
import { FileQuestion, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Heart, List, Download, ArrowUpDown } from 'lucide-react';

interface LicitacaoComMatch extends Licitacao {
    match?: MatchResult | null;
}

interface ListaLicitacoesProps {
    licitacoes: LicitacaoComMatch[];
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
    favoritos: Set<string>;
    onToggleFavorito: (id: string) => void;
    perfil?: PerfilEmpresa | null;
    // Pipeline props - centralizados para evitar múltiplas chamadas
    pipelineIds?: Set<string>;
    onAdicionarPipeline?: (licitacao: Licitacao) => void;
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

type OrdenacaoId = 'recentes' | 'abertura' | 'valor' | 'match';

const OPCOES_SORT: { id: OrdenacaoId; label: string }[] = [
    { id: 'recentes', label: 'Mais recentes' },
    { id: 'abertura', label: 'Abertura próxima' },
    { id: 'valor', label: 'Maior valor' },
    { id: 'match', label: '% Match' },
];

export function ListaLicitacoes({
    licitacoes,
    loading,
    error,
    meta,
    onCarregarMais,
    onIrParaPagina,
    favoritos,
    onToggleFavorito,
    perfil,
    pipelineIds = new Set(),
    onAdicionarPipeline,
}: ListaLicitacoesProps) {
    const [mostrarApenasFavoritos, setMostrarApenasFavoritos] = useState(false);
    const [ordenacao, setOrdenacao] = useState<OrdenacaoId>('recentes');

    const temMatch = licitacoes.some(l => l.match && l.match.percentual > 0);

    // Filtrar por favoritos
    const licitacoesFiltradas = mostrarApenasFavoritos
        ? licitacoes.filter(l => favoritos.has(l.id))
        : licitacoes;

    // Ordenar resultados
    const licitacoesOrdenadas = useMemo(() => {
        const lista = [...licitacoesFiltradas];
        switch (ordenacao) {
            case 'abertura':
                return lista.sort((a, b) => {
                    if (!a.dataAbertura) return 1;
                    if (!b.dataAbertura) return -1;
                    return new Date(a.dataAbertura).getTime() - new Date(b.dataAbertura).getTime();
                });
            case 'valor':
                return lista.sort((a, b) => (b.valorEstimado ?? 0) - (a.valorEstimado ?? 0));
            case 'match':
                return lista.sort((a, b) => (b.match?.percentual ?? 0) - (a.match?.percentual ?? 0));
            default:
                return lista;
        }
    }, [licitacoesFiltradas, ordenacao]);

    const exportarCSV = () => {
        const headers = ['Objeto', 'Órgão', 'UF', 'Município', 'Modalidade', 'Situação', 'Data Publicação', 'Data Abertura', 'Valor Estimado (R$)', 'Fonte', 'Área'];
        const linhas = licitacoes.map(l => [
            `"${(l.objeto || '').replace(/"/g, '""')}"`,
            `"${(l.orgao || '').replace(/"/g, '""')}"`,
            l.uf || '',
            l.municipio || '',
            `"${(l.modalidade || '').replace(/"/g, '""')}"`,
            `"${(l.situacao || '').replace(/"/g, '""')}"`,
            l.dataPublicacao || '',
            l.dataAbertura || '',
            l.valorEstimado !== undefined ? l.valorEstimado.toFixed(2) : '',
            l.fonte || '',
            `"${(l.areaAtuacao || '').replace(/"/g, '""')}"`,
        ].join(','));
        const csv = [headers.join(','), ...linhas].join('\r\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `licitacoes_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const totalFavoritos = licitacoes.filter(l => favoritos.has(l.id)).length;

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
            {/* Toolbar: contagem + ações */}
            <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                <p className="text-gray-600 text-sm">
                    {mostrarApenasFavoritos ? (
                        <>Exibindo <span className="font-semibold text-pink-600">{licitacoesFiltradas.length}</span> favoritas</>
                    ) : (
                        <>
                            Exibindo <span className="font-semibold text-gray-900">{inicio}–{fim}</span> de{' '}
                            <span className="font-semibold text-gray-900">{meta.totalFiltrado}</span>
                            {meta.totalRegistros > meta.totalFiltrado && (
                                <span className="text-gray-400"> (de {meta.totalRegistros} no período)</span>
                            )}
                        </>
                    )}
                </p>
                <div className="flex items-center gap-2">
                    {loading && (
                        <div className="flex items-center gap-1.5 text-blue-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Carregando...</span>
                        </div>
                    )}
                    <button
                        onClick={exportarCSV}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                        title="Exportar para CSV"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Exportar</span>
                    </button>
                    <button
                        onClick={() => setMostrarApenasFavoritos(!mostrarApenasFavoritos)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all ${mostrarApenasFavoritos
                            ? 'bg-pink-600 text-white hover:bg-pink-700'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-pink-50 hover:border-pink-300 hover:text-pink-600'
                            }`}
                    >
                        <Heart className={`w-4 h-4 ${mostrarApenasFavoritos ? 'fill-current' : ''}`} />
                        <span className="hidden sm:inline">{mostrarApenasFavoritos ? 'Ver Todas' : `Favoritas (${totalFavoritos})`}</span>
                        <span className="sm:hidden">{totalFavoritos > 0 ? totalFavoritos : ''}</span>
                    </button>
                </div>
            </div>

            {/* Sort chips */}
            {!mostrarApenasFavoritos && (
                <div className="flex items-center gap-1.5 flex-wrap mb-4">
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    {OPCOES_SORT.filter(o => o.id !== 'match' || temMatch).map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setOrdenacao(opt.id)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${ordenacao === opt.id
                                ? 'bg-gray-800 text-white'
                                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Lista vazia de favoritos */}
            {mostrarApenasFavoritos && licitacoesFiltradas.length === 0 && (
                <div className="bg-pink-50 rounded-xl p-12 text-center border border-pink-100">
                    <Heart className="w-16 h-16 text-pink-300 mx-auto mb-4" />
                    <p className="text-pink-700 font-medium text-lg">Nenhuma licitação favoritada</p>
                    <p className="text-pink-500 text-sm mt-2">
                        Clique no coração ❤️ em qualquer licitação para adicioná-la aos favoritos
                    </p>
                    <button
                        onClick={() => setMostrarApenasFavoritos(false)}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-sm font-medium"
                    >
                        <List className="w-4 h-4" />
                        Ver Todas as Licitações
                    </button>
                </div>
            )}

            {/* Grid de licitações */}
            {(!mostrarApenasFavoritos || licitacoesFiltradas.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {licitacoesOrdenadas.map((licitacao) => (
                        <LicitacaoCard
                            key={licitacao.id}
                            licitacao={licitacao}
                            isFavorito={favoritos.has(licitacao.id)}
                            onToggleFavorito={onToggleFavorito}
                            match={licitacao.match}
                            perfil={perfil}
                            jaEstaNoPipeline={pipelineIds.has(licitacao.id)}
                            onAdicionarPipeline={onAdicionarPipeline}
                        />
                    ))}
                </div>
            )}

            {/* Paginação - esconde quando mostra só favoritos */}
            {!mostrarApenasFavoritos && (
                <>
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
                </>
            )}
        </div>
    );
}
