'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend,
    AreaChart,
    Area,
} from 'recharts';
import {
    Building2,
    TrendingUp,
    DollarSign,
    MapPin,
    Calendar,
    Briefcase,
    ArrowLeft,
    Loader2,
    RefreshCw,
    Target,
    Zap,
    PieChart as PieChartIcon,
    BarChart3,
    Activity,
} from 'lucide-react';
import { NotificacaoBell } from '@/components/NotificacaoBell';
import { DashboardData } from '@/types/dashboard';

const COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#14B8A6', '#A855F7',
];

function formatarMoeda(valor: number): string {
    if (valor >= 1_000_000_000) {
        return `R$ ${(valor / 1_000_000_000).toFixed(1)}B`;
    }
    if (valor >= 1_000_000) {
        return `R$ ${(valor / 1_000_000).toFixed(1)}M`;
    }
    if (valor >= 1_000) {
        return `R$ ${(valor / 1_000).toFixed(1)}K`;
    }
    return `R$ ${valor.toFixed(0)}`;
}

function formatarMoedaCompleta(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(valor);
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [periodo, setPeriodo] = useState({
        inicio: getDataInicio(),
        fim: getDataFim(),
    });

    // Padrão: últimos 30 dias (mesmo período usado na pesquisa principal)
    function getDataInicio(): string {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    }

    function getDataFim(): string {
        // Usar data de hoje, não futuro
        return new Date().toISOString().split('T')[0];
    }

    const carregarDados = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                dataInicio: periodo.inicio,
                dataFim: periodo.fim,
            });

            const response = await fetch(`/api/dashboard?${params}`);
            const result = await response.json();

            if (result.success) {
                setData(result.data);
            } else {
                setError(result.error || 'Erro ao carregar dados');
            }
        } catch (err) {
            setError('Erro de conexão');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Carregando Dashboard</h2>
                    <p className="text-gray-600">Processando dados de licitações...</p>
                    <p className="text-sm text-gray-400 mt-2">Isso pode levar alguns segundos</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center bg-white rounded-xl p-8 shadow-lg max-w-md">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Activity className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Erro ao carregar</h2>
                    <p className="text-gray-600 mb-4">{error || 'Não foi possível carregar os dados'}</p>
                    <button
                        onClick={carregarDados}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/"
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </Link>
                            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl">
                                <BarChart3 className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Dashboard de Oportunidades
                                </h1>
                                <p className="text-gray-500">
                                    Inteligência de mercado para licitações públicas
                                </p>
                            </div>
                        </div>

                        {/* Filtro de Período */}
                        <div className="flex items-center gap-3">
                            <NotificacaoBell />
                            {/* Atalhos de período */}
                            <div className="flex gap-1">
                                {[
                                    { label: '7d', dias: 7 },
                                    { label: '15d', dias: 15 },
                                    { label: '30d', dias: 30 },
                                    { label: '90d', dias: 90 },
                                ].map((p) => {
                                    const dataInicio = new Date();
                                    dataInicio.setDate(dataInicio.getDate() - p.dias);
                                    const isAtivo = periodo.inicio === dataInicio.toISOString().split('T')[0];
                                    return (
                                        <button
                                            key={p.label}
                                            onClick={() => {
                                                const inicio = new Date();
                                                inicio.setDate(inicio.getDate() - p.dias);
                                                setPeriodo({
                                                    inicio: inicio.toISOString().split('T')[0],
                                                    fim: new Date().toISOString().split('T')[0],
                                                });
                                            }}
                                            className={`px-2 py-1 text-xs font-medium rounded transition ${isAtivo
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="h-6 w-px bg-gray-200" />
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <input
                                    type="date"
                                    value={periodo.inicio}
                                    onChange={(e) => setPeriodo({ ...periodo, inicio: e.target.value })}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900"
                                />
                                <span className="text-gray-400">até</span>
                                <input
                                    type="date"
                                    value={periodo.fim}
                                    onChange={(e) => setPeriodo({ ...periodo, fim: e.target.value })}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900"
                                />
                            </div>
                            <button
                                onClick={carregarDados}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Atualizar
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Resumo do Período */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5" />
                            <span className="font-medium">
                                Resumo do período: {new Date(data.periodo.inicio).toLocaleDateString('pt-BR')} a {new Date(data.periodo.fim).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                        <div className="text-sm opacity-80">
                            {Math.ceil((new Date(data.periodo.fim).getTime() - new Date(data.periodo.inicio).getTime()) / (1000 * 60 * 60 * 24))} dias analisados
                        </div>
                    </div>
                </div>

                {/* Cards de Estatísticas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Target className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-900">
                                    {data.estatisticas.totalLicitacoes.toLocaleString('pt-BR')}
                                </p>
                                <p className="text-sm text-gray-500">Licitações no período</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-green-600">
                                    {formatarMoeda(data.estatisticas.valorTotalEstimado)}
                                </p>
                                <p className="text-sm text-gray-500">Valor total no período</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-purple-600">
                                    {formatarMoeda(data.estatisticas.valorMedio)}
                                </p>
                                <p className="text-sm text-gray-500">Valor médio por licitação</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-orange-100 rounded-lg">
                                <Building2 className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-orange-600">
                                    {data.estatisticas.orgaosUnicos.toLocaleString('pt-BR')}
                                </p>
                                <p className="text-sm text-gray-500">Órgãos compradores</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gráficos - Linha 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Tendência Temporal */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            Tendência de Licitações
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={data.tendencia}>
                                <defs>
                                    <linearGradient id="colorQtd" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                    formatter={(value: any, name: any) => [
                                        name === 'quantidade' ? value : formatarMoedaCompleta(value),
                                        name === 'quantidade' ? 'Quantidade' : 'Valor Total'
                                    ]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="quantidade"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    fill="url(#colorQtd)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Sazonalidade */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-green-600" />
                            Sazonalidade por Mês
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.sazonalidade}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="mes"
                                    tick={{ fontSize: 10 }}
                                    stroke="#9CA3AF"
                                    tickFormatter={(value) => value.substring(0, 3)}
                                />
                                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                    formatter={(value: any) => [value, 'Licitações']}
                                />
                                <Bar dataKey="quantidade" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráficos - Linha 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Por Área/Segmento */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <PieChartIcon className="w-5 h-5 text-purple-600" />
                            Distribuição por Segmento
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={data.porArea.slice(0, 8) as any}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="quantidade"
                                    nameKey="area"
                                    label={({ payload }: any) => `${payload.area} (${payload.percentual.toFixed(0)}%)`}
                                    labelLine={false}
                                >
                                    {data.porArea.slice(0, 8).map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                    formatter={(value: any, name: any, props: any) => [
                                        `${value} licitações (${formatarMoeda(props.payload.valorTotal)})`,
                                        props.payload.area
                                    ]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Por Modalidade */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-orange-600" />
                            Por Modalidade
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.porModalidade.slice(0, 6)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                                <YAxis
                                    type="category"
                                    dataKey="modalidade"
                                    tick={{ fontSize: 10 }}
                                    stroke="#9CA3AF"
                                    width={150}
                                    tickFormatter={(value) => value.length > 25 ? value.substring(0, 25) + '...' : value}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                    formatter={(value: any, name: any, props: any) => [
                                        `${value} (${props.payload.percentual.toFixed(1)}%)`,
                                        'Licitações'
                                    ]}
                                />
                                <Bar dataKey="quantidade" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Por Estado */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-red-600" />
                        Distribuição por Estado
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.porUF.slice(0, 15)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="uf" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                            <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                formatter={(value: any, name: any) => [
                                    name === 'quantidade'
                                        ? `${value} licitações`
                                        : formatarMoedaCompleta(value),
                                    name === 'quantidade' ? 'Quantidade' : 'Valor Total'
                                ]}
                            />
                            <Legend />
                            <Bar dataKey="quantidade" name="Quantidade" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Órgãos */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                        Top 10 Órgãos com Mais Licitações
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">#</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Órgão</th>
                                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">UF</th>
                                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Licitações</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Valor Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topOrgaos.map((orgao, index) => (
                                    <tr key={orgao.cnpj} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4 text-sm text-gray-500">{index + 1}</td>
                                        <td className="py-3 px-4">
                                            <p className="text-sm font-medium text-gray-800 line-clamp-1">
                                                {orgao.orgao}
                                            </p>
                                            <p className="text-xs text-gray-400">{orgao.cnpj}</p>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                                                {orgao.uf}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="px-3 py-1 bg-blue-100 rounded-full text-sm font-semibold text-blue-700">
                                                {orgao.quantidade}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right text-sm font-medium text-green-600">
                                            {formatarMoedaCompleta(orgao.valorTotal)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Legenda de Segmentos */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Detalhamento por Segmento</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {data.porArea.map((area, index) => (
                            <div
                                key={area.area}
                                className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    />
                                    <span className="font-medium text-gray-800">{area.area}</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{area.quantidade}</p>
                                <p className="text-sm text-gray-500">
                                    {area.percentual.toFixed(1)}% • {formatarMoeda(area.valorTotal)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-100 mt-12">
                <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
                    <p>
                        Dados obtidos do{' '}
                        <a
                            href="https://pncp.gov.br"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            Portal Nacional de Contratações Públicas (PNCP)
                        </a>
                    </p>
                    <p className="mt-1">
                        Período: {new Date(data.periodo.inicio).toLocaleDateString('pt-BR')} a{' '}
                        {new Date(data.periodo.fim).toLocaleDateString('pt-BR')}
                    </p>
                </div>
            </footer>
        </div>
    );
}
