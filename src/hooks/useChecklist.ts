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

    // Carregar checklists do servidor
    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/checklists');
                if (!res.ok) throw new Error('API unavailable');
                const data = await res.json();
                if (Array.isArray(data)) {
                    const updated = data.map((checklist: Checklist) => ({ ...checklist, documentos: atualizarStatusDocumentos(checklist.documentos) }));
                    setChecklists(updated);
                    saveToStorage(updated);
                    return;
                }
            } catch (e) {
                // fallback to localStorage
                const stored = loadFromStorage();
                if (stored && Array.isArray(stored)) {
                    const updated = stored.map((checklist: Checklist) => ({ ...checklist, documentos: atualizarStatusDocumentos(checklist.documentos) }));
                    setChecklists(updated);
                }
            }
        }
        load();
    }, []);

    function loadFromStorage(): Checklist[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            return JSON.parse(raw) as Checklist[];
        } catch (e) {
            return [];
        }
    }

    function saveToStorage(list: Checklist[]) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
            // ignore
        }
    }

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

        setChecklists(prev => {
            const next = [...prev, novoChecklist];
            saveToStorage(next);
            return next;
        });
        // persist to server; if fails, keep local copy
        fetch('/api/checklists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoChecklist) }).catch(() => { saveToStorage(getCurrentChecklists()); });
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

            const novo = {
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
            // persist
            const payload = { id: novo.id, titulo: novo.titulo, documentos: novo.documentos };
            fetch('/api/checklists', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                .catch(() => { saveToStorage(getCurrentChecklists()); });
            return novo;
        }));
    }, []);

    const toggleDocumentoStatus = useCallback((checklistId: string, documentoId: string) => {
        setChecklists(prev => prev.map(checklist => {
            if (checklist.id !== checklistId) return checklist;

            const novo = {
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
            const payload = { id: novo.id, titulo: novo.titulo, documentos: novo.documentos };
            fetch('/api/checklists', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                .catch(() => { saveToStorage(getCurrentChecklists()); });
            return novo;
        }));
    }, []);

    const adicionarDocumento = useCallback((
        checklistId: string,
        documento: Omit<DocumentoChecklist, 'id' | 'ordem'>
    ) => {
        setChecklists(prev => prev.map(checklist => {
            if (checklist.id !== checklistId) return checklist;

            const novaOrdem = Math.max(...checklist.documentos.map(d => d.ordem), -1) + 1;

            const novo = {
                ...checklist,
                atualizadoEm: new Date().toISOString(),
                documentos: [...checklist.documentos, {
                    ...documento,
                    id: generateId(),
                    ordem: novaOrdem,
                }]
            };
            const payload = { id: novo.id, titulo: novo.titulo, documentos: novo.documentos };
            fetch('/api/checklists', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                .catch(() => { saveToStorage(getCurrentChecklists()); });
            return novo;
        }));
    }, []);

    const removerDocumento = useCallback((checklistId: string, documentoId: string) => {
        setChecklists(prev => prev.map(checklist => {
            if (checklist.id !== checklistId) return checklist;

            const novo = {
                ...checklist,
                atualizadoEm: new Date().toISOString(),
                documentos: checklist.documentos.filter(d => d.id !== documentoId)
            };
            fetch('/api/checklists', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: novo.id, titulo: novo.titulo, documentos: novo.documentos }) }).catch(() => { });
            return novo;
        }));
    }, []);

    const excluirChecklist = useCallback((checklistId: string) => {
        setChecklists(prev => {
            const next = prev.filter(c => c.id !== checklistId);
            saveToStorage(next);
            return next;
        });
        fetch(`/api/checklists?id=${encodeURIComponent(checklistId)}`, { method: 'DELETE' }).catch(() => { saveToStorage(getCurrentChecklists()); });
        if (checklistAtual?.id === checklistId) {
            setChecklistAtual(null);
        }
    }, [checklistAtual]);

    function getCurrentChecklists(): Checklist[] {
        try {
            return (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) ? JSON.parse(localStorage.getItem(STORAGE_KEY) as string) as Checklist[] : checklists;
        } catch (e) {
            return checklists;
        }
    }

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
