import { NextRequest, NextResponse } from 'next/server';
import { buscarLicitacoesPNCP, transformPNCPToLicitacao } from '@/services/pncp';
import { Licitacao } from '@/types/licitacao';

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

        const resultado = await buscarLicitacoesPNCP({
            dataInicial,
            dataFinal,
            ufSigla,
            codigoModalidadeContratacao: modalidade ? parseInt(modalidade) : undefined,
            pagina: 1, // Sempre buscar página 1 da API, paginação será feita localmente
            tamanhoPagina: 50, // Limite máximo da API do PNCP
        });

        let licitacoes: Licitacao[] = resultado.data.map(transformPNCPToLicitacao);

        // Aplicar filtro por UF (a API do PNCP nem sempre filtra corretamente)
        if (ufSigla) {
            licitacoes = licitacoes.filter(l => l.uf === ufSigla);
        }

        // Aplicar filtro por área de atuação
        if (area) {
            licitacoes = licitacoes.filter(l => l.areaAtuacao === area);
        }

        // Aplicar filtro por termo de busca (busca em múltiplos campos)
        if (termoBusca) {
            const termos = termoBusca.split(/\s+/).filter(t => t.length > 1);
            licitacoes = licitacoes.filter(l => {
                // Buscar apenas nos campos de texto, não nas categorias automáticas
                const textoCompleto = [
                    l.objeto,
                    l.orgao,
                    l.municipio || '',
                    l.uf,
                    l.situacao,
                ].join(' ').toLowerCase();

                // Todos os termos devem estar presentes
                return termos.every(termo => textoCompleto.includes(termo));
            });
        }

        // Ordenar por data de abertura (mais próximas primeiro)
        licitacoes.sort((a, b) => {
            const dataA = a.dataAbertura ? new Date(a.dataAbertura).getTime() : 0;
            const dataB = b.dataAbertura ? new Date(b.dataAbertura).getTime() : 0;
            return dataA - dataB;
        });

        // Calcular paginação local
        const totalFiltrado = licitacoes.length;
        const totalPaginas = Math.ceil(totalFiltrado / tamanhoPagina);
        const inicio = (pagina - 1) * tamanhoPagina;
        const fim = inicio + tamanhoPagina;
        const licitacoesPaginadas = licitacoes.slice(inicio, fim);

        return NextResponse.json({
            success: true,
            data: licitacoesPaginadas,
            meta: {
                paginaAtual: pagina,
                totalPaginas: totalPaginas,
                totalRegistros: resultado.totalRegistros,
                totalFiltrado: totalFiltrado,
                temMaisPaginas: pagina < totalPaginas,
                itensPorPagina: tamanhoPagina,
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
                    itensPorPagina: 20,
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
