'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle,
    CheckCircle,
    AlertCircle,
    Loader2,
    Shield,
    ShieldAlert,
    ShieldCheck,
    ChevronDown,
    ChevronUp,
    Lightbulb,
    ThumbsUp,
    RefreshCw,
} from 'lucide-react';
import {
    AnaliseRisco,
    NivelRisco,
    NIVEL_RISCO_CONFIG,
    TIPOS_RISCO,
} from '@/types/analise-risco';
import { Licitacao } from '@/types/licitacao';

interface AnaliseRiscoViewProps {
    licitacao: Licitacao;
}

// Extrair CNPJ, ano e sequencial do ID da licitação
function extrairDadosId(id: string): { cnpj: string; ano: string; sequencial: string } | null {
    const partes = id.split('-');
    if (partes.length >= 3) {
        return {
            cnpj: partes[0],
            ano: partes[1],
            sequencial: partes[2],
        };
    }
    return null;
}

export function AnaliseRiscoView({ licitacao }: AnaliseRiscoViewProps) {
    const [analise, setAnalise] = useState<AnaliseRisco | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [iniciado, setIniciado] = useState(false);

    const analisarRisco = useCallback(async () => {
        setIniciado(true);
        setLoading(true);
        setError(null);

        try {
            const dadosId = extrairDadosId(licitacao.id);

            const response = await fetch('/api/analisar-risco', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cnpj: dadosId?.cnpj || licitacao.cnpjOrgao,
                    ano: dadosId?.ano,
                    sequencial: dadosId?.sequencial,
                    dadosLicitacao: {
                        id: licitacao.id,
                        orgao: licitacao.orgao,
                        objeto: licitacao.objeto,
                        modalidade: licitacao.modalidade,
                        valorEstimado: licitacao.valorEstimado,
                        dataAbertura: licitacao.dataAbertura,
                        dataPublicacao: licitacao.dataPublicacao,
                    },
                }),
            });

            const data = await response.json();

            if (data.success && data.analise) {
                setAnalise(data.analise);
            } else {
                setError(data.error || 'Não foi possível analisar a licitação');
            }
        } catch (err) {
            console.error('Erro na análise:', err);
            setError('Erro ao conectar com o servidor.');
        } finally {
            setLoading(false);
        }
    }, [licitacao]);

    const toggleItem = (id: string) => {
        const newSet = new Set(expandedItems);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedItems(newSet);
    };

    const getScoreColor = (score: number) => {
        if (score <= 30) return 'text-green-600';
        if (score <= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreBgColor = (score: number) => {
        if (score <= 30) return 'bg-green-500';
        if (score <= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getShieldIcon = (nivel: NivelRisco) => {
        switch (nivel) {
            case 'baixo':
                return <ShieldCheck className="w-12 h-12 text-green-500" />;
            case 'medio':
                return <Shield className="w-12 h-12 text-yellow-500" />;
            case 'alto':
                return <ShieldAlert className="w-12 h-12 text-red-500" />;
        }
    };

    const getSeverityIcon = (severidade: NivelRisco) => {
        switch (severidade) {
            case 'baixo':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'medio':
                return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            case 'alto':
                return <AlertTriangle className="w-5 h-5 text-red-500" />;
        }
    };

    // Tela inicial - aguarda clique para analisar
    if (!iniciado) {
        return (
            <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-10 h-10 text-orange-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Análise de Risco
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    A IA irá analisar cláusulas, requisitos, prazos e identificar potenciais riscos nesta licitação.
                </p>
                <button
                    onClick={analisarRisco}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition font-medium shadow-lg"
                >
                    <Shield className="w-5 h-5" />
                    Analisar Riscos com IA
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-orange-600 animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Analisando Riscos com IA
                </h3>
                <p className="text-gray-600 mb-4">
                    Verificando cláusulas, requisitos e prazos...
                </p>
                <div className="flex items-center justify-center gap-2 text-orange-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Erro na Análise
                </h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                    onClick={analisarRisco}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Tentar Novamente
                </button>
            </div>
        );
    }

    if (!analise) return null;

    const config = NIVEL_RISCO_CONFIG[analise.nivelRisco];

    return (
        <div className="space-y-6">
            {/* Header com Score */}
            <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                <div className="flex-shrink-0">{getShieldIcon(analise.nivelRisco)}</div>
                <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">
                            Risco {config.label}
                        </h3>
                        <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${config.bgCor} ${config.cor}`}
                        >
                            Score: {analise.scoreGeral}/100
                        </span>
                    </div>
                    <p className="text-gray-600">{analise.resumo}</p>
                </div>
                <div className="flex-shrink-0 w-20 h-20 relative">
                    <svg className="w-20 h-20 transform -rotate-90">
                        <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-gray-200"
                        />
                        <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${(analise.scoreGeral / 100) * 226} 226`}
                            className={getScoreColor(analise.scoreGeral)}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-xl font-bold ${getScoreColor(analise.scoreGeral)}`}>
                            {analise.scoreGeral}
                        </span>
                    </div>
                </div>
            </div>

            {/* Itens de Risco */}
            <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Pontos de Atenção ({analise.itensRisco.length})
                </h4>
                <div className="space-y-3">
                    {analise.itensRisco.map((item) => {
                        const tipoConfig = TIPOS_RISCO[item.tipo];
                        const isExpanded = expandedItems.has(item.id);
                        const sevConfig = NIVEL_RISCO_CONFIG[item.severidade];

                        return (
                            <div
                                key={item.id}
                                className={`border rounded-lg overflow-hidden ${item.severidade === 'alto'
                                        ? 'border-red-200 bg-red-50'
                                        : item.severidade === 'medio'
                                            ? 'border-yellow-200 bg-yellow-50'
                                            : 'border-gray-200 bg-white'
                                    }`}
                            >
                                <button
                                    onClick={() => toggleItem(item.id)}
                                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-opacity-80 transition-colors"
                                >
                                    {getSeverityIcon(item.severidade)}
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{tipoConfig.icone}</span>
                                            <span className="font-medium text-gray-800">
                                                {item.titulo}
                                            </span>
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full ${sevConfig.bgCor} ${sevConfig.cor}`}
                                            >
                                                {sevConfig.label}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {tipoConfig.label}
                                        </span>
                                    </div>
                                    {isExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>

                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 border-t border-gray-200">
                                        <p className="text-gray-700 mt-3">{item.descricao}</p>
                                        {item.recomendacao && (
                                            <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                                                <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="text-sm font-medium text-blue-800">
                                                        Recomendação:
                                                    </span>
                                                    <p className="text-sm text-blue-700 mt-1">
                                                        {item.recomendacao}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Pontos Positivos */}
            {analise.pontosPositivos.length > 0 && (
                <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <ThumbsUp className="w-5 h-5 text-green-500" />
                        Pontos Positivos
                    </h4>
                    <div className="bg-green-50 rounded-lg p-4">
                        <ul className="space-y-2">
                            {analise.pontosPositivos.map((ponto, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-green-800">{ponto}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Recomendação Geral */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    Recomendação Final
                </h4>
                <p className="text-blue-700">{analise.recomendacaoGeral}</p>
            </div>

            {/* Footer */}
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
                Análise realizada em{' '}
                {new Date(analise.analisadoEm).toLocaleString('pt-BR')}
                <button
                    onClick={analisarRisco}
                    className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                    <RefreshCw className="w-3 h-3" />
                    Reanalisar
                </button>
            </div>
        </div>
    );
}
