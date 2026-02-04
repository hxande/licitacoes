'use client';

import { useState, useEffect } from 'react';
import {
    GripVertical,
    Building2,
    MapPin,
    DollarSign,
    Calendar,
    Trash2,
    MessageSquare,
    ExternalLink,
    X,
    Check,
    CheckCircle2,
    AlertCircle,
    FileText,
} from 'lucide-react';
import { LicitacaoPipeline, StatusPipeline, COLUNAS_PIPELINE } from '@/types/pipeline';
import { Checklist } from '@/types/checklist';
import { useChecklist } from '@/hooks/useChecklist';
import { ModalChecklist } from './ModalChecklist';

interface CardPipelineProps {
    licitacao: LicitacaoPipeline;
    onMover: (id: string, status: StatusPipeline) => void;
    onRemover: (id: string) => void;
    onAtualizarObservacoes: (id: string, obs: string) => void;
    isDragging?: boolean;
}

export function CardPipeline({
    licitacao,
    onMover,
    onRemover,
    onAtualizarObservacoes,
    isDragging
}: CardPipelineProps) {
    const [menuAberto, setMenuAberto] = useState(false);
    const [editandoObs, setEditandoObs] = useState(false);
    const [obsTemp, setObsTemp] = useState(licitacao.observacoes || '');
    const [modalChecklistAberto, setModalChecklistAberto] = useState(false);
    const { checklists } = useChecklist();

    // Buscar checklist desta licitação
    const checklistDaLicitacao = checklists.find(c => c.licitacaoId === licitacao.id);

    useEffect(() => {
        if (licitacao.id) {
            console.log('Procurando checklist para licitacao:', licitacao.id);
            console.log('Checklists disponíveis:', checklists.map(c => ({ id: c.id, licitacaoId: c.licitacaoId })));
        }
    }, [licitacao.id, checklists]);

    const formatarMoeda = (valor: number | undefined) => {
        if (!valor) return 'Não informado';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
        }).format(valor);
    };

    const formatarData = (data: string | undefined) => {
        if (!data) return null;
        try {
            return new Date(data).toLocaleDateString('pt-BR');
        } catch {
            return data;
        }
    };

    const salvarObservacoes = () => {
        onAtualizarObservacoes(licitacao.id, obsTemp);
        setEditandoObs(false);
    };

    // Calcular resumo do checklist
    const calcularResumoChecklist = (checklist: Checklist) => {
        const docs = checklist.documentos;
        const total = docs.length;
        const prontos = docs.filter(d => d.status === 'pronto').length;
        const pendentes = docs.filter(d => d.status === 'pendente').length;
        const vencidos = docs.filter(d => d.status === 'vencido').length;
        const vencendo = docs.filter(d => d.status === 'vencendo').length;

        return {
            total,
            prontos,
            pendentes,
            vencidos,
            vencendo,
            percentualConcluido: total > 0 ? Math.round((prontos / total) * 100) : 0,
        };
    };

    return (
        <div
            className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing transition-all ${isDragging ? 'opacity-50 rotate-2 scale-105 shadow-lg' : 'hover:shadow-md'
                }`}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', licitacao.id);
                e.dataTransfer.effectAllowed = 'move';
            }}
        >
            {/* Header com grip e ações */}
            <div className="flex items-start gap-2 mb-2">
                <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                <h4 className="text-sm font-medium text-gray-800 line-clamp-2 flex-1" title={licitacao.objeto}>
                    {licitacao.objeto}
                </h4>
                <div className="relative">
                    <button
                        onClick={() => setMenuAberto(!menuAberto)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                    </button>

                    {menuAberto && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(false)} />
                            <div className="absolute right-0 top-6 z-20 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b">
                                    Mover para
                                </div>
                                {COLUNAS_PIPELINE.filter(c => c.id !== licitacao.status).map(coluna => (
                                    <button
                                        key={coluna.id}
                                        onClick={() => {
                                            onMover(licitacao.id, coluna.id);
                                            setMenuAberto(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${coluna.cor}`}
                                    >
                                        {coluna.titulo}
                                    </button>
                                ))}
                                <div className="border-t my-1" />
                                <button
                                    onClick={() => {
                                        setEditandoObs(true);
                                        setMenuAberto(false);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Observações
                                </button>
                                {licitacao.cnpjOrgao && licitacao.id && (
                                    <a
                                        href={`https://pncp.gov.br/app/editais/${licitacao.cnpjOrgao}/${licitacao.id.split('-').slice(1).join('/')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 text-blue-600 flex items-center gap-2"
                                        onClick={() => setMenuAberto(false)}
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Ver no PNCP
                                    </a>
                                )}
                                <button
                                    onClick={() => {
                                        onRemover(licitacao.id);
                                        setMenuAberto(false);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Remover
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Info */}
            <div className="space-y-1 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span className="truncate">{licitacao.orgao}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{licitacao.uf}</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 font-medium">
                        <DollarSign className="w-3 h-3" />
                        <span>{formatarMoeda(licitacao.valorEstimado)}</span>
                    </div>
                </div>
                {licitacao.dataAbertura && (
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Abertura: {formatarData(licitacao.dataAbertura)}</span>
                    </div>
                )}
            </div>

            {/* Checklist */}
            {checklistDaLicitacao && (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                        <button
                            onClick={() => setModalChecklistAberto(true)}
                            className="text-xs font-medium text-blue-900 hover:text-blue-600 flex items-center gap-1 transition-colors"
                        >
                            <FileText className="w-3 h-3" />
                            Checklist
                        </button>
                        <span className="text-xs font-bold text-blue-600">
                            {calcularResumoChecklist(checklistDaLicitacao).percentualConcluido}%
                        </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-1.5">
                        <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                            style={{
                                width: `${calcularResumoChecklist(checklistDaLicitacao).percentualConcluido}%`
                            }}
                        />
                    </div>
                    <div className="mt-2 flex gap-2 text-xs text-blue-700">
                        <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span>{calcularResumoChecklist(checklistDaLicitacao).prontos}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-orange-600" />
                            <span>{calcularResumoChecklist(checklistDaLicitacao).pendentes}</span>
                        </div>
                        {calcularResumoChecklist(checklistDaLicitacao).vencidos > 0 && (
                            <div className="flex items-center gap-1">
                                <X className="w-3 h-3 text-red-600" />
                                <span>{calcularResumoChecklist(checklistDaLicitacao).vencidos}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Observações */}
            {licitacao.observacoes && !editandoObs && (
                <div
                    className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800 cursor-pointer hover:bg-yellow-100"
                    onClick={() => setEditandoObs(true)}
                >
                    {licitacao.observacoes}
                </div>
            )}

            {/* Editor de observações */}
            {editandoObs && (
                <div className="mt-2">
                    <textarea
                        value={obsTemp}
                        onChange={(e) => setObsTemp(e.target.value)}
                        placeholder="Adicionar observações..."
                        className="w-full p-2 text-xs border border-gray-200 rounded resize-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                        rows={2}
                        autoFocus
                    />
                    <div className="flex justify-end gap-1 mt-1">
                        <button
                            onClick={() => {
                                setObsTemp(licitacao.observacoes || '');
                                setEditandoObs(false);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button
                            onClick={salvarObservacoes}
                            className="p-1 text-green-500 hover:text-green-600"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Checklist */}
            <ModalChecklist
                isOpen={modalChecklistAberto}
                onClose={() => setModalChecklistAberto(false)}
                licitacao={licitacao}
            />
        </div>
    );
}
