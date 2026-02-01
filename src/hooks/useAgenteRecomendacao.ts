import { useState, useCallback } from 'react';
import { 
    AnaliseAgente, 
    ConfiguracaoAgente, 
    ResponseAgente 
} from '@/types/agente-recomendacao';

interface UseAgenteRecomendacaoReturn {
    analise: AnaliseAgente | null;
    loading: boolean;
    error: string | null;
    statusAgente: {
        versao: string;
        perfilConfigurado: boolean;
        apiKeyConfigurada: boolean;
        pronto: boolean;
    } | null;
    executarAnalise: (config?: ConfiguracaoAgente) => Promise<void>;
    verificarStatus: () => Promise<void>;
    limparAnalise: () => void;
}

export function useAgenteRecomendacao(): UseAgenteRecomendacaoReturn {
    const [analise, setAnalise] = useState<AnaliseAgente | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusAgente, setStatusAgente] = useState<UseAgenteRecomendacaoReturn['statusAgente']>(null);

    const verificarStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/agente-recomendacao');
            const data = await response.json();
            
            if (data.success) {
                setStatusAgente(data.status);
            } else {
                setError(data.error || 'Erro ao verificar status');
            }
        } catch (err) {
            setError('Erro de conexão ao verificar status do agente');
        }
    }, []);

    const executarAnalise = useCallback(async (config?: ConfiguracaoAgente) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/agente-recomendacao', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ configuracao: config }),
            });
            
            const data: ResponseAgente = await response.json();
            
            if (data.success && data.data) {
                setAnalise(data.data);
            } else {
                setError(data.error || 'Erro ao executar análise');
            }
        } catch (err) {
            setError('Erro de conexão com o agente de recomendação');
        } finally {
            setLoading(false);
        }
    }, []);

    const limparAnalise = useCallback(() => {
        setAnalise(null);
        setError(null);
    }, []);

    return {
        analise,
        loading,
        error,
        statusAgente,
        executarAnalise,
        verificarStatus,
        limparAnalise,
    };
}
