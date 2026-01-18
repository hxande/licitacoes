"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, Plus, Edit2, Trash2 } from 'lucide-react';
import { useAlertas } from '@/hooks/useAlertas';
import type { AlertaLocal } from '@/types/alerta';
import ModalAlerta from '@/components/ModalAlerta';
import { useAuthContext } from '@/contexts/AuthContext';

export default function PerfilAlertasPage() {
    const hook = useAlertas() as any;
    const { alertas, criarAlerta, removerAlerta } = hook as { alertas: AlertaLocal[]; criarAlerta: any; removerAlerta: any };
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<string | null>(null);
    const { configuracoes } = useAuthContext();

    function handleSave(data: { id?: string; nome: string; filtros: any }) {
        if (data.id) {
            if (hook.atualizarAlerta) hook.atualizarAlerta(data.id, { nome: data.nome, filtros: data.filtros });
            setEditing(null);
        } else {
            const periodicidade = configuracoes.resumoDiario ? 'diario' : (configuracoes.resumoSemanal ? 'semanal' : 'diario');
            criarAlerta({ nome: data.nome, filtros: data.filtros, periodicidade });
        }
        setOpen(false);
    }

    function handleEdit(id: string) {
        setEditing(id);
        setOpen(true);
    }

    function confirmDelete(id: string) {
        if (confirm('Tem certeza que deseja excluir este alerta?')) {
            removerAlerta(id);
        }
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/perfil" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
                                <ArrowLeft className="w-5 h-5" />
                                <span className="hidden sm:inline">Voltar</span>
                            </Link>
                            <div className="h-6 w-px bg-gray-200" />
                            <div className="flex items-center gap-2">
                                <Bell className="w-6 h-6 text-blue-600" />
                                <h1 className="text-xl font-bold text-gray-800">Meus Alertas</h1>
                            </div>
                        </div>

                        <div>
                            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md" onClick={() => { setEditing(null); setOpen(true); }}>
                                <Plus className="w-4 h-4" /> Novo alerta
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-4xl mx-auto">
                    {alertas.length === 0 ? (
                        <div className="bg-white rounded p-6 text-center">Nenhum alerta criado ainda. Crie um alerta para ser notificado sobre novas licitações.</div>
                    ) : (
                        <ul className="grid gap-4">
                            {alertas.map((a: AlertaLocal, i: number) => (
                                <li key={`${a.id ?? 'alert'}-${i}`} className="bg-white p-4 rounded shadow-sm flex items-center justify-between transform transition duration-200 hover:shadow-md hover:-translate-y-1">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center transition-colors duration-200 group-hover:bg-blue-100">
                                            <Bell className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900">{a.nome}</div>
                                            <div className="text-sm text-gray-500">{a.filtros?.palavrasChave?.slice(0, 3).join(', ')}{a.filtros?.palavrasChave?.length ? ' • ' : ''}{a.periodicidade} • {new Date(a.criadoEm).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button title="Editar" className="px-3 py-1 border rounded text-sm flex items-center gap-2 hover:bg-gray-50 transition" onClick={() => handleEdit(a.id)}><Edit2 className="w-4 h-4" />Editar</button>
                                        <button title="Excluir" className="px-3 py-1 border rounded text-sm text-red-600 flex items-center gap-2 hover:bg-red-50 transition" onClick={() => confirmDelete(a.id)}><Trash2 className="w-4 h-4" />Excluir</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <ModalAlerta
                        open={open}
                        onClose={() => { setOpen(false); setEditing(null); }}
                        initial={editing ? alertas.find((a: AlertaLocal) => a.id === editing) ?? null : null}
                        onSave={handleSave}
                    />
                </div>
            </main>
        </div>
    );
}
