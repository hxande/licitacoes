'use client';

import { useState, useEffect } from 'react';
import {
    X,
    Building2,
    MapPin,
    Tag,
    Award,
    DollarSign,
    FileText,
    Save,
    Trash2,
    Plus,
    Check,
} from 'lucide-react';
import {
    PerfilEmpresa,
    PORTES_EMPRESA,
    CERTIFICACOES_COMUNS,
    CAPACIDADES_TI,
    CAPACIDADES_GERAIS,
} from '@/types/empresa';
import { UFS, MODALIDADES, AREAS_ATUACAO } from '@/types/licitacao';

interface ModalPerfilEmpresaProps {
    isOpen: boolean;
    onClose: () => void;
    perfilAtual: PerfilEmpresa | null;
    onSalvar: (perfil: PerfilEmpresa) => void;
    onLimpar: () => void;
}

const PERFIL_INICIAL: PerfilEmpresa = {
    nomeEmpresa: '',
    cnpj: '',
    areasAtuacao: [],
    capacidades: [],
    certificacoes: [],
    estadosAtuacao: [],
    porte: 'ME',
    valorMinimo: undefined,
    valorMaximo: undefined,
    modalidadesPreferidas: [],
};

export function ModalPerfilEmpresa({
    isOpen,
    onClose,
    perfilAtual,
    onSalvar,
    onLimpar,
}: ModalPerfilEmpresaProps) {
    const [perfil, setPerfil] = useState<PerfilEmpresa>(PERFIL_INICIAL);
    const [capacidadeCustom, setCapacidadeCustom] = useState('');
    const [abaAtiva, setAbaAtiva] = useState<'basico' | 'capacidades' | 'preferencias'>('basico');

    useEffect(() => {
        if (perfilAtual) {
            setPerfil(perfilAtual);
        } else {
            setPerfil(PERFIL_INICIAL);
        }
    }, [perfilAtual, isOpen]);

    if (!isOpen) return null;

    const toggleArrayItem = (
        campo: 'areasAtuacao' | 'capacidades' | 'certificacoes' | 'estadosAtuacao' | 'modalidadesPreferidas',
        valor: string | number
    ) => {
        setPerfil(prev => {
            const array = prev[campo] as (string | number)[];
            if (array.includes(valor)) {
                return { ...prev, [campo]: array.filter(v => v !== valor) };
            } else {
                return { ...prev, [campo]: [...array, valor] };
            }
        });
    };

    const adicionarCapacidadeCustom = () => {
        if (capacidadeCustom.trim() && !perfil.capacidades.includes(capacidadeCustom.trim())) {
            setPerfil(prev => ({
                ...prev,
                capacidades: [...prev.capacidades, capacidadeCustom.trim()],
            }));
            setCapacidadeCustom('');
        }
    };

    const handleSalvar = () => {
        onSalvar(perfil);
        onClose();
    };

    const handleLimpar = () => {
        if (confirm('Tem certeza que deseja limpar o perfil da empresa?')) {
            onLimpar();
            setPerfil(PERFIL_INICIAL);
            onClose();
        }
    };

    const todasCapacidades = [...CAPACIDADES_TI, ...CAPACIDADES_GERAIS];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Perfil da Empresa</h2>
                                <p className="text-blue-100 text-sm">
                                    Configure seu perfil para receber matches personalizados
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Abas */}
                    <div className="flex gap-2 mt-4">
                        {[
                            { id: 'basico', label: 'Dados Básicos', icon: Building2 },
                            { id: 'capacidades', label: 'Capacidades', icon: Tag },
                            { id: 'preferencias', label: 'Preferências', icon: FileText },
                        ].map((aba) => (
                            <button
                                key={aba.id}
                                onClick={() => setAbaAtiva(aba.id as typeof abaAtiva)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${abaAtiva === aba.id
                                    ? 'bg-white text-blue-600'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                            >
                                <aba.icon className="w-4 h-4" />
                                {aba.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conteúdo */}
                <div className="flex-1 overflow-y-auto p-6">
                    {abaAtiva === 'basico' && (
                        <div className="space-y-6">
                            {/* Nome e CNPJ */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nome da Empresa
                                    </label>
                                    <input
                                        type="text"
                                        value={perfil.nomeEmpresa}
                                        onChange={(e) => setPerfil({ ...perfil, nomeEmpresa: e.target.value })}
                                        placeholder="Razão Social da empresa"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        CNPJ (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={perfil.cnpj || ''}
                                        onChange={(e) => setPerfil({ ...perfil, cnpj: e.target.value })}
                                        placeholder="00.000.000/0000-00"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    />
                                </div>
                            </div>

                            {/* Porte */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Porte da Empresa
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                    {PORTES_EMPRESA.map((porte) => (
                                        <button
                                            key={porte.value}
                                            type="button"
                                            onClick={() => setPerfil({ ...perfil, porte: porte.value as PerfilEmpresa['porte'] })}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${perfil.porte === porte.value
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {porte.value}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Áreas de Atuação */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Áreas de Atuação
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {AREAS_ATUACAO.map((area) => (
                                        <button
                                            key={area}
                                            type="button"
                                            onClick={() => toggleArrayItem('areasAtuacao', area)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${perfil.areasAtuacao.includes(area)
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {perfil.areasAtuacao.includes(area) && <Check className="w-3 h-3 inline mr-1" />}
                                            {area}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Estados de Atuação */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Estados de Atuação
                                    <span className="text-gray-400 font-normal">(deixe vazio para todos)</span>
                                </label>
                                <div className="flex flex-wrap gap-1">
                                    {UFS.map((uf) => (
                                        <button
                                            key={uf}
                                            type="button"
                                            onClick={() => toggleArrayItem('estadosAtuacao', uf)}
                                            className={`w-10 h-10 rounded-lg text-sm font-medium transition ${perfil.estadosAtuacao.includes(uf)
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {uf}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {abaAtiva === 'capacidades' && (
                        <div className="space-y-6">
                            {/* Capacidades Técnicas */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Capacidades Técnicas (o que sua empresa faz)
                                </label>
                                <p className="text-sm text-gray-500 mb-3">
                                    Selecione as capacidades que sua empresa possui. Isso será usado para encontrar licitações compatíveis.
                                </p>

                                {/* Adicionar custom */}
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        value={capacidadeCustom}
                                        onChange={(e) => setCapacidadeCustom(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && adicionarCapacidadeCustom()}
                                        placeholder="Adicionar capacidade personalizada..."
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    />
                                    <button
                                        type="button"
                                        onClick={adicionarCapacidadeCustom}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                                    <div className="flex flex-wrap gap-2">
                                        {todasCapacidades.map((cap) => (
                                            <button
                                                key={cap}
                                                type="button"
                                                onClick={() => toggleArrayItem('capacidades', cap)}
                                                className={`px-3 py-1.5 rounded-full text-sm transition ${perfil.capacidades.includes(cap)
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {perfil.capacidades.includes(cap) && <Check className="w-3 h-3 inline mr-1" />}
                                                {cap}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Capacidades selecionadas */}
                                {perfil.capacidades.length > 0 && (
                                    <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                                        <p className="text-sm font-medium text-purple-700 mb-2">
                                            {perfil.capacidades.length} capacidades selecionadas:
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {perfil.capacidades.map((cap) => (
                                                <span
                                                    key={cap}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600 text-white text-xs rounded-full"
                                                >
                                                    {cap}
                                                    <button
                                                        onClick={() => toggleArrayItem('capacidades', cap)}
                                                        className="hover:bg-purple-700 rounded-full p-0.5"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Certificações */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Award className="w-4 h-4" />
                                    Certificações
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {CERTIFICACOES_COMUNS.map((cert) => (
                                        <button
                                            key={cert}
                                            type="button"
                                            onClick={() => toggleArrayItem('certificacoes', cert)}
                                            className={`px-3 py-1.5 rounded-full text-sm transition ${perfil.certificacoes.includes(cert)
                                                ? 'bg-amber-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {perfil.certificacoes.includes(cert) && <Check className="w-3 h-3 inline mr-1" />}
                                            {cert}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {abaAtiva === 'preferencias' && (
                        <div className="space-y-6">
                            {/* Faixa de Valores */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" />
                                    Faixa de Valores (opcional)
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Valor Mínimo</label>
                                        <input
                                            type="number"
                                            value={perfil.valorMinimo || ''}
                                            onChange={(e) => setPerfil({
                                                ...perfil,
                                                valorMinimo: e.target.value ? Number(e.target.value) : undefined
                                            })}
                                            placeholder="R$ 0,00"
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Valor Máximo</label>
                                        <input
                                            type="number"
                                            value={perfil.valorMaximo || ''}
                                            onChange={(e) => setPerfil({
                                                ...perfil,
                                                valorMaximo: e.target.value ? Number(e.target.value) : undefined
                                            })}
                                            placeholder="Sem limite"
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modalidades Preferidas */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Modalidades Preferidas
                                    <span className="text-gray-400 font-normal ml-2">(deixe vazio para todas)</span>
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {Object.entries(MODALIDADES).map(([id, nome]) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => toggleArrayItem('modalidadesPreferidas', Number(id))}
                                            className={`px-3 py-2 rounded-lg text-sm text-left transition ${perfil.modalidadesPreferidas.includes(Number(id))
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {perfil.modalidadesPreferidas.includes(Number(id)) && (
                                                <Check className="w-3 h-3 inline mr-2" />
                                            )}
                                            {nome}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
                    <button
                        onClick={handleLimpar}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                        <Trash2 className="w-4 h-4" />
                        Limpar Perfil
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSalvar}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                        >
                            <Save className="w-4 h-4" />
                            Salvar Perfil
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
