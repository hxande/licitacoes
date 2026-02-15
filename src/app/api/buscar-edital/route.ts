import { NextRequest, NextResponse } from 'next/server';

// API para buscar os arquivos/documentos de uma licitação no PNCP
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const cnpj = searchParams.get('cnpj');
    const ano = searchParams.get('ano');
    const sequencial = searchParams.get('sequencial');

    if (!cnpj || !ano || !sequencial) {
        return NextResponse.json(
            { success: false, error: 'Parâmetros cnpj, ano e sequencial são obrigatórios' },
            { status: 400 }
        );
    }

    try {
        // Buscar arquivos da contratação no PNCP
        const url = `https://pncp.gov.br/api/consulta/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos`;

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            console.error(`Erro ao buscar arquivos: ${response.status}`);
            return NextResponse.json({
                success: false,
                error: `Não foi possível buscar os arquivos da licitação (${response.status})`,
            }, { status: response.status });
        }

        const arquivos = await response.json();

        // Filtrar apenas editais e documentos relevantes
        const documentosRelevantes = arquivos.filter((arq: any) => {
            const titulo = (arq.titulo || '').toLowerCase();
            const tipo = (arq.tipoDocumentoNome || '').toLowerCase();
            return (
                titulo.includes('edital') ||
                titulo.includes('termo de referência') ||
                titulo.includes('termo de referencia') ||
                titulo.includes('anexo') ||
                tipo.includes('edital') ||
                tipo.includes('termo')
            );
        });

        return NextResponse.json({
            success: true,
            arquivos: documentosRelevantes.length > 0 ? documentosRelevantes : arquivos,
            total: arquivos.length,
        });

    } catch (error) {
        console.error('Erro ao buscar arquivos:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao conectar com o PNCP' },
            { status: 500 }
        );
    }
}
