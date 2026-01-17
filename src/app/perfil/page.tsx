'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Bell,
    Save,
    Loader2,
    LogOut,
    Shield,
    Calendar,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

export default function PerfilPage() {
    const router = useRouter();
    const {
        usuario,
        configuracoes,
        carregando: carregandoAuth,
        autenticado,
        atualizarPerfil,
        atualizarConfiguracoes,
        logout,
    } = useAuthContext();

    const [nome, setNome] = useState('');
    const [telefone, setTelefone] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

    // Carregar dados do usuário
    useEffect(() => {
        if (usuario) {
            setNome(usuario.nome || '');
            setTelefone(usuario.telefone || '');
        }
    }, [usuario]);

    // Redirecionar se não autenticado
    useEffect(() => {
        if (!carregandoAuth && !autenticado) {
            router.push('/login');
        }
    }, [carregandoAuth, autenticado, router]);

    const handleSalvar = async () => {
        setSalvando(true);
        setMensagem(null);

        try {
            // Simula delay de rede
            await new Promise(resolve => setTimeout(resolve, 500));

            atualizarPerfil({
                nome,
                telefone,
            });

            setMensagem({ tipo: 'sucesso', texto: 'Perfil atualizado com sucesso!' });
        } catch {
            setMensagem({ tipo: 'erro', texto: 'Erro ao salvar perfil' });
        } finally {
            setSalvando(false);
        }
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const formatarData = (data: string) => {
        return new Date(data).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    if (carregandoAuth || !usuario) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/"
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span>Voltar</span>
                            </Link>
                            <div className="h-6 w-px bg-gray-200" />
                            <h1 className="text-xl font-bold text-gray-800">Meu Perfil</h1>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                            <LogOut className="w-4 h-4" />
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Mensagem de feedback */}
                {mensagem && (
                    <div
                        className={`mb-6 px-4 py-3 rounded-lg ${mensagem.tipo === 'sucesso'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                    >
                        {mensagem.texto}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Coluna Esquerda - Avatar e Info Básica */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            {/* Avatar */}
                            <div className="flex flex-col items-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                                    {nome ? nome.charAt(0).toUpperCase() : usuario.email.charAt(0).toUpperCase()}
                                </div>
                                <h2 className="mt-4 text-lg font-semibold text-gray-900">
                                    {nome || 'Usuário'}
                                </h2>
                                <p className="text-gray-500 text-sm">{usuario.email}</p>
                            </div>

                            {/* Info de Conta */}
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    <span>Membro desde {formatarData(usuario.criadoEm)}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
                                    <Shield className="w-4 h-4" />
                                    <span>Conta ativa</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita - Formulário */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Dados Pessoais */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" />
                                Dados Pessoais
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nome Completo
                                    </label>
                                    <input
                                        type="text"
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Seu nome"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="email"
                                            value={usuario.email}
                                            disabled
                                            className="w-full pl-11 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        O email não pode ser alterado
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Telefone
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="tel"
                                            value={telefone}
                                            onChange={(e) => setTelefone(e.target.value)}
                                            placeholder="(11) 99999-9999"
                                            className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notificações */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Bell className="w-5 h-5 text-blue-600" />
                                Preferências de Notificação
                            </h3>

                            <div className="space-y-4">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <span className="font-medium text-gray-700">Notificações por Email</span>
                                        <p className="text-sm text-gray-500">
                                            Receba alertas de novas licitações por email
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={configuracoes.notificacoesEmail}
                                        onChange={(e) =>
                                            atualizarConfiguracoes({ notificacoesEmail: e.target.checked })
                                        }
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>

                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <span className="font-medium text-gray-700">Notificações Push</span>
                                        <p className="text-sm text-gray-500">
                                            Receba notificações no navegador
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={configuracoes.notificacoesPush}
                                        onChange={(e) =>
                                            atualizarConfiguracoes({ notificacoesPush: e.target.checked })
                                        }
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>

                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <span className="font-medium text-gray-700">Resumo Diário</span>
                                        <p className="text-sm text-gray-500">
                                            Receba um resumo das licitações do dia
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={configuracoes.resumoDiario}
                                        onChange={(e) =>
                                            atualizarConfiguracoes({ resumoDiario: e.target.checked })
                                        }
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>

                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <span className="font-medium text-gray-700">Resumo Semanal</span>
                                        <p className="text-sm text-gray-500">
                                            Receba um relatório semanal de oportunidades
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={configuracoes.resumoSemanal}
                                        onChange={(e) =>
                                            atualizarConfiguracoes({ resumoSemanal: e.target.checked })
                                        }
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </label>
                            </div>

                            {/* Aviso de alertas futuros */}
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <p className="text-blue-800 text-sm">
                                    <strong>Em breve:</strong> Você poderá criar alertas personalizados
                                    por palavras-chave, região, valor e área de atuação.
                                </p>
                            </div>
                        </div>

                        {/* Botão Salvar */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleSalvar}
                                disabled={salvando}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {salvando ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Salvar Alterações
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
