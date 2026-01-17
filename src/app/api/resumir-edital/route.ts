import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API key não configurada' },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { error: 'Nenhum arquivo enviado' },
                { status: 400 }
            );
        }

        // Verificar se é PDF
        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { error: 'O arquivo deve ser um PDF' },
                { status: 400 }
            );
        }

        // Limitar tamanho (10MB)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: 'O arquivo deve ter no máximo 10MB' },
                { status: 400 }
            );
        }

        // Converter para base64
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');

        const prompt = `Você é um especialista em licitações públicas brasileiras. Analise o edital em PDF anexado e extraia as seguintes informações de forma estruturada:

1. **OBJETO RESUMIDO**: Descreva em 2-3 frases claras o que está sendo licitado.

2. **REQUISITOS DE HABILITAÇÃO**: Liste os principais requisitos que a empresa precisa cumprir para participar (documentação jurídica, fiscal, técnica, econômica).

3. **CRITÉRIOS DE JULGAMENTO**: Explique como as propostas serão avaliadas (menor preço, técnica e preço, maior desconto, etc.).

4. **PRAZOS IMPORTANTES**: Liste as datas e prazos críticos (abertura, entrega de propostas, impugnação, esclarecimentos, vigência do contrato).

5. **VALOR ESTIMADO**: Informe o valor estimado da contratação, se disponível.

6. **OBSERVAÇÕES ADICIONAIS**: Destaque pontos de atenção, exigências especiais ou riscos que a empresa deve observar.

Responda APENAS com um JSON válido no seguinte formato (sem markdown, sem código):
{
    "objetoResumido": "string",
    "requisitosHabilitacao": ["string", "string"],
    "criteriosJulgamento": "string",
    "prazosImportantes": [
        {"descricao": "string", "data": "string ou null"}
    ],
    "valorEstimado": "string ou null",
    "observacoesAdicionais": ["string", "string"]
}`;

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const response = await model.generateContent([
            { text: prompt },
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: base64,
                },
            },
        ]);

        const result = await response.response;
        const text = result.text() || '';

        // Limpar resposta (remover markdown se houver)
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.slice(7);
        }
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.slice(3);
        }
        if (jsonText.endsWith('```')) {
            jsonText = jsonText.slice(0, -3);
        }
        jsonText = jsonText.trim();

        try {
            const resumo = JSON.parse(jsonText);
            return NextResponse.json({ resumo });
        } catch {
            console.error('Erro ao parsear JSON da IA:', jsonText);
            return NextResponse.json(
                { error: 'Erro ao processar resposta da IA', raw: text },
                { status: 500 }
            );
        }
    } catch (error: unknown) {
        console.error('Erro ao resumir edital:', error);

        // Verificar se é erro de quota
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('Quota')) {
            return NextResponse.json(
                { error: 'Limite de uso da API atingido. Aguarde alguns minutos e tente novamente.' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: 'Erro interno ao processar o edital' },
            { status: 500 }
        );
    }
}
