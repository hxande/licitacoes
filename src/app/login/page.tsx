'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { login, reenviarVerificacao, carregando: carregandoAuth, autenticado } = useAuthContext();

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');
    const [emailNaoVerificado, setEmailNaoVerificado] = useState(false);
    const [reenvioSucesso, setReenvioSucesso] = useState(false);

    // Se já estiver autenticado, redireciona
    useEffect(() => {
        if (autenticado && !carregandoAuth) {
            router.push('/');
        }
    }, [autenticado, carregandoAuth, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro('');
        setEmailNaoVerificado(false);
        setReenvioSucesso(false);

        if (!email || !senha) {
            setErro('Preencha todos os campos');
            return;
        }

        setCarregando(true);

        try {
            const resultado = await login(email, senha);
            if (resultado.sucesso) {
                router.push('/');
            } else {
                if (resultado.erro?.includes('verifique seu email')) {
                    setEmailNaoVerificado(true);
                }
                setErro(resultado.erro || 'Erro ao fazer login');
            }
        } catch {
            setErro('Erro ao fazer login. Tente novamente.');
        } finally {
            setCarregando(false);
        }
    };

    const handleReenviarVerificacao = async () => {
        setCarregando(true);
        try {
            const resultado = await reenviarVerificacao(email);
            if (resultado.sucesso) {
                setReenvioSucesso(true);
                setEmailNaoVerificado(false);
            } else {
                setErro(resultado.erro || 'Erro ao reenviar email');
            }
        } catch {
            setErro('Erro ao reenviar email. Tente novamente.');
        } finally {
            setCarregando(false);
        }
    };

    if (carregandoAuth) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                {/* Logo e Título */}
                <div className="text-center mb-8">
                    <img src="/logo.jpg" alt="Licitaly" className="w-20 h-20 rounded-xl object-cover mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900">Licitaly</h1>
                    <p className="text-gray-500 mt-1">Acesse sua conta</p>
                </div>

                {/* Mensagem de reenvio sucesso */}
                {reenvioSucesso && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-700 text-sm text-center">
                            Email de verificação reenviado! Verifique sua caixa de entrada.
                        </p>
                    </div>
                )}

                {/* Formulário */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                disabled={carregando}
                            />
                        </div>
                    </div>

                    {/* Senha */}
                    <div>
                        <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                            Senha
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                id="senha"
                                type={mostrarSenha ? 'text' : 'password'}
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                disabled={carregando}
                            />
                            <button
                                type="button"
                                onClick={() => setMostrarSenha(!mostrarSenha)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Erro */}
                    {erro && (
                        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                            {erro}
                            {emailNaoVerificado && (
                                <button
                                    type="button"
                                    onClick={handleReenviarVerificacao}
                                    className="block mt-2 text-blue-600 hover:underline"
                                >
                                    Reenviar email de verificação
                                </button>
                            )}
                        </div>
                    )}

                    {/* Botão de Login */}
                    <button
                        type="submit"
                        disabled={carregando}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {carregando ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Entrando...
                            </>
                        ) : (
                            'Entrar'
                        )}
                    </button>
                </form>

                {/* Link para cadastro */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Não tem uma conta?{' '}
                        <Link href="/cadastro" className="text-blue-600 hover:text-blue-700 font-medium">
                            Cadastre-se
                        </Link>
                    </p>
                </div>

                {/* Esqueci a senha */}
                <div className="mt-4 text-center">
                    <button className="text-sm text-gray-500 hover:text-gray-700 transition">
                        Esqueceu sua senha?
                    </button>
                </div>
            </div>
        </div>
    );
}
