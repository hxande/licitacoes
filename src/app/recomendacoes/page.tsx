'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AgenteRecomendacao from '@/components/AgenteRecomendacao';

export default function RecomendacoesPage() {
    const handleSelecionarLicitacao = (licitacaoId: string) => {
        // Aqui você pode implementar a navegação para os detalhes da licitação
        // ou abrir um modal com mais informações
        console.log('Licitação selecionada:', licitacaoId);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Recomendações Inteligentes
                            </h1>
                            <p className="text-gray-500">
                                Licitações selecionadas pela IA especialmente para sua empresa
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Conteúdo */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Dica de uso */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-medium text-blue-800">Como funciona?</h3>
                            <p className="text-blue-700 text-sm mt-1">
                                O agente de IA analisa seu perfil empresarial (áreas de atuação, capacidades, certificações, 
                                estados e faixa de valores) e compara semanticamente com as licitações disponíveis, 
                                identificando as melhores oportunidades para você. Certifique-se de que seu{' '}
                                <Link href="/perfil" className="underline font-medium">perfil está atualizado</Link> 
                                {' '}para obter melhores recomendações.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Componente do Agente */}
                <AgenteRecomendacao onSelecionarLicitacao={handleSelecionarLicitacao} />
            </main>
        </div>
    );
}
