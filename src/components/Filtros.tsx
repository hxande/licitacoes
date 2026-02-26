'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, DollarSign, X, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { FiltrosLicitacao, UFS, MODALIDADES, AREAS_ATUACAO } from '@/types/licitacao';

interface FiltrosProps {
    onBuscar: (filtros: FiltrosLicitacao) => void;
    loading: boolean;
}

const FONTES = [
    { id: 'PNCP', label: 'PNCP', desc: 'Gov. Federal', ativo: 'bg-blue-600 text-white', inativo: 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50' },
    { id: 'SESI', label: 'SESI', desc: 'Indústria', ativo: 'bg-amber-500 text-white', inativo: 'bg-white text-amber-600 border border-amber-300 hover:bg-amber-50' },
    { id: 'SENAI', label: 'SENAI', desc: 'Indústria', ativo: 'bg-orange-500 text-white', inativo: 'bg-white text-orange-600 border border-orange-300 hover:bg-orange-50' },
    { id: 'SENAC', label: 'SENAC', desc: 'Comércio', ativo: 'bg-teal-600 text-white', inativo: 'bg-white text-teal-600 border border-teal-300 hover:bg-teal-50' },
];

const PERIODOS = [
    { id: '7d', label: '7 dias', dias: 7 },
    { id: '15d', label: '15 dias', dias: 15 },
    { id: '30d', label: '30 dias', dias: 30 },
    { id: '60d', label: '60 dias', dias: 60 },
];

const TIPOS_RAPIDOS = [
    { id: '', label: 'Todos' },
    { id: '6', label: 'Pregão' },
    { id: '8', label: 'Dispensa', destaque: true },
];

const VALOR_CHIPS = [
    { id: '', label: 'Qualquer', max: undefined as number | undefined },
    { id: '57k', label: '≤ R$57k', max: 57000 },
    { id: '114k', label: '≤ R$114k', max: 114000 },
    { id: '500k', label: '≤ R$500k', max: 500000 },
];

const STORAGE_KEY = 'licitaly_filtros_v1';

interface EstadoFiltros {
    fontes: string[];
    periodoId: string;
    dataInicio: string;
    dataFim: string;
    termo: string;
    uf: string;
    modalidade: string;
    area: string;
    valorId: string;
}

function calcularDatas(periodoId: string): { dataInicio: string; dataFim: string } {
    const hoje = new Date();
    const p = PERIODOS.find(p => p.id === periodoId);
    const dias = p?.dias ?? 15;
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - dias);
    return {
        dataInicio: inicio.toISOString().split('T')[0],
        dataFim: hoje.toISOString().split('T')[0],
    };
}

function estadoPadrao(): EstadoFiltros {
    const { dataInicio, dataFim } = calcularDatas('15d');
    return {
        fontes: ['PNCP', 'SESI', 'SENAI', 'SENAC'],
        periodoId: '15d',
        dataInicio,
        dataFim,
        termo: '',
        uf: '',
        modalidade: '',
        area: '',
        valorId: '',
    };
}

function lerStorage(): EstadoFiltros {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return estadoPadrao();
        const salvo = JSON.parse(raw) as Partial<EstadoFiltros>;
        const padrao = estadoPadrao();
        // Recalcular datas se o período não for custom
        const periodoId = salvo.periodoId ?? '15d';
        const datas = periodoId !== 'custom'
            ? calcularDatas(periodoId)
            : { dataInicio: salvo.dataInicio ?? padrao.dataInicio, dataFim: salvo.dataFim ?? padrao.dataFim };
        return { ...padrao, ...salvo, ...datas, periodoId };
    } catch {
        return estadoPadrao();
    }
}

function salvarStorage(estado: EstadoFiltros) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    } catch {
        // silently ignore
    }
}

