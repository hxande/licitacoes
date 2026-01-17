'use client';

import { Zap, TrendingUp, AlertCircle, Brain } from 'lucide-react';
import { MatchResult } from '@/types/empresa';

interface BadgeMatchProps {
    match: MatchResult;
    size?: 'sm' | 'md' | 'lg';
    showDestaques?: boolean;
    onAnaliseIA?: () => void;
}

export function BadgeMatch({ match, size = 'md', showDestaques = false, onAnaliseIA }: BadgeMatchProps) {
    const { percentual, destaques } = match;

    // Determinar cor e ícone baseado no percentual
    const getMatchStyle = () => {
        if (percentual >= 80) {
            return {
                bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
                text: 'text-white',
                icon: Zap,
                label: 'Excelente Match',
                border: 'border-green-400',
                glow: 'shadow-green-200',
            };
        }
        if (percentual >= 60) {
            return {
                bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
                text: 'text-white',
                icon: TrendingUp,
                label: 'Bom Match',
                border: 'border-blue-400',
                glow: 'shadow-blue-200',
            };
        }
        if (percentual >= 40) {
            return {
                bg: 'bg-gradient-to-r from-yellow-400 to-orange-400',
                text: 'text-white',
                icon: TrendingUp,
                label: 'Match Parcial',
                border: 'border-yellow-400',
                glow: 'shadow-yellow-200',
            };
        }
        return {
            bg: 'bg-gray-200',
            text: 'text-gray-600',
            icon: AlertCircle,
            label: 'Match Baixo',
            border: 'border-gray-300',
            glow: '',
        };
    };

    const style = getMatchStyle();
    const Icon = style.icon;

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-1.5',
    };

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
                <div
                    className={`inline-flex items-center gap-1.5 rounded-full font-bold shadow-lg ${style.bg} ${style.text} ${sizeClasses[size]} ${style.glow}`}
                >
                    <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
                    <span>{percentual}%</span>
                    {size !== 'sm' && <span className="font-medium opacity-90">match</span>}
                </div>
                {onAnaliseIA && size !== 'sm' && percentual >= 60 && (
                    <button
                        onClick={onAnaliseIA}
                        className="p-1.5 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-full transition-colors"
                        title="Análise detalhada com IA"
                    >
                        <Brain className="w-4 h-4" />
                    </button>
                )}
            </div>

            {showDestaques && destaques.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                    {destaques.map((destaque, i) => (
                        <span
                            key={i}
                            className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full"
                        >
                            {destaque}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

// Componente compacto para usar no card
export function MatchIndicator({ percentual }: { percentual: number }) {
    const getColor = () => {
        if (percentual >= 80) return 'from-green-500 to-emerald-500';
        if (percentual >= 60) return 'from-blue-500 to-cyan-500';
        if (percentual >= 40) return 'from-yellow-400 to-orange-400';
        return 'from-gray-300 to-gray-400';
    };

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r ${getColor()} transition-all duration-500`}
                    style={{ width: `${percentual}%` }}
                />
            </div>
            <span className={`text-sm font-bold ${percentual >= 80 ? 'text-green-600' :
                percentual >= 60 ? 'text-blue-600' :
                    percentual >= 40 ? 'text-yellow-600' :
                        'text-gray-500'
                }`}>
                {percentual}%
            </span>
        </div>
    );
}
