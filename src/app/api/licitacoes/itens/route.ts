import { NextRequest, NextResponse } from 'next/server';

const PNCP_BASE_URL = 'https://pncp.gov.br/api/consulta/v1';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const cnpj = searchParams.get('cnpj');
    const ano = searchParams.get('ano');
    const sequencial = searchParams.get('sequencial');

    if (!cnpj || !ano || !sequencial) {
        return NextResponse.json({ itens: [] }, { status: 400 });
    }

    try {
        const url = `${PNCP_BASE_URL}/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens`;
        const response = await fetch(url, {
            signal: AbortSignal.timeout(8000),
            headers: { Accept: 'application/json' },
            next: { revalidate: 3600 }, // cache por 1h (itens não mudam frequentemente)
        });

        if (!response.ok) {
            return NextResponse.json({ itens: [] });
        }

        const dados = await response.json();
        const itens = Array.isArray(dados) ? dados : (dados?.data ?? []);

        return NextResponse.json({ itens });
    } catch {
        return NextResponse.json({ itens: [] });
    }
}
