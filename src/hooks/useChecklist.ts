'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    Checklist,
    DocumentoChecklist,
    ChecklistSummary,
    StatusDocumento,
    DOCUMENTOS_COMUNS
} from '@/types/checklist';
import { useAuthContext } from '@/contexts/AuthContext';

const STORAGE_KEY = 'licitacoes_checklists';

function convertChecklistFromDb(data: any): Checklist {
    if (!data) return null as any;
    return {
        id: data.id,
        licitacaoId: data.licitacao_id,
        titulo: data.titulo,
        orgao: data.orgao,
        objeto: data.objeto,
        dataAbertura: data.data_abertura,
        documentos: data.documentos || [],
        criadoEm: data.criado_em,
        atualizadoEm: data.atualizado_em,
    };
}

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
    const { autenticado } = useAuthContext();
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [checklistAtual, setChecklistAtual] = useState<Checklist | null>(null);
    const [loading, setLoading] = useState(false);

    // Carregar checklists do servidor
    useEffect(() => {
        if (!autenticado) {
            setChecklists([]);
            return;
        }

        async function load() {
            try {
                const res = await fetch('/api/checklists', { credentials: 'include' });
                if (!res.ok) throw new Error('API unavailable');
                const data = await res.json();
                if (Array.isArray(data)) {
                    const updated = data.map((checklist: Checklist) => ({ ...checklist, documentos: atualizarStatusDocumentos(checklist.documentos) }));
                    setChecklists(updated);
                    return;
                }
            } catch (e) {
                // If API fails, keep empty list (no client persistence)
                setChecklists([]);
            }
        }
        load();
    }, [autenticado]);
    function loadFromStorage(): Checklist[] { return []; }
    function saveToStorage(_: Checklist[]) { /* noop - server persists checklists */ }

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

        setChecklists(prev => { const next = [...prev, novoChecklist]; return next; });
        // persist to server; if fails, keep local copy
        fetch('/api/checklists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoChecklist), credentials: 'include' }).catch(() => { /* ignore local fallback */ });
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
            const payload = { id: novo.id, titulo: novo.titulo, documentos: novo.documentos };
            fetch('/api/checklists', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' }).catch(() => { /* ignore */ });
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
            fetch('/api/checklists', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' })
                .catch(() => { /* ignore */ });
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
            fetch('/api/checklists', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' })
                .catch(() => { /* ignore */ });
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
            fetch('/api/checklists', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: novo.id, titulo: novo.titulo, documentos: novo.documentos }), credentials: 'include' }).catch(() => { });
            return novo;
        }));
    }, []);

    const excluirChecklist = useCallback((checklistId: string) => {
        setChecklists(prev => prev.filter(c => c.id !== checklistId));
        fetch(`/api/checklists?id=${encodeURIComponent(checklistId)}`, { method: 'DELETE', credentials: 'include' }).catch(() => { /* ignore */ });
        if (checklistAtual?.id === checklistId) {
            setChecklistAtual(null);
        }
    }, [checklistAtual]);

    function getCurrentChecklists(): Checklist[] { return checklists; }

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
