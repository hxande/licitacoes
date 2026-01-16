'use client';

import { useState, useCallback } from 'react';
import {
    FileText,
    Upload,
    Sparkles,
    Loader2,
    AlertCircle,
    ClipboardPaste,
    X,
    List,
} from 'lucide-react';
import { Checklist, DocumentoChecklist } from '@/types/checklist';

interface CriarChecklistProps {
    onChecklistCriado: (checklist: Checklist) => void;
    onUsarPadrao: () => void;
    licitacaoData?: {
        titulo?: string;
        orgao?: string;
        objeto?: string;
        dataAbertura?: string;
        licitacaoId?: string;
    };
}

export function CriarChecklist({
    onChecklistCriado,
    onUsarPadrao,
    licitacaoData,
}: CriarChecklistProps) {
    const [textoEdital, setTextoEdital] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modo, setModo] = useState<'escolha' | 'colar' | 'upload'>('escolha');

    const analisarEdital = useCallback(async () => {
        if (!textoEdital || textoEdital.trim().length < 100) {
            setError('O texto do edital deve ter pelo menos 100 caracteres.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/analisar-edital', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    textoEdital,
                    dadosLicitacao: licitacaoData,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao analisar edital');
            }

            // Criar o checklist com os documentos retornados
            const agora = new Date().toISOString();
            const novoChecklist: Checklist = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                titulo: licitacaoData?.titulo || 'Checklist de Licitação',
                licitacaoId: licitacaoData?.licitacaoId,
                orgao: licitacaoData?.orgao,
                objeto: licitacaoData?.objeto,
                dataAbertura: licitacaoData?.dataAbertura,
                documentos: data.documentos,
                criadoEm: agora,
                atualizadoEm: agora,
            };

            onChecklistCriado(novoChecklist);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao analisar edital');
        } finally {
            setLoading(false);
        }
    }, [textoEdital, licitacaoData, onChecklistCriado]);

    const handleFileUpload = useCallback(async (file: File) => {
        setLoading(true);
        setError(null);

        try {
            // Ler arquivo como texto
            const text = await file.text();
            setTextoEdital(text);
            setModo('colar');
        } catch (err) {
            setError('Erro ao ler arquivo. Use um arquivo de texto (.txt) ou cole o conteúdo manualmente.');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    const handlePaste = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setTextoEdital(text);
            }
        } catch (err) {
            // Clipboard API pode não estar disponível
            setError('Não foi possível acessar a área de transferência. Cole manualmente (Ctrl+V).');
        }
    }, []);

    if (modo === 'escolha') {
        return (
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Criar Checklist de Documentos</h2>
                    <p className="text-gray-600 mt-2">
                        Escolha como você quer criar o checklist para esta licitação
                    </p>
                </div>

                {licitacaoData?.objeto && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-500 mb-1">Licitação:</p>
                        <p className="text-gray-800 line-clamp-2">{licitacaoData.objeto}</p>
                        {licitacaoData.orgao && (
                            <p className="text-sm text-gray-600 mt-1">{licitacaoData.orgao}</p>
                        )}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Opção 1: Analisar Edital com IA */}
                    <button
                        onClick={() => setModo('colar')}
                        className="p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                <Sparkles className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="font-semibold text-gray-800">Analisar com IA</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            Cole o texto do edital e a IA extrairá automaticamente todos os documentos necessários
                        </p>
                        <span className="inline-block mt-3 text-xs text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded">
                            Recomendado
                        </span>
                    </button>

                    {/* Opção 2: Usar Lista Padrão */}
                    <button
                        onClick={onUsarPadrao}
                        className="p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                <List className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="font-semibold text-gray-800">Lista Padrão</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            Use uma lista padrão com os documentos mais comuns em licitações
                        </p>
                        <span className="inline-block mt-3 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                            Rápido
                        </span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Analisar Edital com IA</h2>
                        <p className="text-sm text-gray-600">Cole ou envie o texto do edital</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setModo('escolha');
                        setTextoEdital('');
                        setError(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 p-1"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Área de texto/upload */}
            <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="relative"
            >
                <textarea
                    value={textoEdital}
                    onChange={(e) => setTextoEdital(e.target.value)}
                    placeholder="Cole aqui o texto do edital (seções de habilitação, documentação, etc.)...

Dica: Copie especialmente as seções que falam sobre:
• Documentos de Habilitação
• Regularidade Fiscal
• Qualificação Técnica
• Declarações exigidas"
                    className="w-full h-64 border-2 border-dashed border-gray-300 rounded-xl p-4 resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />

                {/* Ações sobre o textarea */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                    <button
                        onClick={handlePaste}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                        <ClipboardPaste className="w-4 h-4" />
                        Colar
                    </button>
                    <label className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer transition-colors">
                        <Upload className="w-4 h-4" />
                        Arquivo
                        <input
                            type="file"
                            accept=".txt,.doc,.docx"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {/* Contador de caracteres */}
            <div className="flex justify-between items-center mt-2">
                <span className={`text-sm ${textoEdital.length < 100 ? 'text-gray-500' : 'text-green-600'}`}>
                    {textoEdital.length.toLocaleString()} caracteres
                    {textoEdital.length < 100 && ' (mínimo: 100)'}
                </span>
                {textoEdital.length > 0 && (
                    <button
                        onClick={() => setTextoEdital('')}
                        className="text-sm text-gray-500 hover:text-red-600"
                    >
                        Limpar
                    </button>
                )}
            </div>

            {/* Erro */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Botão de ação */}
            <div className="mt-6 flex gap-3">
                <button
                    onClick={() => {
                        setModo('escolha');
                        setTextoEdital('');
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    Voltar
                </button>
                <button
                    onClick={analisarEdital}
                    disabled={loading || textoEdital.length < 100}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Analisando edital...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5" />
                            Extrair Documentos com IA
                        </>
                    )}
                </button>
            </div>

            {/* Dica */}
            <p className="mt-4 text-xs text-gray-500 text-center">
                A IA analisará o texto e identificará automaticamente todos os documentos necessários para habilitação.
            </p>
        </div>
    );
}
