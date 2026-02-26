'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[App Error]', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Algo deu errado</h2>
                <p className="text-sm text-gray-500 mb-6">
                    Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
                </p>
                <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
                >
                    <RefreshCw className="w-4 h-4" />
                    Tentar novamente
                </button>
            </div>
        </div>
    );
}
