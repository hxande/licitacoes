'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

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
        <div className="min-h-screen bg-gradient-to-br from-[#0D4F8B] to-[#1565C0] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
                {/* Logo */}
                <img src="/logo/licitaly-icon.svg" alt="Licitaly" className="w-16 h-16 mx-auto mb-6" />

                {status === 'verificando' && (
                    <>
                        <Loader2 className="w-12 h-12 text-[#0D4F8B] animate-spin mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificando...</h1>
                        <p className="text-gray-600">Aguarde enquanto verificamos seu email.</p>
                    </>
                )}

                {status === 'sucesso' && (
                    <>
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#4CAF50]/10 rounded-full mb-6">
                            <CheckCircle className="w-10 h-10 text-[#4CAF50]" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verificado!</h1>
                        <p className="text-gray-600 mb-6">{mensagem}</p>
                        <Link
                            href="/login"
                            className="inline-block w-full py-3 bg-[#0D4F8B] text-white font-medium rounded-lg hover:bg-[#0D4F8B]/90 transition"
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
                                className="block w-full py-3 bg-[#0D4F8B] text-white font-medium rounded-lg hover:bg-[#0D4F8B]/90 transition"
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
            <div className="min-h-screen bg-gradient-to-br from-[#0D4F8B] to-[#1565C0] flex flex-col items-center justify-center gap-4">
                <img src="/logo/licitaly-icon.svg" alt="Licitaly" className="w-16 h-16" style={{ filter: 'brightness(0) invert(1)' }} />
                <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
        }>
            <VerificarEmailContent />
        </Suspense>
    );
}
