'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Loader2, Sparkles, AlertCircle, List } from 'lucide-react';
import { Checklist, DocumentoChecklist, DOCUMENTOS_COMUNS, StatusDocumento } from '@/types/checklist';
import { ChecklistView } from './ChecklistView';
import { Licitacao } from '@/types/licitacao';
import { LicitacaoPipeline } from '@/types/pipeline';

interface ModalChecklistProps {
    isOpen: boolean;
    onClose: () => void;
    licitacao?: Licitacao | LicitacaoPipeline;
}

const STORAGE_KEY = 'licitacoes_checklists';

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calcularStatusDocumento(doc: DocumentoChecklist): StatusDocumento {
    if (doc.status === 'pronto' && doc.dataValidade) {
        const hoje = new Date();
        const validade = new Date(doc.dataValidade);
        const diffDias = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDias < 0) return 'vencido';
        if (diffDias <= 7) return 'vencendo';
    }
    return doc.status === 'pronto' ? 'pronto' : 'pendente';
}

// Extrair CNPJ, ano e sequencial do ID da licitação
function extrairDadosId(id?: string): { cnpj: string; ano: string; sequencial: string } | null {
    // Formato esperado: CNPJ-ANO-SEQUENCIAL (ex: 00394460000141-2024-12345)
    if (!id || typeof id !== 'string') return null;
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

export function ModalChecklist({ isOpen, onClose, licitacao }: ModalChecklistProps) {
    const [checklist, setChecklist] = useState<Checklist | null>(null);
    const [etapa, setEtapa] = useState<'analisando' | 'criar' | 'visualizar'>('analisando');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Carregar checklist existente ou iniciar análise automática
    useEffect(() => {
        if (isOpen && licitacao) {
            fetch(`/api/checklists?licitacaoId=${encodeURIComponent(licitacao.id)}`)
                .then(r => r.json())
                .then((data) => {
                    if (data) {
                        setChecklist(data as Checklist);
                        setEtapa('visualizar');
                    } else {
                        setChecklist(null);
                        setEtapa('analisando');
                        analisarComIA();
                    }
                })
                .catch((e) => {
                    console.error('Erro ao carregar checklist:', e);
                    setChecklist(null);
                    setEtapa('analisando');
                    analisarComIA();
                });
        }
    }, [isOpen, licitacao]);

    // Análise automática com IA
    const analisarComIA = useCallback(async () => {
        if (!licitacao) return;

        setLoading(true);
        setEtapa('analisando');
        setError(null);

        try {
            const dadosId = extrairDadosId(licitacao.id);

            const response = await fetch('/api/analisar-edital', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cnpj: dadosId?.cnpj || licitacao.cnpjOrgao,
                    ano: dadosId?.ano,
                    sequencial: dadosId?.sequencial,
                    dadosLicitacao: {
                        titulo: `Checklist: ${licitacao.objeto.substring(0, 50)}...`,
                        orgao: licitacao.orgao,
                        objeto: licitacao.objeto,
                        dataAbertura: licitacao.dataAbertura,
                        licitacaoId: licitacao.id,
                    },
                }),
            });

            const data = await response.json();

            if (data.success && data.documentos?.length > 0) {
                // Criar checklist com documentos da IA
                const agora = new Date().toISOString();
                const novoChecklist: Checklist = {
                    id: generateId(),
                    titulo: `Checklist: ${licitacao.objeto.substring(0, 50)}...`,
                    licitacaoId: licitacao.id,
                    orgao: licitacao.orgao,
                    objeto: licitacao.objeto,
                    dataAbertura: licitacao.dataAbertura,
                    documentos: data.documentos,
                    criadoEm: agora,
                    atualizadoEm: agora,
                };

                salvarChecklist(novoChecklist);
                setEtapa('visualizar');
            } else {
                setError(data.error || 'Não foi possível analisar a licitação');
                setEtapa('criar');
            }
        } catch (err) {
            console.error('Erro na análise:', err);
            setError('Erro ao conectar com o servidor. Tente novamente.');
            setEtapa('criar');
        } finally {
            setLoading(false);
        }
    }, [licitacao]);

    // Salvar checklist via API
    const salvarChecklist = useCallback((checklistAtualizado: Checklist) => {
        // optimistic local update
        setChecklist(checklistAtualizado);
        fetch('/api/checklists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(checklistAtualizado) }).catch(() => { });
    }, []);

    // Criar checklist com documentos padrão
    const criarChecklistPadrao = useCallback(() => {
        const agora = new Date().toISOString();

        const documentos: DocumentoChecklist[] = DOCUMENTOS_COMUNS.map((doc, index) => ({
            ...doc,
            id: generateId(),
            status: 'pendente' as StatusDocumento,
            ordem: index,
        }));

        const novoChecklist: Checklist = {
            id: generateId(),
            titulo: licitacao?.objeto
                ? `Checklist: ${licitacao.objeto.substring(0, 50)}...`
                : 'Checklist de Licitação',
            licitacaoId: licitacao?.id,
            orgao: licitacao?.orgao,
            objeto: licitacao?.objeto,
            dataAbertura: licitacao?.dataAbertura,
            documentos,
            criadoEm: agora,
            atualizadoEm: agora,
        };

        salvarChecklist(novoChecklist);
        setEtapa('visualizar');
    }, [licitacao, salvarChecklist]);

    // Handlers para atualizar documentos
    const toggleDocumento = useCallback((documentoId: string) => {
        if (!checklist) return;

        const updated: Checklist = {
            ...checklist,
            atualizadoEm: new Date().toISOString(),
            documentos: checklist.documentos.map(doc => {
                if (doc.id !== documentoId) return doc;
                const novoStatus = doc.status === 'pronto' ? 'pendente' : 'pronto';
                return {
                    ...doc,
                    status: novoStatus === 'pronto' && doc.dataValidade
                        ? calcularStatusDocumento({ ...doc, status: 'pronto' })
                        : novoStatus
                };
            })
        };

        salvarChecklist(updated);
    }, [checklist, salvarChecklist]);

    const atualizarDocumento = useCallback((documentoId: string, updates: Partial<DocumentoChecklist>) => {
        if (!checklist) return;

        const updated: Checklist = {
            ...checklist,
            atualizadoEm: new Date().toISOString(),
            documentos: checklist.documentos.map(doc => {
                if (doc.id !== documentoId) return doc;
                const docAtualizado = { ...doc, ...updates };
                return {
                    ...docAtualizado,
                    status: calcularStatusDocumento(docAtualizado)
                };
            })
        };

        salvarChecklist(updated);
    }, [checklist, salvarChecklist]);

    const adicionarDocumento = useCallback((documento: Omit<DocumentoChecklist, 'id' | 'ordem'>) => {
        if (!checklist) return;

        const novaOrdem = Math.max(...checklist.documentos.map(d => d.ordem), -1) + 1;

        const updated: Checklist = {
            ...checklist,
            atualizadoEm: new Date().toISOString(),
            documentos: [...checklist.documentos, {
                ...documento,
                id: generateId(),
                ordem: novaOrdem,
            }]
        };

        salvarChecklist(updated);
    }, [checklist, salvarChecklist]);

    const removerDocumento = useCallback((documentoId: string) => {
        if (!checklist) return;

        const updated: Checklist = {
            ...checklist,
            atualizadoEm: new Date().toISOString(),
            documentos: checklist.documentos.filter(d => d.id !== documentoId)
        };

        salvarChecklist(updated);
    }, [checklist, salvarChecklist]);

    const obterSummary = useCallback(() => {
        if (!checklist) {
            return { total: 0, prontos: 0, pendentes: 0, vencidos: 0, vencendo: 0, percentualConcluido: 0 };
        }

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
    }, [checklist]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8 pb-8">
            <div className="relative w-full max-w-4xl">
                {/* Botão fechar (fora do card para não ser cortado) */}
                <button
                    onClick={onClose}
                    className="absolute -top-2 -right-2 z-10 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100 transition-colors print:hidden"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>

                {/* Etapa: Analisando com IA */}
                {etapa === 'analisando' && (
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="w-10 h-10 text-purple-600 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            Analisando Licitação com IA
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Estamos buscando informações do edital e identificando os documentos necessários...
                        </p>

                        {licitacao && (
                            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                                <p className="text-sm text-gray-500 mb-1">Objeto:</p>
                                <p className="text-gray-800 line-clamp-2">{licitacao.objeto}</p>
                                <p className="text-sm text-gray-600 mt-2">{licitacao.orgao}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-3 text-purple-600">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Processando...</span>
                        </div>
                    </div>
                )}

                {/* Etapa: Criar (fallback ou erro) */}
                {etapa === 'criar' && (
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        {error && (
                            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-yellow-800 font-medium">Não foi possível analisar automaticamente</p>
                                    <p className="text-yellow-700 text-sm mt-1">{error}</p>
                                </div>
                            </div>
                        )}

                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-800">Criar Checklist de Documentos</h2>
                            <p className="text-gray-600 mt-2">
                                Escolha uma opção para criar o checklist
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Tentar novamente com IA */}
                            <button
                                onClick={analisarComIA}
                                disabled={loading}
                                className="p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left group disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                        <Sparkles className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <h3 className="font-semibold text-gray-800">Tentar Análise IA</h3>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Analisar novamente as informações da licitação com inteligência artificial
                                </p>
                            </button>

                            {/* Usar Lista Padrão */}
                            <button
                                onClick={criarChecklistPadrao}
                                className="p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                        <List className="w-5 h-5 text-green-600" />
                                    </div>
                                    <h3 className="font-semibold text-gray-800">Lista Padrão</h3>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Usar uma lista padrão com os documentos mais comuns em licitações
                                </p>
                            </button>
                        </div>
                    </div>
                )}

                {/* Etapa: Visualizar checklist */}
                {etapa === 'visualizar' && checklist && (
                    <ChecklistView
                        checklist={checklist}
                        summary={obterSummary()}
                        onToggleDocumento={toggleDocumento}
                        onAtualizarDocumento={atualizarDocumento}
                        onAdicionarDocumento={adicionarDocumento}
                        onRemoverDocumento={removerDocumento}
                        onClose={onClose}
                    />
                )}
            </div>
        </div>
    );
}
