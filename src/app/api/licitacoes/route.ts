import { NextRequest, NextResponse } from 'next/server';
import { buscarLicitacoesPNCP, transformPNCPToLicitacao } from '@/services/pncp';
import { buscarLicitacoesSistemaS } from '@/services/sistema-s';
import { Licitacao } from '@/types/licitacao';

const FONTES_VALIDAS = ['PNCP', 'SESI', 'SENAI'] as const;
type FonteValida = typeof FONTES_VALIDAS[number];

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        const dataInicial = searchParams.get('dataInicial') || getDefaultDataInicial();
        const dataFinal = searchParams.get('dataFinal') || getDefaultDataFinal();
        const ufSigla = searchParams.get('uf') || undefined;
        const modalidade = searchParams.get('modalidade');
        const area = searchParams.get('area');
        const pagina = parseInt(searchParams.get('pagina') || '1');
        const tamanhoPagina = parseInt(searchParams.get('tamanhoPagina') || '20');
        const termoBusca = searchParams.get('termo')?.toLowerCase().trim();

        // Fontes solicitadas — quando não informado, usa apenas PNCP (retrocompatibilidade)
        const fontesParam = searchParams.get('fontes');
        const fontesSolicitadas: FonteValida[] = fontesParam
            ? (fontesParam.split(',').map(f => f.trim().toUpperCase()) as FonteValida[])
                .filter(f => FONTES_VALIDAS.includes(f))
            : ['PNCP'];

        console.log(`[API/licitacoes] fontes="${fontesParam}" → ${JSON.stringify(fontesSolicitadas)} | uf=${ufSigla} | ${dataInicial}→${dataFinal}`);

        const incluirPNCP = fontesSolicitadas.includes('PNCP');
        const entidadesSistemaS = fontesSolicitadas.filter(
            f => f === 'SESI' || f === 'SENAI',
        ) as Array<'SESI' | 'SENAI'>;
        const incluirSistemaS = entidadesSistemaS.length > 0;

        // Busca paralela com fallback independente por fonte
        const [resultadoPNCP, resultadoSistemaS] = await Promise.allSettled([
            incluirPNCP
                ? buscarLicitacoesPNCP({
                    dataInicial,
                    dataFinal,
                    ufSigla,
                    codigoModalidadeContratacao: modalidade ? parseInt(modalidade) : undefined,
                    pagina: 1,
                    tamanhoPagina: 50,
                })
                : Promise.resolve(null),

            incluirSistemaS
                ? buscarLicitacoesSistemaS({
                    dataInicial,
                    dataFinal,
                    ufSigla,
                    entidades: entidadesSistemaS,
                })
                : Promise.resolve([]),
        ]);

        let licitacoes: Licitacao[] = [];
        let totalRegistrosPNCP = 0;

        // Incorpora resultados do PNCP
        if (resultadoPNCP.status === 'fulfilled' && resultadoPNCP.value) {
            const pncp = resultadoPNCP.value;
            totalRegistrosPNCP = pncp.totalRegistros;
            licitacoes.push(...pncp.data.map(transformPNCPToLicitacao));
        } else if (resultadoPNCP.status === 'rejected') {
            console.error('[API] Falha ao buscar PNCP:', resultadoPNCP.reason);
        }

        console.log(`[API/licitacoes] PNCP: ${resultadoPNCP.status === 'fulfilled' ? (resultadoPNCP.value?.data?.length ?? 0) : 'ERRO'} | SistemaS: ${resultadoSistemaS.status === 'fulfilled' ? resultadoSistemaS.value.length : 'ERRO'}`);

        // Incorpora resultados do Sistema S (SESI/SENAI)
        if (resultadoSistemaS.status === 'fulfilled') {
            licitacoes.push(...resultadoSistemaS.value);
        } else {
            console.error('[API] Falha ao buscar Sistema S:', resultadoSistemaS.reason);
        }

        // Filtro por UF (PNCP às vezes não filtra corretamente; Sistema S também)
        if (ufSigla) {
            licitacoes = licitacoes.filter(l => l.uf === ufSigla);
        }

        // Filtro por área de atuação
        if (area) {
            licitacoes = licitacoes.filter(l => l.areaAtuacao === area);
        }

        // Filtro por termo de busca (todos os campos de texto)
        if (termoBusca) {
            const termos = termoBusca.split(/\s+/).filter(t => t.length > 1);
            licitacoes = licitacoes.filter(l => {
                const textoCompleto = [
                    l.objeto,
                    l.orgao,
                    l.municipio || '',
                    l.uf,
                    l.situacao,
                ].join(' ').toLowerCase();
                return termos.every(termo => textoCompleto.includes(termo));
            });
        }

        // Ordena por data de publicação (mais recente primeiro)
        licitacoes.sort((a, b) => {
            const dataA = new Date(a.dataPublicacao || '').getTime() || 0;
            const dataB = new Date(b.dataPublicacao || '').getTime() || 0;
            return dataB - dataA;
        });

        // Paginação local
        const totalFiltrado = licitacoes.length;
        const totalPaginas = Math.ceil(totalFiltrado / tamanhoPagina);
        const inicio = (pagina - 1) * tamanhoPagina;
        const licitacoesPaginadas = licitacoes.slice(inicio, inicio + tamanhoPagina);

        return NextResponse.json({
            success: true,
            data: licitacoesPaginadas,
            meta: {
                paginaAtual: pagina,
                totalPaginas,
                totalRegistros: totalRegistrosPNCP + (resultadoSistemaS.status === 'fulfilled' ? resultadoSistemaS.value.length : 0),
                totalFiltrado,
                temMaisPaginas: pagina < totalPaginas,
                itensPorPagina: tamanhoPagina,
            },
        });
    } catch (error) {
        console.error('Erro ao buscar licitações:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido',
                data: [],
                meta: {
                    paginaAtual: 1,
                    totalPaginas: 0,
                    totalRegistros: 0,
                    totalFiltrado: 0,
                    temMaisPaginas: false,
                    itensPorPagina: 20,
                },
            },
            { status: 500 },
        );
    }
}

function getDefaultDataInicial(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0].replace(/-/g, '');
}

function getDefaultDataFinal(): string {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0].replace(/-/g, '');
}
