import { NextRequest, NextResponse } from 'next/server';
import { buscarLicitacoesPNCP, transformPNCPToLicitacao, filtrarLicitacoesTI } from '@/services/pncp';
import { Licitacao } from '@/types/licitacao';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        const dataInicial = searchParams.get('dataInicial') || getDefaultDataInicial();
        const dataFinal = searchParams.get('dataFinal') || getDefaultDataFinal();
        const ufSigla = searchParams.get('uf') || undefined;
        const modalidade = searchParams.get('modalidade');
        const pagina = parseInt(searchParams.get('pagina') || '1');
        const tamanhoPagina = parseInt(searchParams.get('tamanhoPagina') || '50');
        const apenasRelacionadasTI = searchParams.get('apenasRelacionadasTI') !== 'false';
        const termoBusca = searchParams.get('termo')?.toLowerCase();

        const resultado = await buscarLicitacoesPNCP({
            dataInicial,
            dataFinal,
            ufSigla,
            codigoModalidadeContratacao: modalidade ? parseInt(modalidade) : undefined,
            pagina,
            tamanhoPagina,
        });

        let licitacoes: Licitacao[] = resultado.data.map(transformPNCPToLicitacao);

        if (apenasRelacionadasTI) {
            licitacoes = filtrarLicitacoesTI(licitacoes, true);
        }

        if (termoBusca) {
            licitacoes = licitacoes.filter(l =>
                l.objeto.toLowerCase().includes(termoBusca) ||
                l.orgao.toLowerCase().includes(termoBusca) ||
                l.municipio?.toLowerCase().includes(termoBusca)
            );
        }

        return NextResponse.json({
            success: true,
            data: licitacoes,
            meta: {
                paginaAtual: resultado.paginaAtual,
                totalPaginas: resultado.totalPaginas,
                totalRegistros: resultado.totalRegistros,
                totalFiltrado: licitacoes.length,
                temMaisPaginas: resultado.temMaisPaginas,
            }
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
                }
            },
            { status: 500 }
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
