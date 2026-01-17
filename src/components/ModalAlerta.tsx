"use client";

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FiltrosAlerta } from '@/types/alerta';
import { useAuthContext } from '@/contexts/AuthContext';
import { MODALIDADES, UFS } from '@/types/licitacao';

interface Props {
    open: boolean;
    onClose: () => void;
    onSave: (data: { id?: string; nome: string; filtros: FiltrosAlerta }) => void;
    defaults?: { periodicidade?: string };
    initial?: { id: string; nome: string; filtros: FiltrosAlerta; periodicidade?: string } | null;
}

export default function ModalAlerta({ open, onClose, onSave, defaults, initial }: Props) {
    const [nome, setNome] = useState('');
    const [palavras, setPalavras] = useState('');
    const [orgaos, setOrgaos] = useState('');
    const [regioes, setRegioes] = useState('');
    const [modalidades, setModalidades] = useState('');
    const [valorMin, setValorMin] = useState('');
    const [valorMax, setValorMax] = useState('');
    const [diasAbertura, setDiasAbertura] = useState('');
    const { configuracoes } = useAuthContext();

    const [touched, setTouched] = useState(false);
    // modalidades and regioes stored as arrays using predefined lists
    const [selectedModalidades, setSelectedModalidades] = useState<string[]>([]);
    const [selectedRegioes, setSelectedRegioes] = useState<string[]>([]);

    useEffect(() => {
        if (!open) {
            setNome(''); setPalavras(''); setOrgaos(''); setSelectedRegioes([]); setSelectedModalidades([]); setValorMin(''); setValorMax(''); setDiasAbertura('');
            setTouched(false);
            return;
        }
    }, [open, defaults, configuracoes]);

    useEffect(() => {
        if (initial && open) {
            setNome(initial.nome || '');
            setPalavras((initial.filtros?.palavrasChave || []).join(', '));
            setOrgaos((initial.filtros?.orgaos || []).join(', '));
            setSelectedRegioes(initial.filtros?.regioes || []);
            setSelectedModalidades(initial.filtros?.modalidades || []);
            setValorMin(initial.filtros?.valorMin ? String(initial.filtros.valorMin) : '');
            setValorMax(initial.filtros?.valorMax ? String(initial.filtros.valorMax) : '');
            setDiasAbertura(initial.filtros?.diasAbertura ? String(initial.filtros.diasAbertura) : '');
        }
    }, [initial, open]);

    function handleSave() {
        const filtros: FiltrosAlerta = {
            palavrasChave: palavras.split(',').map(s => s.trim()).filter(Boolean),
            orgaos: orgaos.split(',').map(s => s.trim()).filter(Boolean),
            regioes: selectedRegioes,
            modalidades: selectedModalidades,
            valorMin: valorMin ? Number(valorMin) : undefined,
            valorMax: valorMax ? Number(valorMax) : undefined,
            diasAbertura: diasAbertura ? Number(diasAbertura) : undefined,
        };
        onSave({ id: initial?.id, nome, filtros });
        onClose();
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl overflow-hidden transform transition duration-200 scale-100 motion-reduce:transition-none">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold">Criar Alerta</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2 rounded-md"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">Defina filtros para receber notificações relevantes. Separe valores por vírgula.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do alerta</label>
                            <input
                                value={nome}
                                onChange={e => { setNome(e.target.value); setTouched(true); }}
                                placeholder="Ex.: Obras públicas SP - pavimentação"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            {touched && !nome && <div className="text-sm text-red-600 mt-1">Nome é obrigatório</div>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Palavras-chave</label>
                            <input value={palavras} onChange={e => setPalavras(e.target.value)} placeholder="ex.: pavimentação, asfalto" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Órgãos</label>
                            <input value={orgaos} onChange={e => setOrgaos(e.target.value)} placeholder="ex.: Prefeitura de São Paulo" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Regiões / UF</label>
                            <div className="grid grid-cols-4 gap-2 max-h-36 overflow-auto border border-gray-100 p-2 rounded">
                                {UFS.map((uf) => (
                                    <label key={uf} className="inline-flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={selectedRegioes.includes(uf)} onChange={() => {
                                            setSelectedRegioes(prev => prev.includes(uf) ? prev.filter(x => x !== uf) : [...prev, uf]);
                                        }} className="w-4 h-4" />
                                        <span>{uf}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Modalidades</label>
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-auto border border-gray-100 p-2 rounded">
                                {Object.entries(MODALIDADES).map(([key, label]) => (
                                    <label key={key} className="inline-flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={selectedModalidades.includes(label)} onChange={() => {
                                            setSelectedModalidades(prev => prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]);
                                        }} className="w-4 h-4" />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dias até abertura</label>
                            <input type="number" min={0} value={diasAbertura} onChange={e => setDiasAbertura(e.target.value)} placeholder="Ex.: 30" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor mínimo (R$)</label>
                            <input type="number" min={0} value={valorMin} onChange={e => setValorMin(e.target.value)} placeholder="Ex.: 100000" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor máximo (R$)</label>
                            <input type="number" min={0} value={valorMax} onChange={e => setValorMax(e.target.value)} placeholder="Ex.: 5000000" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                        </div>

                        {/* periodicidade definida nas preferências do perfil - não necessário aqui */}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition">Cancelar</button>
                        <button disabled={!nome.trim()} onClick={handleSave} className={`px-4 py-2 rounded-md text-white ${nome.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'} transition`}>{initial ? 'Salvar alterações' : 'Criar alerta'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
