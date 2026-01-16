'use client';

import { useState, useRef } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    X,
    Check,
    Plus,
    Trash2,
    Printer,
    Mail,
    AlertTriangle,
    Clock,
    ChevronDown,
    ChevronUp,
    FileText,
    Upload,
    Sparkles,
    Loader2,
    Calendar,
    CheckCircle2,
    Circle,
    AlertCircle,
} from 'lucide-react';
import {
    Checklist,
    DocumentoChecklist,
    CategoriaDocumento,
    StatusDocumento,
    CATEGORIAS_DOCUMENTO,
    STATUS_DOCUMENTO,
    ChecklistSummary,
} from '@/types/checklist';

interface ChecklistViewProps {
    checklist: Checklist;
    summary: ChecklistSummary;
    onToggleDocumento: (documentoId: string) => void;
    onAtualizarDocumento: (documentoId: string, updates: Partial<DocumentoChecklist>) => void;
    onAdicionarDocumento: (documento: Omit<DocumentoChecklist, 'id' | 'ordem'>) => void;
    onRemoverDocumento: (documentoId: string) => void;
    onClose?: () => void;
}

export function ChecklistView({
    checklist,
    summary,
    onToggleDocumento,
    onAtualizarDocumento,
    onAdicionarDocumento,
    onRemoverDocumento,
    onClose,
}: ChecklistViewProps) {
    const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(
        new Set(Object.keys(CATEGORIAS_DOCUMENTO))
    );
    const [modalEmail, setModalEmail] = useState(false);
    const [email, setEmail] = useState('');
    const [enviandoEmail, setEnviandoEmail] = useState(false);
    const [modalNovoDoc, setModalNovoDoc] = useState(false);
    const [editandoValidade, setEditandoValidade] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const toggleCategoria = (categoria: string) => {
        const novas = new Set(categoriasExpandidas);
        if (novas.has(categoria)) {
            novas.delete(categoria);
        } else {
            novas.add(categoria);
        }
        setCategoriasExpandidas(novas);
    };

    const documentosPorCategoria = checklist.documentos.reduce((acc, doc) => {
        if (!acc[doc.categoria]) {
            acc[doc.categoria] = [];
        }
        acc[doc.categoria].push(doc);
        return acc;
    }, {} as Record<CategoriaDocumento, DocumentoChecklist[]>);

    const handlePrint = () => {
        window.print();
    };

    const handleEnviarEmail = async () => {
        if (!email || !email.includes('@')) return;

        setEnviandoEmail(true);
        try {
            const response = await fetch('/api/enviar-checklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, checklist }),
            });

            const data = await response.json();
            if (data.success) {
                alert(`Checklist enviado para ${email}!`);
                setModalEmail(false);
                setEmail('');
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (error) {
            alert('Erro ao enviar email');
        } finally {
            setEnviandoEmail(false);
        }
    };

    const getStatusIcon = (status: StatusDocumento) => {
        switch (status) {
            case 'pronto':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'pendente':
                return <Circle className="w-5 h-5 text-gray-400" />;
            case 'vencido':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'vencendo':
                return <Clock className="w-5 h-5 text-yellow-500" />;
        }
    };

    const getValidadeInfo = (doc: DocumentoChecklist) => {
        if (!doc.dataValidade) return null;

        const hoje = new Date();
        const validade = parseISO(doc.dataValidade);
        const diasRestantes = differenceInDays(validade, hoje);

        if (diasRestantes < 0) {
            return { texto: `Vencido há ${Math.abs(diasRestantes)} dias`, cor: 'text-red-600' };
        }
        if (diasRestantes === 0) {
            return { texto: 'Vence hoje!', cor: 'text-red-600' };
        }
        if (diasRestantes <= 7) {
            return { texto: `Vence em ${diasRestantes} dias`, cor: 'text-yellow-600' };
        }
        if (diasRestantes <= 30) {
            return { texto: `Vence em ${diasRestantes} dias`, cor: 'text-orange-500' };
        }
        return {
            texto: `Válido até ${format(validade, "dd/MM/yyyy", { locale: ptBR })}`,
            cor: 'text-gray-500'
        };
    };

    return (
        <div className="bg-white rounded-xl shadow-lg max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">{checklist.titulo}</h2>
                        {checklist.orgao && (
                            <p className="text-blue-100">Órgão: {checklist.orgao}</p>
                        )}
                        {checklist.objeto && (
                            <p className="text-blue-100 text-sm mt-1 line-clamp-2">
                                {checklist.objeto}
                            </p>
                        )}
                        {checklist.dataAbertura && (
                            <p className="text-blue-100 text-sm mt-1 flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Abertura: {format(parseISO(checklist.dataAbertura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                        )}
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white p-1"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="p-4 border-b bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">
                        {summary.prontos} de {summary.total} documentos prontos
                    </span>
                    <span className="text-sm font-semibold text-blue-600">
                        {summary.percentualConcluido}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${summary.percentualConcluido}%` }}
                    />
                </div>

                {/* Status badges */}
                <div className="flex gap-4 mt-3 flex-wrap">
                    {summary.vencidos > 0 && (
                        <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            {summary.vencidos} vencido(s)
                        </span>
                    )}
                    {summary.vencendo > 0 && (
                        <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                            <Clock className="w-3 h-3" />
                            {summary.vencendo} vencendo
                        </span>
                    )}
                    {summary.pendentes > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                            <Circle className="w-3 h-3" />
                            {summary.pendentes} pendente(s)
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-b flex gap-2 flex-wrap print:hidden">
                <button
                    onClick={() => setModalNovoDoc(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Adicionar Documento
                </button>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <Printer className="w-4 h-4" />
                    Imprimir
                </button>
                <button
                    onClick={() => setModalEmail(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <Mail className="w-4 h-4" />
                    Enviar por Email
                </button>
            </div>

            {/* Document List */}
            <div ref={printRef} className="p-4 space-y-6">
                {(Object.keys(CATEGORIAS_DOCUMENTO) as CategoriaDocumento[]).map((categoria) => {
                    const docs = documentosPorCategoria[categoria];
                    if (!docs || docs.length === 0) return null;

                    const isExpanded = categoriasExpandidas.has(categoria);
                    const docsCategoria = docs.sort((a, b) => a.ordem - b.ordem);
                    const prontosCategoria = docsCategoria.filter(d => d.status === 'pronto').length;

                    return (
                        <div key={categoria} className="border rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleCategoria(categoria)}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors print:bg-white"
                            >
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-gray-800">
                                        {CATEGORIAS_DOCUMENTO[categoria]}
                                    </h3>
                                    <span className="text-sm text-gray-500">
                                        ({prontosCategoria}/{docsCategoria.length})
                                    </span>
                                </div>
                                <span className="print:hidden">
                                    {isExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-gray-500" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                    )}
                                </span>
                            </button>

                            {(isExpanded || true) && (
                                <div className={`divide-y ${!isExpanded ? 'hidden print:block' : ''}`}>
                                    {docsCategoria.map((doc) => {
                                        const validadeInfo = getValidadeInfo(doc);

                                        return (
                                            <div
                                                key={doc.id}
                                                className={`p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors ${doc.status === 'vencido' ? 'bg-red-50' : ''
                                                    } ${doc.status === 'vencendo' ? 'bg-yellow-50' : ''}`}
                                            >
                                                {/* Checkbox */}
                                                <button
                                                    onClick={() => onToggleDocumento(doc.id)}
                                                    className="flex-shrink-0 mt-0.5 print:hidden"
                                                >
                                                    {getStatusIcon(doc.status)}
                                                </button>

                                                {/* Print checkbox */}
                                                <span className="hidden print:block flex-shrink-0">
                                                    {doc.status === 'pronto' ? '☑' : '☐'}
                                                </span>

                                                {/* Content */}
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className={`font-medium ${doc.status === 'pronto'
                                                                ? 'text-gray-500 line-through'
                                                                : 'text-gray-800'
                                                                }`}>
                                                                {doc.nome}
                                                                {doc.obrigatorio && (
                                                                    <span className="text-red-500 ml-1">*</span>
                                                                )}
                                                            </p>
                                                            {doc.descricao && (
                                                                <p className="text-sm text-gray-500 mt-0.5">
                                                                    {doc.descricao}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Status badge for print */}
                                                        <span className={`hidden print:inline-block text-xs px-2 py-0.5 rounded ${doc.status === 'pronto' ? 'bg-green-100 text-green-800' :
                                                            doc.status === 'vencido' ? 'bg-red-100 text-red-800' :
                                                                doc.status === 'vencendo' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {STATUS_DOCUMENTO[doc.status].label}
                                                        </span>
                                                    </div>

                                                    {/* Validade */}
                                                    <div className="mt-2 flex items-center gap-4 flex-wrap">
                                                        {editandoValidade === doc.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="date"
                                                                    value={doc.dataValidade || ''}
                                                                    onChange={(e) => {
                                                                        onAtualizarDocumento(doc.id, {
                                                                            dataValidade: e.target.value || undefined,
                                                                        });
                                                                    }}
                                                                    className="text-sm border rounded px-2 py-1"
                                                                />
                                                                <button
                                                                    onClick={() => setEditandoValidade(null)}
                                                                    className="text-sm text-blue-600 hover:underline"
                                                                >
                                                                    OK
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setEditandoValidade(doc.id)}
                                                                className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 print:hidden"
                                                            >
                                                                <Calendar className="w-3 h-3" />
                                                                {validadeInfo ? validadeInfo.texto : 'Definir validade'}
                                                            </button>
                                                        )}

                                                        {validadeInfo && !editandoValidade && (
                                                            <span className={`text-xs ${validadeInfo.cor} print:inline hidden`}>
                                                                {validadeInfo.texto}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Delete button */}
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Remover este documento do checklist?')) {
                                                            onRemoverDocumento(doc.id);
                                                        }
                                                    }}
                                                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors print:hidden"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 rounded-b-xl text-xs text-gray-500 print:bg-white">
                <p>
                    Criado em {format(parseISO(checklist.criadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    {' • '}
                    Atualizado em {format(parseISO(checklist.atualizadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <p className="mt-1">* Documentos obrigatórios</p>
            </div>

            {/* Modal Email */}
            {modalEmail && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Enviar Checklist por Email</h3>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Digite o email..."
                            className="w-full border rounded-lg px-4 py-2 mb-4"
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setModalEmail(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEnviarEmail}
                                disabled={enviandoEmail || !email}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {enviandoEmail ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4" />
                                        Enviar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Novo Documento */}
            {modalNovoDoc && (
                <ModalNovoDocumento
                    onClose={() => setModalNovoDoc(false)}
                    onSave={onAdicionarDocumento}
                />
            )}
        </div>
    );
}

// Modal para adicionar novo documento
function ModalNovoDocumento({
    onClose,
    onSave,
}: {
    onClose: () => void;
    onSave: (doc: Omit<DocumentoChecklist, 'id' | 'ordem'>) => void;
}) {
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [categoria, setCategoria] = useState<CategoriaDocumento>('outros');
    const [obrigatorio, setObrigatorio] = useState(true);

    const handleSave = () => {
        if (!nome.trim()) return;

        onSave({
            nome: nome.trim(),
            descricao: descricao.trim() || undefined,
            categoria,
            obrigatorio,
            status: 'pendente',
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Adicionar Documento</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome do Documento *
                        </label>
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Ex: Certidão de Regularidade"
                            className="w-full border rounded-lg px-4 py-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descrição (opcional)
                        </label>
                        <input
                            type="text"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            placeholder="Detalhes adicionais..."
                            className="w-full border rounded-lg px-4 py-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Categoria
                        </label>
                        <select
                            value={categoria}
                            onChange={(e) => setCategoria(e.target.value as CategoriaDocumento)}
                            className="w-full border rounded-lg px-4 py-2"
                        >
                            {Object.entries(CATEGORIAS_DOCUMENTO).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={obrigatorio}
                            onChange={(e) => setObrigatorio(e.target.checked)}
                            className="rounded"
                        />
                        <span className="text-sm text-gray-700">Documento obrigatório</span>
                    </label>
                </div>

                <div className="flex gap-2 justify-end mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!nome.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        Adicionar
                    </button>
                </div>
            </div>
        </div>
    );
}
