'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    Checklist,
    DocumentoChecklist,
    ChecklistSummary,
    StatusDocumento,
    DOCUMENTOS_COMUNS
} from '@/types/checklist';

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

function atualizarStatusDocumentos(documentos: DocumentoChecklist[]): DocumentoChecklist[] {
    return documentos.map(doc => ({
        ...doc,
        status: calcularStatusDocumento(doc)
    }));
}

export function useChecklist() {
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [checklistAtual, setChecklistAtual] = useState<Checklist | null>(null);
    const [loading, setLoading] = useState(false);

    // Carregar checklists do localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as Checklist[];
                // Atualizar status de documentos baseado na validade
                const updated = parsed.map(checklist => ({
                    ...checklist,
                    documentos: atualizarStatusDocumentos(checklist.documentos)
                }));
                setChecklists(updated);
            } catch (e) {
                console.error('Erro ao carregar checklists:', e);
            }
        }
    }, []);

    // Salvar no localStorage quando mudar
    useEffect(() => {
        if (checklists.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(checklists));
        }
    }, [checklists]);

    const criarChecklist = useCallback((dados: {
        titulo: string;
        licitacaoId?: string;
        orgao?: string;
        objeto?: string;
        dataAbertura?: string;
        documentos?: DocumentoChecklist[];
    }): Checklist => {
        const agora = new Date().toISOString();

        // Se não tiver documentos, usar os comuns
        const documentos = dados.documentos || DOCUMENTOS_COMUNS.map((doc, index) => ({
            ...doc,
            id: generateId(),
            status: 'pendente' as StatusDocumento,
            ordem: index,
        }));

        const novoChecklist: Checklist = {
            id: generateId(),
            titulo: dados.titulo,
            licitacaoId: dados.licitacaoId,
            orgao: dados.orgao,
            objeto: dados.objeto,
            dataAbertura: dados.dataAbertura,
            documentos,
            criadoEm: agora,
            atualizadoEm: agora,
        };

        setChecklists(prev => [...prev, novoChecklist]);
        return novoChecklist;
    }, []);

    const analisarEditalComIA = useCallback(async (textoEdital: string, dadosLicitacao?: {
        titulo?: string;
        orgao?: string;
        objeto?: string;
        dataAbertura?: string;
        licitacaoId?: string;
    }): Promise<Checklist> => {
        setLoading(true);
        try {
            const response = await fetch('/api/analisar-edital', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    textoEdital,
                    dadosLicitacao
                }),
            });

            if (!response.ok) {
                throw new Error('Erro ao analisar edital');
            }

            const data = await response.json();

            const novoChecklist = criarChecklist({
                titulo: dadosLicitacao?.titulo || 'Checklist de Licitação',
                licitacaoId: dadosLicitacao?.licitacaoId,
                orgao: dadosLicitacao?.orgao,
                objeto: dadosLicitacao?.objeto,
                dataAbertura: dadosLicitacao?.dataAbertura,
                documentos: data.documentos,
            });

            return novoChecklist;
        } finally {
            setLoading(false);
        }
    }, [criarChecklist]);

    const atualizarDocumento = useCallback((
        checklistId: string,
        documentoId: string,
        updates: Partial<DocumentoChecklist>
    ) => {
        setChecklists(prev => prev.map(checklist => {
            if (checklist.id !== checklistId) return checklist;

            return {
                ...checklist,
                atualizadoEm: new Date().toISOString(),
                documentos: checklist.documentos.map(doc => {
                    if (doc.id !== documentoId) return doc;
                    const updated = { ...doc, ...updates };
                    return {
                        ...updated,
                        status: calcularStatusDocumento(updated)
                    };
                })
            };
        }));
    }, []);

    const toggleDocumentoStatus = useCallback((checklistId: string, documentoId: string) => {
        setChecklists(prev => prev.map(checklist => {
            if (checklist.id !== checklistId) return checklist;

            return {
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
        }));
    }, []);

    const adicionarDocumento = useCallback((
        checklistId: string,
        documento: Omit<DocumentoChecklist, 'id' | 'ordem'>
    ) => {
        setChecklists(prev => prev.map(checklist => {
            if (checklist.id !== checklistId) return checklist;

            const novaOrdem = Math.max(...checklist.documentos.map(d => d.ordem), -1) + 1;

            return {
                ...checklist,
                atualizadoEm: new Date().toISOString(),
                documentos: [...checklist.documentos, {
                    ...documento,
                    id: generateId(),
                    ordem: novaOrdem,
                }]
            };
        }));
    }, []);

    const removerDocumento = useCallback((checklistId: string, documentoId: string) => {
        setChecklists(prev => prev.map(checklist => {
            if (checklist.id !== checklistId) return checklist;

            return {
                ...checklist,
                atualizadoEm: new Date().toISOString(),
                documentos: checklist.documentos.filter(d => d.id !== documentoId)
            };
        }));
    }, []);

    const excluirChecklist = useCallback((checklistId: string) => {
        setChecklists(prev => prev.filter(c => c.id !== checklistId));
        if (checklistAtual?.id === checklistId) {
            setChecklistAtual(null);
        }
    }, [checklistAtual]);

    const obterSummary = useCallback((checklist: Checklist): ChecklistSummary => {
        const docs = atualizarStatusDocumentos(checklist.documentos);
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
    }, []);

    const obterDocumentosVencendo = useCallback((): { checklist: Checklist; documento: DocumentoChecklist }[] => {
        const resultado: { checklist: Checklist; documento: DocumentoChecklist }[] = [];

        checklists.forEach(checklist => {
            checklist.documentos.forEach(doc => {
                if (doc.status === 'vencendo' || doc.status === 'vencido') {
                    resultado.push({ checklist, documento: doc });
                }
            });
        });

        return resultado.sort((a, b) => {
            const dataA = a.documento.dataValidade || '';
            const dataB = b.documento.dataValidade || '';
            return dataA.localeCompare(dataB);
        });
    }, [checklists]);

    return {
        checklists,
        checklistAtual,
        loading,
        setChecklistAtual,
        criarChecklist,
        analisarEditalComIA,
        atualizarDocumento,
        toggleDocumentoStatus,
        adicionarDocumento,
        removerDocumento,
        excluirChecklist,
        obterSummary,
        obterDocumentosVencendo,
    };
}
