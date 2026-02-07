'use client';

import { useState, useEffect } from 'react';
import {
    X,
    TrendingUp,
    Users,
    DollarSign,
    Building2,
    AlertTriangle,
    Lightbulb,
    BarChart3,
    Trophy,
    Loader2,
    Database,
    RefreshCw,
    Clock,
} from 'lucide-react';
import { Licitacao } from '@/types/licitacao';
import { AnaliseMercado } from '@/types/historico';

interface ModalAnaliseMercadoProps {
    isOpen: boolean;
    onClose: () => void;
    licitacao: Licitacao;
}

interface StatsHistorico {
    totalContratos: number;
    totalLicitacoes: number;
    periodoInicio: string;
    periodoFim: string;
    ultimaAtualizacao: string;
}

export function ModalAnaliseMercado({ isOpen, onClose, licitacao }: ModalAnaliseMercadoProps) {
    const [loading, setLoading] = useState(false);
    const [carregandoDados, setCarregandoDados] = useState(false);
    const [analise, setAnalise] = useState<AnaliseMercado | null>(null);
    const [stats, setStats] = useState<StatsHistorico | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const [needsLoad, setNeedsLoad] = useState(false);
    const [fromCache, setFromCache] = useState(false);
    const [cachedAt, setCachedAt] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !analise) {
            carregarAnalise();
        }
    }, [isOpen]);

    const carregarAnalise = async (forcarNovaAnalise = false) => {
        setLoading(true);
        setErro(null);
        setFromCache(false);
        setCachedAt(null);

        try {
            const response = await fetch('/api/analisar-mercado', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    licitacaoId: licitacao.id,
                    objeto: licitacao.objeto,
                    uf: licitacao.uf,
                    cnpjOrgao: licitacao.cnpjOrgao,
                    valorEstimado: licitacao.valorEstimado,
                    forcarNovaAnalise,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setAnalise(data.analise);
                setStats(data.stats);
                setNeedsLoad(false);
                setFromCache(data.fromCache || false);
                setCachedAt(data.cachedAt || null);
            } else if (data.needsLoad) {
                setNeedsLoad(true);
                setErro('Nenhum dado histórico disponível');
            } else {
                setErro(data.error || 'Erro ao carregar análise');
            }
        } catch {
            setErro('Erro ao conectar com o servidor');
        } finally {
            setLoading(false);
        }
    };

    const carregarDadosHistoricos = async () => {
        setCarregandoDados(true);
        setErro(null);

        try {
            const response = await fetch('/api/historico', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meses: 6, maxPaginas: 30 }),
            });

            const data = await response.json();

            if (data.success) {
                setStats(data.stats);
                setNeedsLoad(false);
                // Recarregar análise
                await carregarAnalise();
            } else {
                setErro(data.error || 'Erro ao carregar dados');
            }
        } catch {
            setErro('Erro ao carregar dados históricos');
        } finally {
            setCarregandoDados(false);
        }
    };

    const formatarMoeda = (valor: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
        }).format(valor);
    };

    const formatarData = (dataStr: string) => {
        try {
            return new Date(dataStr).toLocaleDateString('pt-BR');
        } catch {
            return dataStr;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Overlay */}
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <BarChart3 className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        Análise de Mercado
                                    </h2>
                                    <p className="text-purple-100 text-sm">
                                        Histórico de vencedores e preços praticados
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                                <p className="text-gray-600 font-medium">
                                    Analisando dados históricos...
                                </p>
                            </div>
                        ) : needsLoad ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Database className="w-16 h-16 text-gray-300 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                    Base de dados vazia
                                </h3>
                                <p className="text-gray-500 text-center mb-6 max-w-md">
                                    Para usar a análise de mercado, precisamos carregar dados históricos
                                    de contratos do PNCP. Isso é feito apenas uma vez.
                                </p>
                                <button
                                    onClick={carregarDadosHistoricos}
                                    disabled={carregandoDados}
                                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {carregandoDados ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Carregando dados...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-5 h-5" />
                                            Carregar dados históricos
                                        </>
                                    )}
                                </button>
                                <p className="text-xs text-gray-400 mt-3">
                                    Isso pode levar alguns segundos
                                </p>
                            </div>
                        ) : erro ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                                <p className="text-gray-800 font-medium">{erro}</p>
                                <button
                                    onClick={() => carregarAnalise()}
                                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    Tentar novamente
                                </button>
                            </div>
                        ) : !analise ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Database className="w-12 h-12 text-gray-300 mb-4" />
                                <p className="text-gray-600 font-medium">
                                    Nenhum contrato similar encontrado no histórico
                                </p>
                                {stats && (
                                    <p className="text-gray-400 text-sm mt-2">
                                        Base atual: {stats.totalContratos.toLocaleString()} contratos
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Indicador de Cache */}
                                {fromCache && (
                                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center gap-2 text-blue-700">
                                            <Database className="w-4 h-4" />
                                            <span className="text-sm">
                                                Análise recuperada do cache
                                                {cachedAt && (
                                                    <span className="text-blue-500 ml-1">
                                                        <Clock className="w-3 h-3 inline mr-1" />
                                                        {formatarData(cachedAt)}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => carregarAnalise(true)}
                                            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Re-analisar com IA
                                        </button>
                                    </div>
                                )}

                                {/* Stats do Histórico */}
                                {stats && (
                                    <div className="text-xs text-gray-400 flex items-center gap-4 justify-end">
                                        <span>Base: {stats.totalContratos.toLocaleString()} contratos</span>
                                        <span>Período: {formatarData(stats.periodoInicio)} a {formatarData(stats.periodoFim)}</span>
                                    </div>
                                )}

                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <BarChart3 className="w-4 h-4 text-blue-600" />
                                            <span className="text-xs font-medium text-blue-600">
                                                Contratos Similares
                                            </span>
                                        </div>
                                        <p className="text-2xl font-bold text-blue-900">
                                            {analise.totalContratosAnalisados}
                                        </p>
                                    </div>

                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-4 h-4 text-green-600" />
                                            <span className="text-xs font-medium text-green-600">
                                                Preço Médio
                                            </span>
                                        </div>
                                        <p className="text-2xl font-bold text-green-900">
                                            {formatarMoeda(analise.faixaPrecos.media)}
                                        </p>
                                    </div>

                                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <DollarSign className="w-4 h-4 text-amber-600" />
                                            <span className="text-xs font-medium text-amber-600">
                                                Menor Preço
                                            </span>
                                        </div>
                                        <p className="text-2xl font-bold text-amber-900">
                                            {formatarMoeda(analise.faixaPrecos.minimo)}
                                        </p>
                                    </div>

                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users className="w-4 h-4 text-purple-600" />
                                            <span className="text-xs font-medium text-purple-600">
                                                Concentração Top 5
                                            </span>
                                        </div>
                                        <p className="text-2xl font-bold text-purple-900">
                                            {analise.concentracaoMercado.toFixed(0)}%
                                        </p>
                                    </div>
                                </div>

                                {/* Faixa de Preços Detalhada */}
                                <div className="bg-gray-50 rounded-xl p-5">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-green-600" />
                                        Faixa de Preços Praticados
                                    </h3>
                                    <div className="relative">
                                        <div className="h-4 bg-gradient-to-r from-green-300 via-yellow-300 to-red-300 rounded-full" />
                                        <div className="flex justify-between mt-2 text-sm">
                                            <div className="text-center">
                                                <p className="font-medium text-gray-800">
                                                    {formatarMoeda(analise.faixaPrecos.minimo)}
                                                </p>
                                                <p className="text-xs text-gray-500">Mínimo</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium text-gray-800">
                                                    {formatarMoeda(analise.faixaPrecos.mediana)}
                                                </p>
                                                <p className="text-xs text-gray-500">Mediana</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium text-gray-800">
                                                    {formatarMoeda(analise.faixaPrecos.maximo)}
                                                </p>
                                                <p className="text-xs text-gray-500">Máximo</p>
                                            </div>
                                        </div>
                                    </div>
                                    {licitacao.valorEstimado && (
                                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                            <p className="text-sm text-blue-800">
                                                <strong>Valor estimado desta licitação:</strong>{' '}
                                                {formatarMoeda(licitacao.valorEstimado)}
                                                {analise.faixaPrecos.media > 0 && (
                                                    <span className="ml-2">
                                                        ({licitacao.valorEstimado > analise.faixaPrecos.media
                                                            ? `${((licitacao.valorEstimado / analise.faixaPrecos.media - 1) * 100).toFixed(0)}% acima`
                                                            : `${((1 - licitacao.valorEstimado / analise.faixaPrecos.media) * 100).toFixed(0)}% abaixo`
                                                        } da média)
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Principais Concorrentes */}
                                {analise.principaisFornecedores.length > 0 && (
                                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-amber-500" />
                                            Principais Vencedores
                                        </h3>
                                        <div className="space-y-3">
                                            {analise.principaisFornecedores.slice(0, 5).map((fornecedor, index) => (
                                                <div
                                                    key={fornecedor.cnpj}
                                                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-amber-500' :
                                                        index === 1 ? 'bg-gray-400' :
                                                            index === 2 ? 'bg-amber-700' : 'bg-gray-300'
                                                        }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-800 truncate">
                                                            {fornecedor.nome}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            CNPJ: {fornecedor.cnpj} | UFs: {fornecedor.ufsAtuacao.join(', ')}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-gray-800">
                                                            {fornecedor.totalContratos} contratos
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {formatarMoeda(fornecedor.valorTotal)} total
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Insights e Recomendações */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    {/* Insights */}
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <BarChart3 className="w-5 h-5 text-blue-600" />
                                            Insights do Mercado
                                        </h3>
                                        <ul className="space-y-3">
                                            {analise.insights.map((insight, index) => (
                                                <li key={index} className="flex items-start gap-2">
                                                    <span className="text-blue-500 mt-1">•</span>
                                                    <span className="text-gray-700 text-sm">{insight}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Recomendações */}
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                            <Lightbulb className="w-5 h-5 text-green-600" />
                                            Recomendações
                                        </h3>
                                        <ul className="space-y-3">
                                            {analise.recomendacoes.map((rec, index) => (
                                                <li key={index} className="flex items-start gap-2">
                                                    <span className="text-green-500 mt-1">✓</span>
                                                    <span className="text-gray-700 text-sm">{rec}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Órgãos frequentes dos principais fornecedores */}
                                {analise.principaisFornecedores.length > 0 &&
                                    analise.principaisFornecedores[0].orgaosAtendidos.length > 0 && (
                                        <div className="bg-gray-50 rounded-xl p-5">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                                <Building2 className="w-5 h-5 text-gray-600" />
                                                Órgãos Atendidos pelo Principal Concorrente
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {analise.principaisFornecedores[0].orgaosAtendidos.slice(0, 8).map((orgao, index) => (
                                                    <span
                                                        key={index}
                                                        className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-700"
                                                    >
                                                        {orgao}
                                                    </span>
                                                ))}
                                                {analise.principaisFornecedores[0].orgaosAtendidos.length > 8 && (
                                                    <span className="px-3 py-1 bg-gray-200 rounded-full text-sm text-gray-600">
                                                        +{analise.principaisFornecedores[0].orgaosAtendidos.length - 8} outros
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
