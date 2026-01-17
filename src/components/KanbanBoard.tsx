'use client';

import { useState } from 'react';
import { StatusPipeline, COLUNAS_PIPELINE, LicitacaoPipeline } from '@/types/pipeline';
import { CardPipeline } from './CardPipeline';

interface KanbanBoardProps {
    licitacoes: LicitacaoPipeline[];
    onMover: (id: string, status: StatusPipeline) => void;
    onRemover: (id: string) => void;
    onAtualizarObservacoes: (id: string, obs: string) => void;
}

export function KanbanBoard({ licitacoes, onMover, onRemover, onAtualizarObservacoes }: KanbanBoardProps) {
    const [draggingOver, setDraggingOver] = useState<StatusPipeline | null>(null);

    const handleDragOver = (e: React.DragEvent, status: StatusPipeline) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDraggingOver(status);
    };

    const handleDragLeave = () => {
        setDraggingOver(null);
    };

    const handleDrop = (e: React.DragEvent, status: StatusPipeline) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        if (id) {
            onMover(id, status);
        }
        setDraggingOver(null);
    };

    const getLicitacoesPorStatus = (status: StatusPipeline) => {
        return licitacoes.filter(l => l.status === status);
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
            {COLUNAS_PIPELINE.map(coluna => {
                const licitacoesColuna = getLicitacoesPorStatus(coluna.id);
                const isDropTarget = draggingOver === coluna.id;

                return (
                    <div
                        key={coluna.id}
                        className="flex-shrink-0 w-72"
                        onDragOver={(e) => handleDragOver(e, coluna.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, coluna.id)}
                    >
                        {/* Header da coluna */}
                        <div className={`rounded-t-lg px-3 py-2 ${coluna.bgColor}`}>
                            <div className="flex items-center justify-between">
                                <h3 className={`font-semibold ${coluna.cor}`}>
                                    {coluna.titulo}
                                </h3>
                                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${coluna.bgColor} ${coluna.cor}`}>
                                    {licitacoesColuna.length}
                                </span>
                            </div>
                        </div>

                        {/* Área de drop */}
                        <div
                            className={`bg-gray-50 rounded-b-lg p-2 min-h-[500px] transition-all ${isDropTarget
                                    ? 'ring-2 ring-purple-400 bg-purple-50'
                                    : ''
                                }`}
                        >
                            {licitacoesColuna.length === 0 ? (
                                <div className={`text-center py-8 text-sm text-gray-400 border-2 border-dashed rounded-lg ${isDropTarget ? 'border-purple-400 bg-purple-100' : 'border-gray-200'
                                    }`}>
                                    {isDropTarget ? 'Solte aqui!' : 'Arraste licitações para cá'}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {licitacoesColuna.map(licitacao => (
                                        <CardPipeline
                                            key={licitacao.id}
                                            licitacao={licitacao}
                                            onMover={onMover}
                                            onRemover={onRemover}
                                            onAtualizarObservacoes={onAtualizarObservacoes}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
