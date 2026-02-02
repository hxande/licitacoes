'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';

function VerificarEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'verificando' | 'sucesso' | 'erro'>('verificando');
    const [mensagem, setMensagem] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('erro');
            setMensagem('Token não fornecido. Verifique o link do email.');
            return;
        }

        const verificar = async () => {
            try {
                const response = await fetch('/api/auth/verificar-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    setStatus('sucesso');
                    setMensagem(data.message || 'Email verificado com sucesso!');
                } else {
                    setStatus('erro');
                    setMensagem(data.error || 'Erro ao verificar email');
                }
            } catch (error) {
                setStatus('erro');
                setMensagem('Erro de conexão. Tente novamente.');
            }
        };

        verificar();
    }, [token]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
                {/* Logo */}
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-6">
                    <Building2 className="w-8 h-8 text-white" />
                </div>

                {status === 'verificando' && (
                    <>
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificando...</h1>
                        <p className="text-gray-600">Aguarde enquanto verificamos seu email.</p>
                    </>
                )}

                {status === 'sucesso' && (
                    <>
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verificado!</h1>
                        <p className="text-gray-600 mb-6">{mensagem}</p>
                        <Link
                            href="/login"
                            className="inline-block w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                        >
                            Fazer Login
                        </Link>
                    </>
                )}

                {status === 'erro' && (
                    <>
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
                            <XCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro na Verificação</h1>
                        <p className="text-gray-600 mb-6">{mensagem}</p>
                        <div className="space-y-3">
                            <Link
                                href="/login"
                                className="block w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                            >
                                Ir para Login
                            </Link>
                            <Link
                                href="/cadastro"
                                className="block w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
                            >
                                Criar nova conta
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function VerificarEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        }>
            <VerificarEmailContent />
        </Suspense>
    );
}
