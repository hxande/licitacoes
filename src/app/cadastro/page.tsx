'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Mail, Lock, Loader2, Eye, EyeOff, User, CheckCircle } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

export default function CadastroPage() {
    const router = useRouter();
    const { registrar, carregando: carregandoAuth, autenticado } = useAuthContext();

    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState(false);

    // Se já estiver autenticado, redireciona
    useEffect(() => {
        if (autenticado && !carregandoAuth) {
            router.push('/');
        }
    }, [autenticado, carregandoAuth, router]);

    const validarFormulario = (): string | null => {
        if (!nome.trim()) return 'Nome é obrigatório';
        if (nome.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres';
        if (!email.trim()) return 'Email é obrigatório';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email inválido';
        if (!senha) return 'Senha é obrigatória';
        if (senha.length < 6) return 'Senha deve ter pelo menos 6 caracteres';
        if (senha !== confirmarSenha) return 'As senhas não coincidem';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro('');

        const erroValidacao = validarFormulario();
        if (erroValidacao) {
            setErro(erroValidacao);
            return;
        }

        setCarregando(true);

        try {
            const resultado = await registrar(nome.trim(), email.trim(), senha);
            if (resultado.sucesso) {
                setSucesso(true);
            } else {
                setErro(resultado.erro || 'Erro ao criar conta');
            }
        } catch {
            setErro('Erro ao criar conta. Tente novamente.');
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

    // Tela de sucesso
    if (sucesso) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Conta criada com sucesso!</h1>
                    <p className="text-gray-600 mb-6">
                        Enviamos um email de verificação para <strong>{email}</strong>.
                        Clique no link do email para ativar sua conta.
                    </p>
                    <div className="space-y-3">
                        <Link
                            href="/login"
                            className="block w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                        >
                            Ir para Login
                        </Link>
                        <p className="text-sm text-gray-500">
                            Não recebeu o email?{' '}
                            <button
                                onClick={async () => {
                                    const response = await fetch('/api/auth/reenviar-verificacao', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ email }),
                                    });
                                    const data = await response.json();
                                    if (data.success) {
                                        alert('Email reenviado! Verifique sua caixa de entrada.');
                                    } else {
                                        alert(data.error || 'Erro ao reenviar email');
                                    }
                                }}
                                className="text-blue-600 hover:underline"
                            >
                                Reenviar
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                {/* Logo e Título */}
                <div className="text-center mb-8">
                    <img src="/logo.jpg" alt="Licitaly" className="w-20 h-20 rounded-xl object-cover mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900">Criar Conta</h1>
                    <p className="text-gray-500 mt-1">Cadastre-se para acessar o Licitaly</p>
                </div>

                {/* Formulário */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nome */}
                    <div>
                        <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                            Nome completo
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                id="nome"
                                type="text"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Seu nome"
                                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                disabled={carregando}
                            />
                        </div>
                    </div>

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
                                placeholder="Mínimo 6 caracteres"
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

                    {/* Confirmar Senha */}
                    <div>
                        <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-1">
                            Confirmar senha
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                id="confirmarSenha"
                                type={mostrarSenha ? 'text' : 'password'}
                                value={confirmarSenha}
                                onChange={(e) => setConfirmarSenha(e.target.value)}
                                placeholder="Digite a senha novamente"
                                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                disabled={carregando}
                            />
                        </div>
                    </div>

                    {/* Erro */}
                    {erro && (
                        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                            {erro}
                        </div>
                    )}

                    {/* Botão de Cadastro */}
                    <button
                        type="submit"
                        disabled={carregando}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {carregando ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Criando conta...
                            </>
                        ) : (
                            'Criar conta'
                        )}
                    </button>
                </form>

                {/* Link para login */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Já tem uma conta?{' '}
                        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                            Faça login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
