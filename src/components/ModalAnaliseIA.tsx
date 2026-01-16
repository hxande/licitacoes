'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, FileSearch, Shield, ClipboardList, Loader2, Sparkles, AlertCircle, List } from 'lucide-react';
import { Licitacao } from '@/types/licitacao';
import { Checklist, DocumentoChecklist, DOCUMENTOS_COMUNS, StatusDocumento } from '@/types/checklist';
import { AnaliseRiscoView } from './AnaliseRiscoView';
import { ChecklistView } from './ChecklistView';

interface ModalAnaliseIAProps {
    licitacao: Licitacao;
    onClose: () => void;
    abaInicial?: 'risco' | 'checklist';
}

type Aba = 'risco' | 'checklist';

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

export function ModalAnaliseIA({ licitacao, onClose, abaInicial = 'risco' }: ModalAnaliseIAProps) {
    const [abaAtiva, setAbaAtiva] = useState<Aba>(abaInicial);
    const [checklist, setChecklist] = useState<Checklist | null>(null);
    const [checklistEtapa, setChecklistEtapa] = useState<'analisando' | 'criar' | 'visualizar'>('analisando');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Carregar checklist existente ou iniciar análise automática quando muda para aba checklist
    useEffect(() => {
        if (abaAtiva !== 'checklist') return;

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const checklists: Checklist[] = JSON.parse(saved);
                const existente = checklists.find(c => c.licitacaoId === licitacao.id);
                if (existente) {
                    setChecklist(existente);
                    setChecklistEtapa('visualizar');
                    setError(null);
                    return;
                }
            } catch (e) {
                console.error('Erro ao carregar checklists:', e);
            }
        }
        // Não encontrou checklist existente - iniciar análise automática
        if (!checklist) {
            analisarComIA();
        }
    }, [abaAtiva, licitacao.id]);

    // Análise automática com IA
    const analisarComIA = useCallback(async () => {
        setLoading(true);
        setChecklistEtapa('analisando');
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
                setChecklistEtapa('visualizar');
            } else {
                setError(data.error || 'Não foi possível analisar a licitação');
                setChecklistEtapa('criar');
            }
        } catch (err) {
            console.error('Erro na análise:', err);
            setError('Erro ao conectar com o servidor. Tente novamente.');
            setChecklistEtapa('criar');
        } finally {
            setLoading(false);
        }
    }, [licitacao]);

    // Salvar checklist no localStorage
    const salvarChecklist = useCallback((checklistAtualizado: Checklist) => {
        const saved = localStorage.getItem(STORAGE_KEY);
        let checklists: Checklist[] = [];

        if (saved) {
            try {
                checklists = JSON.parse(saved);
            } catch (e) {
                console.error('Erro ao parsear checklists:', e);
            }
        }

        const index = checklists.findIndex(c => c.id === checklistAtualizado.id);
        if (index >= 0) {
            checklists[index] = checklistAtualizado;
        } else {
            checklists.push(checklistAtualizado);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(checklists));
        setChecklist(checklistAtualizado);
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
            titulo: `Checklist: ${licitacao.objeto.substring(0, 50)}...`,
            licitacaoId: licitacao.id,
            orgao: licitacao.orgao,
            objeto: licitacao.objeto,
            dataAbertura: licitacao.dataAbertura,
            documentos,
            criadoEm: agora,
            atualizadoEm: agora,
        };

        salvarChecklist(novoChecklist);
        setChecklistEtapa('visualizar');
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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <FileSearch className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Análise com IA</h2>
                            <p className="text-sm text-gray-600 line-clamp-1 max-w-md">
                                {licitacao.objeto}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-gray-50">
                    <button
                        onClick={() => setAbaAtiva('risco')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-colors ${abaAtiva === 'risco'
                                ? 'text-orange-600 bg-white border-b-2 border-orange-500'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                            }`}
                    >
                        <Shield className="w-5 h-5" />
                        Análise de Risco
                    </button>
                    <button
                        onClick={() => setAbaAtiva('checklist')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium transition-colors ${abaAtiva === 'checklist'
                                ? 'text-green-600 bg-white border-b-2 border-green-500'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                            }`}
                    >
                        <ClipboardList className="w-5 h-5" />
                        Checklist de Documentos
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {abaAtiva === 'risco' && <AnaliseRiscoView licitacao={licitacao} />}

                    {abaAtiva === 'checklist' && (
                        <>
                            {/* Etapa: Analisando com IA */}
                            {checklistEtapa === 'analisando' && (
                                <div className="p-8 text-center">
                                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Sparkles className="w-10 h-10 text-purple-600 animate-pulse" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                        Analisando Licitação com IA
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Estamos buscando informações do edital e identificando os documentos necessários...
                                    </p>

                                    <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left max-w-lg mx-auto">
                                        <p className="text-sm text-gray-500 mb-1">Objeto:</p>
                                        <p className="text-gray-800 line-clamp-2">{licitacao.objeto}</p>
                                        <p className="text-sm text-gray-600 mt-2">{licitacao.orgao}</p>
                                    </div>

                                    <div className="flex items-center justify-center gap-3 text-purple-600">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Processando...</span>
                                    </div>
                                </div>
                            )}

                            {/* Etapa: Criar (fallback ou erro) */}
                            {checklistEtapa === 'criar' && (
                                <div>
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
                                        <h3 className="text-xl font-bold text-gray-800">Criar Checklist de Documentos</h3>
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
                                                <h4 className="font-semibold text-gray-800">Tentar Análise IA</h4>
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
                                                <h4 className="font-semibold text-gray-800">Lista Padrão</h4>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Usar uma lista padrão com os documentos mais comuns em licitações
                                            </p>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Etapa: Visualizar checklist */}
                            {checklistEtapa === 'visualizar' && checklist && (
                                <ChecklistView
                                    checklist={checklist}
                                    summary={obterSummary()}
                                    onToggleDocumento={toggleDocumento}
                                    onAtualizarDocumento={atualizarDocumento}
                                    onAdicionarDocumento={adicionarDocumento}
                                    onRemoverDocumento={removerDocumento}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
