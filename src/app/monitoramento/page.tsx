'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Bell,
    Kanban,
    Zap,
    Clock,
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Check,
    Loader2,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePipeline } from '@/hooks/usePipeline';
import { useNotificacoes, Notificacao } from '@/hooks/useNotificacoes';
import { NotificacaoBell } from '@/components/NotificacaoBell';
import { LicitacaoPipeline, COLUNAS_PIPELINE } from '@/types/pipeline';

type Tab = 'pipeline' | 'notificacoes';

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

function diasRestantes(dataAbertura: string): number {
    const abertura = new Date(dataAbertura.split('T')[0]);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.ceil((abertura.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function chipStatus(status: string) {
    const col = COLUNAS_PIPELINE.find((c) => c.id === status);
    if (!col) return null;
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${col.bgColor} ${col.cor}`}>
            {col.titulo}
        </span>
    );
}

function CardPipelineMonitoramento({ l }: { l: LicitacaoPipeline }) {
    const dias = l.dataAbertura ? diasRestantes(l.dataAbertura) : null;
    const urgente = dias !== null && dias <= 3 && dias >= 0;
    const emBreve = dias !== null && dias > 3 && dias <= 7;

    return (
        <div className={`bg-white rounded-lg border p-4 ${urgente ? 'border-red-200' : emBreve ? 'border-yellow-200' : 'border-gray-100'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 leading-snug line-clamp-2">{l.objeto}</p>
                    <p className="text-sm text-gray-500 mt-1">{l.orgao} · {l.uf}</p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    {chipStatus(l.status)}
                    {dias !== null && (
                        <span className={`text-xs font-semibold ${urgente ? 'text-red-600' : emBreve ? 'text-yellow-600' : 'text-gray-500'}`}>
                            {dias === 0 ? 'Hoje!' : dias < 0 ? `${Math.abs(dias)}d atrás` : `${dias}d`}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function MonitoramentoPage() {
    const router = useRouter();
    const { autenticado, carregando: carregandoAuth } = useAuthContext();
    const { licitacoes, carregado, estatisticas } = usePipeline();
    const { notificacoes, totalNaoLidas, carregando: carregandoNotifs, marcarTodasComoLidas } = useNotificacoes();

    const [tab, setTab] = useState<Tab>('pipeline');
    const [apenasNaoLidas, setApenasNaoLidas] = useState(false);
    const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
    const [paginaNotifs, setPaginaNotifs] = useState(20);

    useEffect(() => {
        if (!carregandoAuth && !autenticado) router.push('/login');
    }, [carregandoAuth, autenticado, router]);

    if (carregandoAuth || !autenticado) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    // Agrupar pipeline por urgência
    const ativas = licitacoes.filter((l) => l.status !== 'ganha' && l.status !== 'perdida');
    const concluidas = licitacoes.filter((l) => l.status === 'ganha' || l.status === 'perdida');

    const urgentes = ativas.filter((l) => {
        if (!l.dataAbertura) return false;
        const d = diasRestantes(l.dataAbertura);
        return d >= 0 && d <= 3;
    });
    const emBreve = ativas.filter((l) => {
        if (!l.dataAbertura) return false;
        const d = diasRestantes(l.dataAbertura);
        return d > 3 && d <= 7;
    });
    const semPrazo = ativas.filter((l) => !l.dataAbertura);
    const outros = ativas.filter((l) => {
        if (!l.dataAbertura) return false;
        const d = diasRestantes(l.dataAbertura);
        return d > 7 || d < 0;
    });

    const notifsFiltradas = apenasNaoLidas
        ? notificacoes.filter((n) => !n.lida)
        : notificacoes;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition">
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </Link>
                            <h1 className="text-xl font-bold text-gray-900">Monitoramento</h1>
                        </div>
                        <NotificacaoBell />
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
                    <button
                        onClick={() => setTab('pipeline')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'pipeline' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Kanban className="w-4 h-4" />
                        Pipeline Ativo
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'pipeline' ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {ativas.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setTab('notificacoes')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'notificacoes' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Bell className="w-4 h-4" />
                        Notificações
                        {totalNaoLidas > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'notificacoes' ? 'bg-blue-500 text-white' : 'bg-red-100 text-red-600'}`}>
                                {totalNaoLidas}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab Pipeline */}
                {tab === 'pipeline' && (
                    <div className="space-y-6">
                        {/* Cards de resumo */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { label: 'Encontradas', val: estatisticas.encontradas, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'Analisando', val: estatisticas.analisando, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                                { label: 'Prop. Enviada', val: estatisticas.propostaEnviada, color: 'text-purple-600', bg: 'bg-purple-50' },
                                { label: 'Aguardando', val: estatisticas.aguardando, color: 'text-orange-600', bg: 'bg-orange-50' },
                            ].map((s) => (
                                <div key={s.label} className={`rounded-xl p-4 ${s.bg}`}>
                                    <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                                    <p className="text-sm text-gray-600 mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {!carregado ? (
                            <div className="text-center py-12 text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                Carregando pipeline...
                            </div>
                        ) : ativas.length === 0 && concluidas.length === 0 ? (
                            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                                <Kanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-600 font-medium">Nenhuma licitação em acompanhamento</p>
                                <p className="text-gray-400 text-sm mt-1">
                                    Adicione licitações pelo botão + nos cards da{' '}
                                    <Link href="/" className="text-blue-600 hover:underline">página principal</Link>.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Urgente */}
                                {urgentes.length > 0 && (
                                    <section>
                                        <h2 className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-3">
                                            <AlertTriangle className="w-4 h-4" />
                                            URGENTE — prazo em até 3 dias
                                        </h2>
                                        <div className="grid gap-3">
                                            {urgentes.map((l) => <CardPipelineMonitoramento key={l.id} l={l} />)}
                                        </div>
                                    </section>
                                )}

                                {/* Em breve */}
                                {emBreve.length > 0 && (
                                    <section>
                                        <h2 className="flex items-center gap-2 text-sm font-semibold text-yellow-700 mb-3">
                                            <Calendar className="w-4 h-4" />
                                            EM BREVE — prazo em 4–7 dias
                                        </h2>
                                        <div className="grid gap-3">
                                            {emBreve.map((l) => <CardPipelineMonitoramento key={l.id} l={l} />)}
                                        </div>
                                    </section>
                                )}

                                {/* Outros com prazo */}
                                {outros.length > 0 && (
                                    <section>
                                        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-3">
                                            <Kanban className="w-4 h-4" />
                                            DEMAIS LICITAÇÕES
                                        </h2>
                                        <div className="grid gap-3">
                                            {outros.map((l) => <CardPipelineMonitoramento key={l.id} l={l} />)}
                                        </div>
                                    </section>
                                )}

                                {/* Sem prazo */}
                                {semPrazo.length > 0 && (
                                    <section>
                                        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-3">
                                            <Clock className="w-4 h-4" />
                                            SEM PRAZO DEFINIDO
                                        </h2>
                                        <div className="grid gap-3">
                                            {semPrazo.map((l) => <CardPipelineMonitoramento key={l.id} l={l} />)}
                                        </div>
                                    </section>
                                )}

                                {/* Concluídas */}
                                {concluidas.length > 0 && (
                                    <section>
                                        <button
                                            onClick={() => setMostrarConcluidas((v) => !v)}
                                            className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-3 hover:text-gray-700 transition"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            CONCLUÍDAS ({concluidas.length})
                                            {mostrarConcluidas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        {mostrarConcluidas && (
                                            <div className="grid gap-3">
                                                {concluidas.map((l) => <CardPipelineMonitoramento key={l.id} l={l} />)}
                                            </div>
                                        )}
                                    </section>
                                )}

                                <div className="text-center">
                                    <Link
                                        href="/pipeline"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-sm font-medium"
                                    >
                                        <Kanban className="w-4 h-4" />
                                        Abrir Kanban completo
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Tab Notificações */}
                {tab === 'notificacoes' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setApenasNaoLidas(false)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${!apenasNaoLidas ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                >
                                    Todas ({notificacoes.length})
                                </button>
                                <button
                                    onClick={() => setApenasNaoLidas(true)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${apenasNaoLidas ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                >
                                    Não lidas ({totalNaoLidas})
                                </button>
                            </div>
                            {totalNaoLidas > 0 && (
                                <button
                                    onClick={() => marcarTodasComoLidas()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                >
                                    <Check className="w-4 h-4" />
                                    Marcar todas como lidas
                                </button>
                            )}
                        </div>

                        {carregandoNotifs && notifsFiltradas.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                Carregando notificações...
                            </div>
                        ) : notifsFiltradas.length === 0 ? (
                            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-600 font-medium">Nenhuma notificação</p>
                                <p className="text-gray-400 text-sm mt-1">
                                    As notificações aparecerão aqui quando o cron detectar novas licitações ou prazos.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {notifsFiltradas.slice(0, paginaNotifs).map((n: Notificacao) => (
                                    <div
                                        key={n.id}
                                        className={`bg-white rounded-xl border p-4 ${!n.lida ? 'border-blue-100 bg-blue-50/30' : 'border-gray-100'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${n.tipo === 'nova_licitacao' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {n.tipo === 'nova_licitacao'
                                                    ? <Zap className="w-4 h-4" />
                                                    : <Clock className="w-4 h-4" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`leading-snug ${!n.lida ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                    {n.titulo}
                                                </p>
                                                <p className="text-sm text-gray-500 mt-0.5">{n.corpo}</p>
                                                <p className="text-xs text-gray-400 mt-1">{tempoRelativo(n.criadoEm)}</p>
                                            </div>
                                            {!n.lida && (
                                                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {notifsFiltradas.length > paginaNotifs && (
                                    <div className="text-center pt-2">
                                        <button
                                            onClick={() => setPaginaNotifs((v) => v + 20)}
                                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                                        >
                                            Carregar mais
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
