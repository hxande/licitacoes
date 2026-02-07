'use client';

import { useState, useEffect } from 'react';
import { X, Brain, CheckCircle, XCircle, AlertTriangle, Loader2, Sparkles, Target, Lightbulb, ThumbsUp, ThumbsDown, RefreshCw, Database, Clock } from 'lucide-react';
import { Licitacao } from '@/types/licitacao';
import { PerfilEmpresa } from '@/types/empresa';

interface AnaliseMatchIA {
    compatibilidade: number;
    nivel: 'Excelente' | 'Bom' | 'Moderado' | 'Baixo';
    resumo: string;
    pontosFortes: string[];
    pontosFracos: string[];
    requisitosIdentificados: string[];
    recomendacao: string;
    dicasParticipacao: string[];
}

interface ModalMatchIAProps {
    licitacao: Licitacao;
    perfil: PerfilEmpresa;
    onClose: () => void;
}

export function ModalMatchIA({ licitacao, perfil, onClose }: ModalMatchIAProps) {
    const [analise, setAnalise] = useState<AnaliseMatchIA | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fromCache, setFromCache] = useState(false);
    const [cachedAt, setCachedAt] = useState<string | null>(null);

    const analisarMatch = async (forcarNovaAnalise = false) => {
        setLoading(true);
        setError(null);
        setFromCache(false);
        setCachedAt(null);

        try {
            const response = await fetch('/api/analisar-match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ licitacao, perfil, forcarNovaAnalise }),
            });

            const data = await response.json();

            if (data.success) {
                setAnalise(data.analise);
                setFromCache(data.fromCache || false);
                setCachedAt(data.cachedAt || null);
            } else {
                setError(data.error || 'Erro ao analisar match');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        analisarMatch();
    }, []);

    const formatarDataCache = (dataStr: string) => {
        try {
            return new Date(dataStr).toLocaleString('pt-BR');
        } catch {
            return dataStr;
        }
    };

    const getNivelStyle = (nivel: string) => {
        switch (nivel) {
            case 'Excelente':
                return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500', gradient: 'from-green-500 to-emerald-500' };
            case 'Bom':
                return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500', gradient: 'from-blue-500 to-cyan-500' };
            case 'Moderado':
                return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500', gradient: 'from-yellow-400 to-orange-400' };
            default:
                return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500', gradient: 'from-red-400 to-rose-400' };
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Brain className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Análise de Match com IA</h2>
                                <p className="text-white/80 text-sm">Powered by Gemini</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="relative">
                                <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-20"></div>
                                <Loader2 className="w-16 h-16 text-purple-600 animate-spin relative z-10" />
                            </div>
                            <p className="text-gray-600 mt-6 font-medium">Analisando compatibilidade...</p>
                            <p className="text-gray-400 text-sm mt-2">A IA está avaliando seu perfil contra a licitação</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="p-4 bg-red-100 rounded-full">
                                <XCircle className="w-12 h-12 text-red-500" />
                            </div>
                            <p className="text-red-600 mt-4 font-medium">{error}</p>
                            <button
                                onClick={() => analisarMatch()}
                                className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Tentar novamente
                            </button>
                        </div>
                    ) : analise ? (
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
                                                    {formatarDataCache(cachedAt)}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => analisarMatch(true)}
                                        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Re-analisar com IA
                                    </button>
                                </div>
                            )}

                            {/* Score principal */}
                            <div className={`p-6 rounded-xl border-2 ${getNivelStyle(analise.nivel).border} ${getNivelStyle(analise.nivel).bg}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className={`text-sm font-medium ${getNivelStyle(analise.nivel).text}`}>
                                            Compatibilidade
                                        </span>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <span className={`text-5xl font-bold ${getNivelStyle(analise.nivel).text}`}>
                                                {analise.compatibilidade}%
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r ${getNivelStyle(analise.nivel).gradient} text-white`}>
                                                {analise.nivel}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {analise.nivel === 'Excelente' && <Sparkles className="w-16 h-16 text-green-500" />}
                                        {analise.nivel === 'Bom' && <ThumbsUp className="w-16 h-16 text-blue-500" />}
                                        {analise.nivel === 'Moderado' && <AlertTriangle className="w-16 h-16 text-yellow-500" />}
                                        {analise.nivel === 'Baixo' && <ThumbsDown className="w-16 h-16 text-red-500" />}
                                    </div>
                                </div>
                                <p className="mt-4 text-gray-700">{analise.resumo}</p>
                            </div>

                            {/* Grid de análises */}
                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Pontos Fortes */}
                                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                    <h3 className="flex items-center gap-2 font-semibold text-green-800 mb-3">
                                        <CheckCircle className="w-5 h-5" />
                                        Pontos Fortes
                                    </h3>
                                    <ul className="space-y-2">
                                        {analise.pontosFortes.map((ponto, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                                                <span className="text-green-500 mt-0.5">✓</span>
                                                {ponto}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Pontos Fracos */}
                                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                                    <h3 className="flex items-center gap-2 font-semibold text-red-800 mb-3">
                                        <XCircle className="w-5 h-5" />
                                        Pontos de Atenção
                                    </h3>
                                    {analise.pontosFracos.length > 0 ? (
                                        <ul className="space-y-2">
                                            {analise.pontosFracos.map((ponto, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                                                    <span className="text-red-500 mt-0.5">!</span>
                                                    {ponto}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">Nenhum ponto fraco identificado</p>
                                    )}
                                </div>
                            </div>

                            {/* Requisitos Identificados */}
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                <h3 className="flex items-center gap-2 font-semibold text-blue-800 mb-3">
                                    <Target className="w-5 h-5" />
                                    Requisitos Técnicos Identificados
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {analise.requisitosIdentificados.map((req, i) => (
                                        <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                            {req}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Recomendação */}
                            <div className={`p-4 rounded-xl border-2 ${analise.nivel === 'Excelente' || analise.nivel === 'Bom'
                                ? 'bg-emerald-50 border-emerald-300'
                                : 'bg-amber-50 border-amber-300'
                                }`}>
                                <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
                                    💡 Recomendação
                                </h3>
                                <p className="text-gray-700">{analise.recomendacao}</p>
                            </div>

                            {/* Dicas */}
                            {analise.dicasParticipacao.length > 0 && (
                                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                                    <h3 className="flex items-center gap-2 font-semibold text-purple-800 mb-3">
                                        <Lightbulb className="w-5 h-5" />
                                        Dicas para Participação
                                    </h3>
                                    <ol className="space-y-2">
                                        {analise.dicasParticipacao.map((dica, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-purple-700">
                                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center text-xs font-bold">
                                                    {i + 1}
                                                </span>
                                                {dica}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="border-t bg-gray-50 px-6 py-4 flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                        {fromCache ? 'Análise do cache • ' : ''}Análise gerada por IA • Gemini 2.5 Flash
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