export function Filtros({ onBuscar, loading }: FiltrosProps) {
    const [estado, setEstado] = useState<EstadoFiltros>(estadoPadrao);
    const [avancado, setAvancado] = useState(false);

    // Hydrate from localStorage after mount to avoid server/client mismatch
    useEffect(() => {
        setEstado(lerStorage());
    }, []);

    const toggleFonte = (id: string) => {
        const novas = estado.fontes.includes(id)
            ? estado.fontes.filter(f => f !== id)
            : [...estado.fontes, id];
        if (novas.length === 0) return;
        setEstado(prev => ({ ...prev, fontes: novas }));
    };

    const selecionarPeriodo = (periodoId: string) => {
        const datas = calcularDatas(periodoId);
        setEstado(prev => ({ ...prev, periodoId, ...datas }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        salvarStorage(estado);
        const valorChip = VALOR_CHIPS.find(v => v.id === estado.valorId);
        onBuscar({
            termo: estado.termo || undefined,
            uf: estado.uf || undefined,
            modalidade: estado.modalidade || undefined,
            area: estado.area || undefined,
            dataInicio: estado.dataInicio,
            dataFim: estado.dataFim,
            fontes: estado.fontes,
            valorMaximo: valorChip?.max,
        });
    };

    const limpar = () => {
        const novo = estadoPadrao();
        setEstado(novo);
    };

    const temFiltrosAvancados = !!(estado.uf || estado.area || estado.valorId || estado.periodoId === 'custom');

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
            {/* Linha 1: Fontes + Período */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
                {/* Fontes */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mr-0.5">Fontes</span>
                    {FONTES.map(f => {
                        const ativo = estado.fontes.includes(f.id);
                        return (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => toggleFonte(f.id)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${ativo ? f.ativo : f.inativo}`}
                            >
                                {ativo ? '✓ ' : ''}{f.label}
                            </button>
                        );
                    })}
                </div>

                {/* Separador */}
                <div className="h-4 w-px bg-gray-200 hidden sm:block" />

                {/* Período */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mr-0.5">Período</span>
                    {PERIODOS.map(p => {
                        const ativo = estado.periodoId === p.id;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => selecionarPeriodo(p.id)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${ativo ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>

                {/* Separador */}
                <div className="h-4 w-px bg-gray-200 hidden sm:block" />

                {/* Tipo */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mr-0.5">Tipo</span>
                    {TIPOS_RAPIDOS.map(t => {
                        const ativo = estado.modalidade === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setEstado(prev => ({ ...prev, modalidade: t.id }))}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${ativo
                                    ? t.destaque ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-white'
                                    : t.destaque
                                        ? 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50'
                                        : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {t.id === '8' && ativo ? '⚡ ' : ''}{t.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Linha 2: Campo de busca + botão */}
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar por objeto, órgão, município... (opcional)"
                        value={estado.termo}
                        onChange={e => setEstado(prev => ({ ...prev, termo: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-gray-900 placeholder-gray-400 text-sm"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || estado.fontes.length === 0}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium text-sm whitespace-nowrap shadow-sm"
                >
                    {loading ? (
                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Buscando...</>
                    ) : (
                        <><Search className="w-4 h-4" /> Pesquisar</>
                    )}
                </button>
            </div>

            {/* Linha 3: Toggle filtros avançados */}
            <div className="mt-3 flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => setAvancado(v => !v)}
                    className={`flex items-center gap-1.5 text-xs font-medium transition ${(avancado || temFiltrosAvancados) ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Filter className="w-3.5 h-3.5" />
                    {avancado ? 'Ocultar filtros' : 'Filtros avançados'}
                    {temFiltrosAvancados && !avancado && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />}
                    {avancado ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {temFiltrosAvancados && (
                    <button
                        type="button"
                        onClick={limpar}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"
                    >
                        <X className="w-3 h-3" />
                        Limpar
                    </button>
                )}
            </div>

            {/* Filtros avançados */}
            {avancado && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                {/* Valor */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Valor máx.</span>
                    {VALOR_CHIPS.map(v => {
                        const ativo = estado.valorId === v.id;
                        return (
                            <button
                                key={v.id}
                                type="button"
                                onClick={() => setEstado(prev => ({ ...prev, valorId: v.id }))}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${ativo ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
                            >
                                {v.label}
                            </button>
                        );
                    })}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Estado (UF)
                        </label>
                        <select
                            value={estado.uf}
                            onChange={e => setEstado(prev => ({ ...prev, uf: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800"
                        >
                            <option value="">Todos</option>
                            {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> Modalidade
                        </label>
                        <select
                            value={estado.modalidade}
                            onChange={e => setEstado(prev => ({ ...prev, modalidade: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800"
                        >
                            <option value="">Todas</option>
                            {Object.entries(MODALIDADES).map(([id, nome]) => (
                                <option key={id} value={id}>{nome}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> Área
                        </label>
                        <select
                            value={estado.area}
                            onChange={e => setEstado(prev => ({ ...prev, area: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-800"
                        >
                            <option value="">Todas</option>
                            {AREAS_ATUACAO.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Datas personalizadas</label>
                        <div className="flex gap-1 items-center">
                            <input
                                type="date"
                                value={estado.dataInicio}
                                onChange={e => setEstado(prev => ({ ...prev, dataInicio: e.target.value, periodoId: 'custom' }))}
                                className="flex-1 px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs text-gray-800"
                            />
                            <span className="text-gray-400 text-xs">–</span>
                            <input
                                type="date"
                                value={estado.dataFim}
                                onChange={e => setEstado(prev => ({ ...prev, dataFim: e.target.value, periodoId: 'custom' }))}
                                className="flex-1 px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs text-gray-800"
                            />
                        </div>
                    </div>
                </div>
                </div>
            )}
        </form>
    );
}
