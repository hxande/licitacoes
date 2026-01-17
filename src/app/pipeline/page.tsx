'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    LayoutGrid,
    TrendingUp,
    Trophy,
    XCircle,
    Clock,
    Search,
    FileText,
    DollarSign,
} from 'lucide-react';
import { usePipeline } from '@/hooks/usePipeline';
import { KanbanBoard } from '@/components/KanbanBoard';

export default function PipelinePage() {
    const {
        licitacoes,
        carregado,
        moverParaStatus,
        removerDoPipeline,
        atualizarObservacoes,
        estatisticas,
    } = usePipeline();

    const [filtroTexto, setFiltroTexto] = useState('');

    const licitacoesFiltradas = filtroTexto
        ? licitacoes.filter(l =>
            l.objeto.toLowerCase().includes(filtroTexto.toLowerCase()) ||
            l.orgao.toLowerCase().includes(filtroTexto.toLowerCase())
        )
        : licitacoes;

    const formatarMoeda = (valor: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
        }).format(valor);
    };

    if (!carregado) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-gray-500">Carregando...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/"
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span className="hidden sm:inline">Voltar</span>
                            </Link>
                            <div className="h-6 w-px bg-gray-200" />
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="w-6 h-6 text-amber-600" />
                                <h1 className="text-xl font-bold text-gray-800">
                                    Acompanhamento de Licitações
                                </h1>
                            </div>
                        </div>

                        {/* Busca */}
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={filtroTexto}
                                onChange={(e) => setFiltroTexto(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats */}
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div className="bg-white rounded-lg shadow-sm p-3">
                        <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <FileText className="w-4 h-4" />
                            <span className="text-xs">Total</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-800">{estatisticas.total}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-3">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <Search className="w-4 h-4" />
                            <span className="text-xs">Encontradas</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{estatisticas.encontradas}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-3">
                        <div className="flex items-center gap-2 text-yellow-600 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs">Analisando</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-600">{estatisticas.analisando}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-3">
                        <div className="flex items-center gap-2 text-purple-600 mb-1">
                            <FileText className="w-4 h-4" />
                            <span className="text-xs">Propostas</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">{estatisticas.propostaEnviada}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-3">
                        <div className="flex items-center gap-2 text-orange-600 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">Aguardando</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-600">{estatisticas.aguardando}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-3">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                            <Trophy className="w-4 h-4" />
                            <span className="text-xs">Ganhas</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">{estatisticas.ganhas}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-3">
                        <div className="flex items-center gap-2 text-red-600 mb-1">
                            <XCircle className="w-4 h-4" />
                            <span className="text-xs">Perdidas</span>
                        </div>
                        <p className="text-2xl font-bold text-red-600">{estatisticas.perdidas}</p>
                    </div>
                </div>

                {/* Valor total ganho */}
                {estatisticas.valorTotalGanhas > 0 && (
                    <div className="mt-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg shadow-sm p-4 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                <span className="font-medium">Valor Total de Licitações Ganhas</span>
                            </div>
                            <span className="text-2xl font-bold">
                                {formatarMoeda(estatisticas.valorTotalGanhas)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Kanban */}
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                {licitacoes.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                        <LayoutGrid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">
                            Nenhuma licitação em acompanhamento
                        </h2>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            Adicione licitações clicando no botão + nos cards da página principal.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Ir para Licitações
                        </Link>
                    </div>
                ) : (
                    <KanbanBoard
                        licitacoes={licitacoesFiltradas}
                        onMover={moverParaStatus}
                        onRemover={removerDoPipeline}
                        onAtualizarObservacoes={atualizarObservacoes}
                    />
                )}
            </div>
        </div>
    );
}
