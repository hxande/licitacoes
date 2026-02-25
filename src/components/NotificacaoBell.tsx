'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BellRing, Zap, Clock, Check } from 'lucide-react';
import { useNotificacoes } from '@/hooks/useNotificacoes';

function tempoRelativo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60_000);
    if (min < 1) return 'agora';
    if (min < 60) return `há ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    return `há ${d}d`;
}

export function NotificacaoBell() {
    const { notificacoes, totalNaoLidas, marcarComoLida, marcarTodasComoLidas } = useNotificacoes();
    const [aberto, setAberto] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Fechar ao clicar fora
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setAberto(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const recentes = notificacoes.slice(0, 5);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setAberto((v) => !v)}
                className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                aria-label="Notificações"
            >
                {totalNaoLidas > 0 ? (
                    <BellRing className="w-5 h-5 text-gray-700" />
                ) : (
                    <Bell className="w-5 h-5 text-gray-700" />
                )}
                {totalNaoLidas > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {totalNaoLidas > 99 ? '99+' : totalNaoLidas}
                    </span>
                )}
            </button>

            {aberto && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="font-semibold text-gray-800">Notificações</span>
                        {totalNaoLidas > 0 && (
                            <button
                                onClick={() => marcarTodasComoLidas()}
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" />
                                Marcar lidas
                            </button>
                        )}
                    </div>

                    {/* Lista */}
                    <div className="max-h-80 overflow-y-auto">
                        {recentes.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-400">
                                Nenhuma notificação
                            </div>
                        ) : (
                            recentes.map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => !n.lida && marcarComoLida([n.id])}
                                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 ${!n.lida ? 'bg-blue-50/50' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${n.tipo === 'nova_licitacao' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {n.tipo === 'nova_licitacao'
                                                ? <Zap className="w-3 h-3" />
                                                : <Clock className="w-3 h-3" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm leading-snug ${!n.lida ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                {n.titulo}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{n.corpo}</p>
                                            <p className="text-xs text-gray-400 mt-1">{tempoRelativo(n.criadoEm)}</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Rodapé */}
                    <div className="px-4 py-2 border-t border-gray-100">
                        <Link
                            href="/monitoramento"
                            onClick={() => setAberto(false)}
                            className="block text-center text-sm text-blue-600 hover:text-blue-700 py-1"
                        >
                            Ver todas →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
