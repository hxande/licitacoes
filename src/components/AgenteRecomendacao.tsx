'use client';

import { useEffect, useState } from 'react';
import { useAgenteRecomendacao } from '@/hooks/useAgenteRecomendacao';
import { RecomendacaoLicitacao, ConfiguracaoAgente } from '@/types/agente-recomendacao';

interface AgenteRecomendacaoProps {
    onSelecionarLicitacao?: (licitacaoId: string) => void;
}

export default function AgenteRecomendacao({ onSelecionarLicitacao }: AgenteRecomendacaoProps) {
    const {
        analise,
        loading,
        error,
        statusAgente,
        executarAnalise,
        verificarStatus,
        limparAnalise
    } = useAgenteRecomendacao();

    const [configuracao, setConfiguracao] = useState<ConfiguracaoAgente>({
        maxLicitacoesAnalise: 20,
        scoreMinimo: 40,
        ordenarPor: 'compatibilidade'
    });

    const [mostrarConfig, setMostrarConfig] = useState(false);

    useEffect(() => {
        verificarStatus();
    }, [verificarStatus]);

    const handleExecutar = () => {
        executarAnalise(configuracao);
    };

    const formatarValor = (valor?: number) => {
        if (!valor) return 'Não informado';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    };

    const formatarData = (data?: string) => {
        if (!data) return 'Não informada';
        return new Date(data).toLocaleDateString('pt-BR');
    };

    const getCorNivel = (nivel: string) => {
        switch (nivel) {
            case 'Excelente': return 'bg-green-100 text-green-800 border-green-200';
            case 'Bom': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Moderado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getCorPrioridade = (prioridade: string) => {
        switch (prioridade) {
            case 'Alta': return 'bg-red-500';
            case 'Média': return 'bg-yellow-500';
            default: return 'bg-gray-400';
        }
    };

    const getCorScore = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-blue-600';
        if (score >= 40) return 'text-yellow-600';
        return 'text-gray-600';
    };

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Agente de Recomendações</h2>
                            <p className="text-purple-100 text-sm">IA que encontra as melhores licitações para você</p>
                        </div>
                    </div>
                    
                    {statusAgente && (
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${statusAgente.pronto ? 'bg-green-400' : 'bg-yellow-400'}`} />
                            <span className="text-white text-sm">
                                {statusAgente.pronto ? 'Pronto' : 'Configuração pendente'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Status e Configuração */}
            <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {statusAgente && !statusAgente.perfilConfigurado && (
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Configure seu perfil primeiro
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMostrarConfig(!mostrarConfig)}
                            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Configurações"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        
                        <button
                            onClick={handleExecutar}
                            disabled={loading || !statusAgente?.pronto}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                                ${loading || !statusAgente?.pronto
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
                                }
                            `}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Analisando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Buscar Recomendações
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Painel de Configuração */}
                {mostrarConfig && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-700 mb-3">Configurações da Análise</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    Máx. licitações para análise
                                </label>
                                <input
                                    type="number"
                                    min="5"
                                    max="50"
                                    value={configuracao.maxLicitacoesAnalise}
                                    onChange={(e) => setConfiguracao({
                                        ...configuracao,
                                        maxLicitacoesAnalise: parseInt(e.target.value) || 20
                                    })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    Score mínimo (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={configuracao.scoreMinimo}
                                    onChange={(e) => setConfiguracao({
                                        ...configuracao,
                                        scoreMinimo: parseInt(e.target.value) || 40
                                    })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    Ordenar por
                                </label>
                                <select
                                    value={configuracao.ordenarPor}
                                    onChange={(e) => setConfiguracao({
                                        ...configuracao,
                                        ordenarPor: e.target.value as 'compatibilidade' | 'valor' | 'dataAbertura'
                                    })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="compatibilidade">Compatibilidade</option>
                                    <option value="valor">Valor</option>
                                    <option value="dataAbertura">Data de Abertura</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Erro */}
            {error && (
                <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="text-red-700 font-medium">Erro na análise</p>
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="p-12 flex flex-col items-center justify-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-pulse" />
                        <div className="absolute inset-0 w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="mt-4 text-gray-600 font-medium">Analisando licitações...</p>
                    <p className="text-gray-400 text-sm">O agente está comparando oportunidades com seu perfil</p>
                </div>
            )}

            {/* Resultados */}
            {!loading && analise && (
                <div className="p-6">
                    {/* Resumo */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-800 mb-1">Resumo da Análise</h3>
                                <p className="text-gray-600">{analise.resumoGeral}</p>
                                <div className="flex gap-4 mt-3">
                                    <span className="text-sm text-gray-500">
                                        <strong className="text-gray-700">{analise.totalAnalisadas}</strong> analisadas
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        <strong className="text-purple-600">{analise.totalRecomendadas}</strong> recomendadas
                                    </span>
                                    <span className="text-sm text-gray-400">
                                        {formatarData(analise.dataAnalise)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Insights */}
                    {(analise.insights.oportunidadesDestaque.length > 0 || 
                      analise.insights.tendenciasMercado.length > 0) && (
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analise.insights.oportunidadesDestaque.length > 0 && (
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                        Oportunidades em Destaque
                                    </h4>
                                    <ul className="space-y-1">
                                        {analise.insights.oportunidadesDestaque.map((op, i) => (
                                            <li key={i} className="text-sm text-green-700">• {op}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {analise.insights.tendenciasMercado.length > 0 && (
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                        Tendências do Mercado
                                    </h4>
                                    <ul className="space-y-1">
                                        {analise.insights.tendenciasMercado.map((t, i) => (
                                            <li key={i} className="text-sm text-blue-700">• {t}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Lista de Recomendações */}
                    {analise.recomendacoes.length > 0 ? (
                        <div>
                            <h3 className="font-semibold text-gray-800 mb-4">
                                Licitações Recomendadas ({analise.recomendacoes.length})
                            </h3>
                            <div className="space-y-4">
                                {analise.recomendacoes.map((rec, index) => (
                                    <CardRecomendacao
                                        key={rec.licitacaoId}
                                        recomendacao={rec}
                                        posicao={index + 1}
                                        formatarValor={formatarValor}
                                        formatarData={formatarData}
                                        getCorNivel={getCorNivel}
                                        getCorPrioridade={getCorPrioridade}
                                        getCorScore={getCorScore}
                                        onSelecionar={onSelecionarLicitacao}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-gray-500">Nenhuma licitação compatível encontrada</p>
                            <p className="text-gray-400 text-sm">Tente ajustar seu perfil ou os filtros da busca</p>
                        </div>
                    )}

                    {/* Sugestões para o Perfil */}
                    {analise.insights.sugestoesPerfilEmpresa.length > 0 && (
                        <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                            <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                Sugestões para Melhorar seu Perfil
                            </h4>
                            <ul className="space-y-1">
                                {analise.insights.sugestoesPerfilEmpresa.map((s, i) => (
                                    <li key={i} className="text-sm text-amber-700">• {s}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Estado Inicial */}
            {!loading && !analise && !error && (
                <div className="p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                        Encontre as melhores oportunidades
                    </h3>
                    <p className="text-gray-500 mb-4 max-w-md mx-auto">
                        O agente de IA analisa licitações recentes e identifica as que melhor 
                        combinam com o perfil da sua empresa, economizando seu tempo.
                    </p>
                    <button
                        onClick={handleExecutar}
                        disabled={!statusAgente?.pronto}
                        className={`
                            inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                            ${!statusAgente?.pronto
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
                            }
                        `}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Iniciar Análise
                    </button>
                </div>
            )}
        </div>
    );
}

// Componente do Card de Recomendação
interface CardRecomendacaoProps {
    recomendacao: RecomendacaoLicitacao;
    posicao: number;
    formatarValor: (valor?: number) => string;
    formatarData: (data?: string) => string;
    getCorNivel: (nivel: string) => string;
    getCorPrioridade: (prioridade: string) => string;
    getCorScore: (score: number) => string;
    onSelecionar?: (id: string) => void;
}

function CardRecomendacao({
    recomendacao,
    posicao,
    formatarValor,
    formatarData,
    getCorNivel,
    getCorPrioridade,
    getCorScore,
    onSelecionar
}: CardRecomendacaoProps) {
    const [expandido, setExpandido] = useState(false);

    return (
        <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            {/* Header do Card */}
            <div className="p-4 bg-gray-50 border-b">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full font-bold text-sm">
                            {posicao}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-800 line-clamp-2">
                                {recomendacao.objeto}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                                {recomendacao.orgao}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getCorPrioridade(recomendacao.prioridade)}`} />
                            <span className="text-xs text-gray-500">Prioridade {recomendacao.prioridade}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCorNivel(recomendacao.nivel)}`}>
                            {recomendacao.nivel}
                        </span>
                    </div>
                </div>
                
                {/* Métricas */}
                <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1">
                        <span className={`text-2xl font-bold ${getCorScore(recomendacao.scoreCompatibilidade)}`}>
                            {recomendacao.scoreCompatibilidade}%
                        </span>
                        <span className="text-xs text-gray-400">match</span>
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                    <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                        <div>
                            <span className="text-gray-400 text-xs">Local</span>
                            <p className="font-medium">{recomendacao.uf}{recomendacao.municipio ? ` / ${recomendacao.municipio}` : ''}</p>
                        </div>
                        <div>
                            <span className="text-gray-400 text-xs">Valor</span>
                            <p className="font-medium">{formatarValor(recomendacao.valorEstimado)}</p>
                        </div>
                        <div>
                            <span className="text-gray-400 text-xs">Abertura</span>
                            <p className="font-medium">{formatarData(recomendacao.dataAbertura)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Motivos do Match */}
            <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                    {recomendacao.motivosMatch.slice(0, expandido ? undefined : 3).map((motivo, i) => (
                        <span key={i} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                            ✓ {motivo}
                        </span>
                    ))}
                    {!expandido && recomendacao.motivosMatch.length > 3 && (
                        <span className="px-2 py-1 text-gray-400 text-xs">
                            +{recomendacao.motivosMatch.length - 3} mais
                        </span>
                    )}
                </div>

                {/* Alertas */}
                {recomendacao.alertas.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {recomendacao.alertas.map((alerta, i) => (
                            <span key={i} className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">
                                ⚠ {alerta}
                            </span>
                        ))}
                    </div>
                )}

                {/* Estratégia (expandida) */}
                {expandido && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <h5 className="font-medium text-blue-800 text-sm mb-1">Estratégia Sugerida:</h5>
                        <p className="text-blue-700 text-sm">{recomendacao.estrategiaSugerida}</p>
                    </div>
                )}

                {/* Ações */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <button
                        onClick={() => setExpandido(!expandido)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        {expandido ? 'Ver menos' : 'Ver mais detalhes'}
                    </button>
                    
                    <div className="flex gap-2">
                        {onSelecionar && (
                            <button
                                onClick={() => onSelecionar(recomendacao.licitacaoId)}
                                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Ver Licitação
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
