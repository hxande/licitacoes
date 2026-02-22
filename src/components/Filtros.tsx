'use client';

import { useState } from 'react';
import { Search, Filter, MapPin, Calendar, DollarSign, X, Tag } from 'lucide-react';
import { FiltrosLicitacao, UFS, MODALIDADES, AREAS_ATUACAO } from '@/types/licitacao';

interface FiltrosProps {
    onBuscar: (filtros: FiltrosLicitacao) => void;
    loading: boolean;
}

export function Filtros({ onBuscar, loading }: FiltrosProps) {
    const [filtros, setFiltros] = useState<FiltrosLicitacao>({
        termo: '',
        uf: '',
        modalidade: '',
        area: '',
        dataInicio: getDefaultDataInicio(),
        dataFim: getDefaultDataFim(),
        fontes: ['PNCP', 'SESI', 'SENAI'],
    });

    const toggleFonte = (fonte: string) => {
        const atuais = filtros.fontes ?? ['PNCP', 'SESI', 'SENAI'];
        const novas = atuais.includes(fonte)
            ? atuais.filter(f => f !== fonte)
            : [...atuais, fonte];
        // Mantém ao menos uma fonte selecionada
        if (novas.length === 0) return;
        setFiltros({ ...filtros, fontes: novas });
    };
    const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState(false);

    function getDefaultDataInicio(): string {
        const date = new Date();
        date.setDate(date.getDate() - 15);
        return date.toISOString().split('T')[0];
    }

    function getDefaultDataFim(): string {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onBuscar(filtros);
    };

    const limparFiltros = () => {
        const novosFiltros = {
            termo: '',
            uf: '',
            modalidade: '',
            area: '',
            dataInicio: getDefaultDataInicio(),
            dataFim: getDefaultDataFim(),
            fontes: ['PNCP', 'SESI', 'SENAI'],
        };
        setFiltros(novosFiltros);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por objeto, órgão, município... (ex: software, sistema, desenvolvimento)"
                        value={filtros.termo}
                        onChange={(e) => setFiltros({ ...filtros, termo: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-gray-900 placeholder-gray-500"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                    {loading ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            Buscando...
                        </>
                    ) : (
                        <>
                            <Search className="w-5 h-5" />
                            Buscar Licitações
                        </>
                    )}
                </button>
            </div>

            <button
                type="button"
                onClick={() => setMostrarFiltrosAvancados(!mostrarFiltrosAvancados)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 text-sm font-medium"
            >
                <Filter className="w-4 h-4" />
                {mostrarFiltrosAvancados ? 'Ocultar filtros avançados' : 'Mostrar filtros avançados'}
            </button>

            {mostrarFiltrosAvancados && (
                <div className="pt-4 border-t border-gray-100 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                Estado (UF)
                            </label>
                            <select
                                value={filtros.uf}
                                onChange={(e) => setFiltros({ ...filtros, uf: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            >
                                <option value="">Todos os estados</option>
                                {UFS.map((uf) => (
                                    <option key={uf} value={uf}>
                                        {uf}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                Modalidade
                            </label>
                            <select
                                value={filtros.modalidade}
                                onChange={(e) => setFiltros({ ...filtros, modalidade: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            >
                                <option value="">Todas as modalidades</option>
                                {Object.entries(MODALIDADES).map(([id, nome]) => (
                                    <option key={id} value={id}>
                                        {nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Tag className="w-4 h-4" />
                                Área de Atuação
                            </label>
                            <select
                                value={filtros.area}
                                onChange={(e) => setFiltros({ ...filtros, area: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            >
                                <option value="">Todas as áreas</option>
                                {AREAS_ATUACAO.map((area) => (
                                    <option key={area} value={area}>
                                        {area}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Publicação - De
                            </label>
                            <input
                                type="date"
                                value={filtros.dataInicio}
                                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Publicação - Até
                            </label>
                            <input
                                type="date"
                                value={filtros.dataFim}
                                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            />
                        </div>
                    </div>

                    {/* Filtro de fontes */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-sm font-medium text-gray-700">Fontes:</span>
                        {[
                            { id: 'PNCP', label: 'PNCP', cor: 'blue' },
                            { id: 'SESI', label: 'SESI', cor: 'amber' },
                            { id: 'SENAI', label: 'SENAI', cor: 'orange' },
                        ].map(({ id, label, cor }) => {
                            const ativo = (filtros.fontes ?? ['PNCP', 'SESI', 'SENAI']).includes(id);
                            return (
                                <label key={id} className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={ativo}
                                        onChange={() => toggleFonte(id)}
                                        className="rounded"
                                    />
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cor === 'blue' ? 'bg-blue-100 text-blue-700' :
                                            cor === 'amber' ? 'bg-amber-100 text-amber-700' :
                                                'bg-orange-100 text-orange-700'
                                        }`}>
                                        {label}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            {mostrarFiltrosAvancados && (
                <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={limparFiltros}
                        className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm"
                    >
                        <X className="w-4 h-4" />
                        Limpar filtros
                    </button>
                </div>
            )}
        </form>
    );
}
