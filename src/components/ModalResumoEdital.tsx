'use client';

import { useState, useCallback } from 'react';
import {
    Upload,
    FileText,
    X,
    Loader2,
    CheckCircle,
    AlertCircle,
    Calendar,
    DollarSign,
    ClipboardList,
    Scale,
    AlertTriangle,
    FileSearch,
} from 'lucide-react';
import { ResumoEdital } from '@/types/resumo-edital';

interface ModalResumoEditalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ModalResumoEdital({ isOpen, onClose }: ModalResumoEditalProps) {
    const [arquivo, setArquivo] = useState<File | null>(null);
    const [arrastando, setArrastando] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [resumo, setResumo] = useState<ResumoEdital | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setArrastando(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setArrastando(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setArrastando(false);
        setErro(null);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                setArquivo(file);
            } else {
                setErro('Por favor, envie apenas arquivos PDF');
            }
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setErro(null);
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                setArquivo(file);
            } else {
                setErro('Por favor, envie apenas arquivos PDF');
            }
        }
    }, []);

    const handleEnviar = async () => {
        if (!arquivo) return;

        setCarregando(true);
        setErro(null);

        try {
            const formData = new FormData();
            formData.append('file', arquivo);

            const response = await fetch('/api/resumir-edital', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao processar o edital');
            }

            setResumo(data.resumo);
        } catch (err) {
            setErro(err instanceof Error ? err.message : 'Erro ao processar o edital');
        } finally {
            setCarregando(false);
        }
    };

    const handleLimpar = () => {
        setArquivo(null);
        setResumo(null);
        setErro(null);
    };

    const formatarTamanho = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex items-center gap-3">
                        <FileSearch className="w-6 h-6" />
                        <div>
                            <h2 className="text-xl font-bold">Resumo Automático de Edital</h2>
                            <p className="text-blue-100 text-sm">Envie um PDF e a IA extrai os pontos principais</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!resumo ? (
                        <div className="space-y-6">
                            {/* Área de Drop */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${arrastando
                                    ? 'border-blue-500 bg-blue-50'
                                    : arquivo
                                        ? 'border-green-400 bg-green-50'
                                        : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                                    }`}
                            >
                                {arquivo ? (
                                    <div className="flex items-center justify-center gap-4">
                                        <div className="p-3 bg-green-100 rounded-full">
                                            <FileText className="w-8 h-8 text-green-600" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium text-gray-900">{arquivo.name}</p>
                                            <p className="text-sm text-gray-500">{formatarTamanho(arquivo.size)}</p>
                                        </div>
                                        <button
                                            onClick={handleLimpar}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                                            <Upload className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-lg font-medium text-gray-700 mb-1">
                                            Arraste o PDF do edital aqui
                                        </p>
                                        <p className="text-gray-500 mb-4">ou</p>
                                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer">
                                            <Upload className="w-4 h-4" />
                                            Selecionar arquivo
                                            <input
                                                type="file"
                                                accept=".pdf,application/pdf"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                        </label>
                                        <p className="text-xs text-gray-400 mt-4">Máximo 10MB • Apenas PDF</p>
                                    </>
                                )}
                            </div>

                            {/* Erro */}
                            {erro && (
                                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <p>{erro}</p>
                                </div>
                            )}

                            {/* Botão Enviar */}
                            {arquivo && !carregando && (
                                <button
                                    onClick={handleEnviar}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition font-medium"
                                >
                                    <FileSearch className="w-5 h-5" />
                                    Analisar Edital com IA
                                </button>
                            )}

                            {/* Loading */}
                            {carregando && (
                                <div className="text-center py-8">
                                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                                    <p className="text-lg font-medium text-gray-700">Analisando edital...</p>
                                    <p className="text-gray-500">Isso pode levar alguns segundos</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Resultado do Resumo */
                        <div className="space-y-6">
                            {/* Sucesso */}
                            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                <p>Edital analisado com sucesso!</p>
                            </div>

                            {/* Objeto */}
                            <div className="bg-blue-50 rounded-xl p-5">
                                <h3 className="flex items-center gap-2 font-semibold text-blue-800 mb-3">
                                    <ClipboardList className="w-5 h-5" />
                                    Objeto da Licitação
                                </h3>
                                <p className="text-gray-700">{resumo.objetoResumido}</p>
                            </div>

                            {/* Valor Estimado */}
                            {resumo.valorEstimado && (
                                <div className="bg-green-50 rounded-xl p-5">
                                    <h3 className="flex items-center gap-2 font-semibold text-green-800 mb-3">
                                        <DollarSign className="w-5 h-5" />
                                        Valor Estimado
                                    </h3>
                                    <p className="text-2xl font-bold text-green-700">{resumo.valorEstimado}</p>
                                </div>
                            )}

                            {/* Critérios de Julgamento */}
                            <div className="bg-purple-50 rounded-xl p-5">
                                <h3 className="flex items-center gap-2 font-semibold text-purple-800 mb-3">
                                    <Scale className="w-5 h-5" />
                                    Critérios de Julgamento
                                </h3>
                                <p className="text-gray-700">{resumo.criteriosJulgamento}</p>
                            </div>

                            {/* Prazos */}
                            {resumo.prazosImportantes && resumo.prazosImportantes.length > 0 && (
                                <div className="bg-amber-50 rounded-xl p-5">
                                    <h3 className="flex items-center gap-2 font-semibold text-amber-800 mb-3">
                                        <Calendar className="w-5 h-5" />
                                        Prazos Importantes
                                    </h3>
                                    <div className="space-y-2">
                                        {resumo.prazosImportantes.map((prazo, index) => (
                                            <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                                                <Calendar className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-gray-700">{prazo.descricao}</p>
                                                    {prazo.data && (
                                                        <p className="text-sm font-medium text-amber-700">{prazo.data}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Requisitos de Habilitação */}
                            {resumo.requisitosHabilitacao && resumo.requisitosHabilitacao.length > 0 && (
                                <div className="bg-gray-50 rounded-xl p-5">
                                    <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
                                        <ClipboardList className="w-5 h-5" />
                                        Requisitos de Habilitação
                                    </h3>
                                    <ul className="space-y-2">
                                        {resumo.requisitosHabilitacao.map((req, index) => (
                                            <li key={index} className="flex items-start gap-2 text-gray-700">
                                                <span className="text-blue-500 mt-1">•</span>
                                                <span>{req}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Observações */}
                            {resumo.observacoesAdicionais && resumo.observacoesAdicionais.length > 0 && (
                                <div className="bg-red-50 rounded-xl p-5">
                                    <h3 className="flex items-center gap-2 font-semibold text-red-800 mb-3">
                                        <AlertTriangle className="w-5 h-5" />
                                        Pontos de Atenção
                                    </h3>
                                    <ul className="space-y-2">
                                        {resumo.observacoesAdicionais.map((obs, index) => (
                                            <li key={index} className="flex items-start gap-2 text-gray-700">
                                                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                                <span>{obs}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Botão Nova Análise */}
                            <button
                                onClick={handleLimpar}
                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
                            >
                                <Upload className="w-5 h-5" />
                                Analisar outro edital
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
