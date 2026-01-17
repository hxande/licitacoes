'use client';

import { useState, useEffect, useCallback } from 'react';
import { PerfilEmpresa, MatchResult } from '@/types/empresa';
import { Licitacao } from '@/types/licitacao';

const STORAGE_KEY = 'perfil-empresa';

export function usePerfilEmpresa() {
    const [perfil, setPerfil] = useState<PerfilEmpresa | null>(null);
    const [loaded, setLoaded] = useState(false);

    // Carregar perfil do localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    setPerfil(JSON.parse(saved));
                } catch (e) {
                    console.error('Erro ao carregar perfil:', e);
                }
            }
            setLoaded(true);
        }
    }, []);

    // Salvar perfil
    const salvarPerfil = useCallback((novoPerfil: PerfilEmpresa) => {
        setPerfil(novoPerfil);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(novoPerfil));
        }
    }, []);

    // Limpar perfil
    const limparPerfil = useCallback(() => {
        setPerfil(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    // Calcular match com uma licitação
    const calcularMatch = useCallback((licitacao: Licitacao): MatchResult | null => {
        if (!perfil) return null;

        const fatores = {
            area: 0,
            estado: 0,
            valor: 0,
            capacidades: 0,
            modalidade: 0,
        };
        const destaques: string[] = [];

        // Normalizar texto (remover acentos para comparação)
        const normalizar = (texto: string) =>
            texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const objetoNormalizado = normalizar(licitacao.objeto);

        // PASSO 1: Verificar ÁREA DE ATUAÇÃO (filtro eliminatório)
        const areaCompativel = perfil.areasAtuacao.includes(licitacao.areaAtuacao);

        if (!areaCompativel) {
            // Área não compatível = sem match
            return {
                percentual: 0,
                fatores: { area: 0, estado: 0, valor: 0, capacidades: 0, modalidade: 0 },
                destaques: [],
            };
        }

        fatores.area = 100;

        // PASSO 2: Verificar CAPACIDADES (o mais importante)
        // Buscar match das capacidades do perfil no objeto da licitação
        const capacidadesMatch = perfil.capacidades.filter(capacidade => {
            const capNormalizada = normalizar(capacidade);
            const palavras = capNormalizada.split(/\s+/).filter(p => p.length > 2);

            // Para capacidades com múltiplas palavras (ex: "Desenvolvimento Web")
            // Verificar se as palavras principais estão no objeto
            if (palavras.length >= 2) {
                // Pelo menos 2 palavras devem estar presentes
                const palavrasEncontradas = palavras.filter(palavra =>
                    objetoNormalizado.includes(palavra)
                );
                return palavrasEncontradas.length >= Math.min(2, palavras.length);
            }

            // Para capacidade de palavra única, verificar presença direta
            return objetoNormalizado.includes(capNormalizada);
        });

        // Se não encontrou NENHUMA capacidade no objeto = sem match relevante
        if (capacidadesMatch.length === 0) {
            return {
                percentual: 0,
                fatores: { area: 100, estado: 0, valor: 0, capacidades: 0, modalidade: 0 },
                destaques: [],
            };
        }

        // Calcular score baseado em quantas capacidades bateram
        if (capacidadesMatch.length >= 3) {
            fatores.capacidades = 100;
        } else if (capacidadesMatch.length === 2) {
            fatores.capacidades = 85;
        } else {
            fatores.capacidades = 70;
        }

        destaques.push(...capacidadesMatch.slice(0, 2).map(c => `✓ ${c}`));
        destaques.push(`Área: ${licitacao.areaAtuacao}`);

        // PASSO 3: Match por ESTADO
        if (perfil.estadosAtuacao.length > 0) {
            if (perfil.estadosAtuacao.includes(licitacao.uf)) {
                fatores.estado = 100;
            }
            // Se especificou estados e não bate, fica 0
        } else {
            fatores.estado = 100; // Atua em todo Brasil
        }

        // PASSO 4: Match por VALOR
        if (licitacao.valorEstimado) {
            const dentroDoMinimo = !perfil.valorMinimo || licitacao.valorEstimado >= perfil.valorMinimo;
            const dentroDoMaximo = !perfil.valorMaximo || licitacao.valorEstimado <= perfil.valorMaximo;

            if (dentroDoMinimo && dentroDoMaximo) {
                fatores.valor = 100;
            }
            // Se fora da faixa, fica 0
        } else {
            fatores.valor = 50; // Sem valor informado = neutro
        }

        // PASSO 5: Match por MODALIDADE
        const modalidadeId = getModalidadeId(licitacao.modalidade);
        if (perfil.modalidadesPreferidas.length > 0) {
            if (perfil.modalidadesPreferidas.includes(modalidadeId)) {
                fatores.modalidade = 100;
            }
        } else {
            fatores.modalidade = 100; // Sem preferência = aceita todas
        }

        // Calcular percentual final (ponderado)
        const pesos = {
            capacidades: 0.50,  // 50% - o mais importante
            area: 0.15,         // 15%
            estado: 0.15,       // 15%
            valor: 0.10,        // 10%
            modalidade: 0.10,   // 10%
        };

        const percentual = Math.round(
            fatores.capacidades * pesos.capacidades +
            fatores.area * pesos.area +
            fatores.estado * pesos.estado +
            fatores.valor * pesos.valor +
            fatores.modalidade * pesos.modalidade
        );

        return {
            percentual,
            fatores,
            destaques: destaques.slice(0, 3),
        };
    }, [perfil]);

    return {
        perfil,
        loaded,
        salvarPerfil,
        limparPerfil,
        calcularMatch,
        temPerfil: !!perfil,
    };
}

// Helper para extrair ID da modalidade do nome
function getModalidadeId(modalidade: string): number {
    const modalidadeMap: Record<string, number> = {
        'Leilão - Lei 14.133/2021': 1,
        'Diálogo Competitivo': 2,
        'Concurso': 3,
        'Concorrência - Lei 14.133/2021': 4,
        'Pregão - Lei 14.133/2021': 5,
        'Dispensa de Licitação': 6,
        'Inexigibilidade': 7,
        'Pregão - Lei 10.520/2002': 8,
        'Concorrência - Lei 8.666/1993': 9,
        'Tomada de Preços - Lei 8.666/1993': 10,
        'Convite - Lei 8.666/1993': 11,
        'Leilão - Lei 8.666/1993': 12,
        'Manifestação de Interesse': 13,
        'Pré-qualificação': 14,
        'Credenciamento': 15,
    };
    return modalidadeMap[modalidade] || 0;
}
