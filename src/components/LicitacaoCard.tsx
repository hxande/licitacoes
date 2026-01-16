'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Building2,
    MapPin,
    Calendar,
    DollarSign,
    ExternalLink,
    Tag,
    Clock,
    FileText,
    Sparkles,
    Loader2,
    FileSearch,
} from 'lucide-react';
import { Licitacao } from '@/types/licitacao';
import { ModalProposta } from './ModalProposta';
import { ModalAnaliseIA } from './ModalAnaliseIA';

interface LicitacaoCardProps {
    licitacao: Licitacao;
}

export function LicitacaoCard({ licitacao }: LicitacaoCardProps) {
    const [modalAberta, setModalAberta] = useState(false);
    const [modalAnaliseAberta, setModalAnaliseAberta] = useState(false);
    const [proposta, setProposta] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const gerarProposta = async () => {
        setModalAberta(true);
        setLoading(true);
        setError(null);
        setProposta(null);

        try {
            const response = await fetch('/api/gerar-proposta', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    objeto: licitacao.objeto,
                    orgao: licitacao.orgao,
                    uf: licitacao.uf,
                    municipio: licitacao.municipio,
                    modalidade: licitacao.modalidade,
                    valorEstimado: licitacao.valorEstimado,
                    dataAbertura: licitacao.dataAbertura,
                    categorias: licitacao.categorias,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setProposta(data.proposta);
            } else {
                setError(data.error || 'Erro ao gerar proposta');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    const formatarData = (data: string | undefined) => {
        if (!data) return 'Não informada';
        try {
            const dataObj = data.includes('-')
                ? parseISO(data)
                : parseISO(`${data.slice(0, 4)}-${data.slice(4, 6)}-${data.slice(6, 8)}`);
            return format(dataObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        } catch {
            return data;
        }
    };

    const formatarMoeda = (valor: number | undefined) => {
        if (!valor) return 'Não informado';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(valor);
    };

    const getSituacaoColor = (situacao: string) => {
        const situacaoLower = situacao.toLowerCase();
        if (situacaoLower.includes('aberto') || situacaoLower.includes('aberta')) {
            return 'bg-green-100 text-green-800';
        }
        if (situacaoLower.includes('encerrad') || situacaoLower.includes('fechad')) {
            return 'bg-red-100 text-red-800';
        }
        if (situacaoLower.includes('suspens') || situacaoLower.includes('andamento')) {
            return 'bg-yellow-100 text-yellow-800';
        }
        return 'bg-gray-100 text-gray-800';
    };

    const getCategoriaColor = (categoria: string) => {
        const colors: Record<string, string> = {
            'Software': 'bg-blue-100 text-blue-700',
            'Desenvolvimento': 'bg-purple-100 text-purple-700',
            'Hardware': 'bg-orange-100 text-orange-700',
            'Infraestrutura': 'bg-cyan-100 text-cyan-700',
            'Cloud': 'bg-sky-100 text-sky-700',
            'Segurança': 'bg-red-100 text-red-700',
            'Suporte': 'bg-teal-100 text-teal-700',
            'Consultoria': 'bg-indigo-100 text-indigo-700',
            'Licenças': 'bg-amber-100 text-amber-700',
            'Web': 'bg-pink-100 text-pink-700',
            'Mobile': 'bg-violet-100 text-violet-700',
            'BI/Analytics': 'bg-emerald-100 text-emerald-700',
            'IA': 'bg-fuchsia-100 text-fuchsia-700',
        };
        return colors[categoria] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSituacaoColor(licitacao.situacao)}`}>
                            {licitacao.situacao}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                            {licitacao.fonte}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {licitacao.areaAtuacao}
                        </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">
                        {licitacao.objeto}
                    </h3>
                </div>
            </div>

            {licitacao.categorias && licitacao.categorias.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {licitacao.categorias.map((categoria, index) => (
                        <span
                            key={index}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getCategoriaColor(categoria)}`}
                        >
                            <Tag className="w-3 h-3" />
                            {categoria}
                        </span>
                    ))}
                </div>
            )}

            <div className="space-y-3 mb-4">
                <div className="flex items-start gap-2 text-gray-600">
                    <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{licitacao.orgao}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">
                        {licitacao.municipio ? `${licitacao.municipio} - ` : ''}{licitacao.uf}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{licitacao.modalidade}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">
                        Publicação: {formatarData(licitacao.dataPublicacao)}
                    </span>
                </div>

                {licitacao.dataAbertura && (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">
                            Abertura: {formatarData(licitacao.dataAbertura)}
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 flex-shrink-0 text-green-600" />
                    <span className="text-sm font-semibold text-green-600">
                        {formatarMoeda(licitacao.valorEstimado)}
                    </span>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                <button
                    onClick={gerarProposta}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Sparkles className="w-4 h-4" />
                    )}
                    Gerar Proposta
                </button>
                <button
                    onClick={() => setModalAnaliseAberta(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition text-sm font-medium"
                >
                    <FileSearch className="w-4 h-4" />
                    Analisar com IA
                </button>
                <a
                    href={`https://pncp.gov.br/app/editais/${licitacao.cnpjOrgao}/${licitacao.id.split('-').slice(1).join('/')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm font-medium"
                >
                    <ExternalLink className="w-4 h-4" />
                    PNCP
                </a>
            </div>

            <ModalProposta
                isOpen={modalAberta}
                onClose={() => setModalAberta(false)}
                proposta={proposta}
                loading={loading}
                error={error}
                licitacaoObjeto={licitacao.objeto}
            />

            {modalAnaliseAberta && (
                <ModalAnaliseIA
                    licitacao={licitacao}
                    onClose={() => setModalAnaliseAberta(false)}
                />
            )}
        </div>
    );
}
