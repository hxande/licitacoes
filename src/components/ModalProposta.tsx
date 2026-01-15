'use client';

import { X, Copy, Check, Loader2, FileText, Download } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ModalPropostaProps {
    isOpen: boolean;
    onClose: () => void;
    proposta: string | null;
    loading: boolean;
    error: string | null;
    licitacaoObjeto: string;
}

export function ModalProposta({
    isOpen,
    onClose,
    proposta,
    loading,
    error,
    licitacaoObjeto,
}: ModalPropostaProps) {
    const [copiado, setCopiado] = useState(false);

    // Resetar estado de copiado quando modal fecha
    useEffect(() => {
        if (!isOpen) {
            setCopiado(false);
        }
    }, [isOpen]);

    // Fechar modal com ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    const copiarProposta = async () => {
        if (proposta) {
            await navigator.clipboard.writeText(proposta);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        }
    };

    const baixarProposta = () => {
        if (proposta) {
            const blob = new Blob([proposta], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `proposta-${Date.now()}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    // Função simples para renderizar Markdown básico
    const renderMarkdown = (text: string) => {
        return text
            .split('\n')
            .map((line, index) => {
                // Headers
                if (line.startsWith('### ')) {
                    return <h3 key={index} className="text-lg font-semibold text-gray-800 mt-4 mb-2">{line.slice(4)}</h3>;
                }
                if (line.startsWith('## ')) {
                    return <h2 key={index} className="text-xl font-bold text-gray-900 mt-6 mb-3">{line.slice(3)}</h2>;
                }
                if (line.startsWith('# ')) {
                    return <h1 key={index} className="text-2xl font-bold text-gray-900 mt-6 mb-4">{line.slice(2)}</h1>;
                }
                // Bold text with **
                if (line.includes('**')) {
                    const parts = line.split(/\*\*(.*?)\*\*/g);
                    return (
                        <p key={index} className="text-gray-700 mb-2">
                            {parts.map((part, i) =>
                                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                            )}
                        </p>
                    );
                }
                // List items
                if (line.startsWith('- ') || line.startsWith('* ')) {
                    return <li key={index} className="text-gray-700 ml-4 mb-1">{line.slice(2)}</li>;
                }
                if (line.match(/^\d+\. /)) {
                    return <li key={index} className="text-gray-700 ml-4 mb-1 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
                }
                // Empty line
                if (line.trim() === '') {
                    return <br key={index} />;
                }
                // Regular paragraph
                return <p key={index} className="text-gray-700 mb-2">{line}</p>;
            });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <FileText className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Proposta Gerada por IA
                                </h2>
                                <p className="text-sm text-gray-500 line-clamp-1">
                                    {licitacaoObjeto.slice(0, 60)}...
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                        {loading && (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                                <p className="text-gray-600 font-medium">Gerando proposta com IA...</p>
                                <p className="text-gray-400 text-sm mt-2">
                                    Isso pode levar alguns segundos
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                                <p className="text-red-600 font-medium">Erro ao gerar proposta</p>
                                <p className="text-red-500 text-sm mt-2">{error}</p>
                            </div>
                        )}

                        {proposta && !loading && (
                            <div className="prose prose-gray max-w-none">
                                {renderMarkdown(proposta)}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {proposta && !loading && (
                        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                            <button
                                onClick={baixarProposta}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium"
                            >
                                <Download className="w-4 h-4" />
                                Baixar Markdown
                            </button>
                            <button
                                onClick={copiarProposta}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                            >
                                {copiado ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Copiado!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        Copiar Proposta
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
