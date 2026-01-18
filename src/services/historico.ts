// Serviço para gerenciar dados históricos de licitações e contratos
// Por enquanto salva em JSON local, futuramente será migrado para banco de dados

import { promises as fs } from 'fs';
import path from 'path';
import prisma, { withReconnect } from '@/lib/prisma';
import {
    DadosHistoricos,
    ContratoHistorico,
    LicitacaoHistorica,
    EstatisticasFornecedor,
    AnaliseMercado
} from '@/types/historico';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORICO_FILE = path.join(DATA_DIR, 'historico.json');

// Garantir que o diretório existe
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Carregar dados históricos do arquivo
export async function carregarDadosHistoricos(): Promise<DadosHistoricos | null> {
    // Prefer DB if available
    try {
        const rows: any = await withReconnect((r: any) => r.historico_contrato.findMany({ orderBy: { data_publicacao: 'desc' } }));
        const contratos = rows.map((r: any) => ({
            id: r.id,
            cnpjOrgao: r.cnpj_orgao,
            orgao: r.orgao,
            uf: r.uf,
            municipio: r.municipio || '',
            objeto: r.objeto,
            fornecedorCnpj: r.fornecedor_cnpj,
            fornecedorNome: r.fornecedor_nome,
            valorContratado: r.valor_contratado,
            dataAssinatura: r.data_assinatura,
            dataPublicacao: r.data_publicacao,
            tipoContrato: r.tipo_contrato,
            areaAtuacao: r.area_atuacao,
            palavrasChave: r.palavras_chave as string[],
        }));

        return {
            ultimaAtualizacao: new Date().toISOString(),
            totalContratos: contratos.length,
            totalLicitacoes: 0,
            periodoInicio: contratos.length > 0 ? contratos[contratos.length - 1].dataPublicacao : '',
            periodoFim: contratos.length > 0 ? contratos[0].dataPublicacao : '',
            contratos,
            licitacoes: [],
        } as DadosHistoricos;
    } catch (e) {
        // Fallback to file-based storage
        try {
            await ensureDataDir();
            const data = await fs.readFile(HISTORICO_FILE, 'utf-8');
            return JSON.parse(data);
        } catch {
            return null;
        }
    }
}

// Salvar dados históricos no arquivo
export async function salvarDadosHistoricos(dados: DadosHistoricos): Promise<void> {
    // Save to DB: upsert contracts
    try {
        for (const c of dados.contratos) {
            await withReconnect((r: any) => r.historico_contrato.upsert({
                where: { id: c.id },
                create: {
                    id: c.id,
                    cnpj_orgao: c.cnpjOrgao,
                    orgao: c.orgao,
                    uf: c.uf,
                    municipio: c.municipio || null,
                    objeto: c.objeto,
                    fornecedor_cnpj: c.fornecedorCnpj,
                    fornecedor_nome: c.fornecedorNome,
                    valor_contratado: c.valorContratado,
                    data_assinatura: c.dataAssinatura,
                    data_publicacao: c.dataPublicacao,
                    tipo_contrato: c.tipoContrato,
                    area_atuacao: c.areaAtuacao,
                    palavras_chave: c.palavrasChave,
                },
                update: {
                    objeto: c.objeto,
                    fornecedor_nome: c.fornecedorNome,
                    valor_contratado: c.valorContratado,
                    data_assinatura: c.dataAssinatura,
                    data_publicacao: c.dataPublicacao,
                    tipo_contrato: c.tipoContrato,
                    area_atuacao: c.areaAtuacao,
                    palavras_chave: c.palavrasChave,
                },
            }));
        }
    } catch (err) {
        // If DB unavailable, fallback to file
        await ensureDataDir();
        await fs.writeFile(HISTORICO_FILE, JSON.stringify(dados, null, 2), 'utf-8');
    }
}

// Extrair palavras-chave de um texto
function extrairPalavrasChave(texto: string): string[] {
    const palavrasIgnoradas = new Set([
        'de', 'da', 'do', 'das', 'dos', 'para', 'com', 'sem', 'por', 'e', 'ou',
        'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'em', 'no', 'na',
        'nos', 'nas', 'ao', 'aos', 'à', 'às', 'pelo', 'pela', 'pelos', 'pelas',
        'que', 'se', 'não', 'mais', 'menos', 'muito', 'pouco', 'bem', 'mal',
        'contratação', 'prestação', 'serviço', 'serviços', 'fornecimento', 'aquisição',
        'empresa', 'objeto', 'valor', 'prazo', 'conforme', 'edital', 'licitação'
    ]);

    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(p => p.length > 3 && !palavrasIgnoradas.has(p))
        .slice(0, 10);
}

// Extrair área de atuação do objeto
function extrairAreaAtuacao(objeto: string): string {
    const objetoLower = objeto.toLowerCase();

    const areaMap: Record<string, string[]> = {
        'Tecnologia da Informação': [
            'software', 'sistema', 'informática', 'ti', 'computador', 'notebook',
            'servidor', 'rede', 'data center', 'cloud', 'nuvem', 'desenvolvimento',
            'aplicativo', 'website', 'portal', 'segurança da informação', 'backup'
        ],
        'Engenharia e Obras': [
            'construção', 'obra', 'reforma', 'pavimentação', 'edificação', 'engenharia',
            'arquitetura', 'terraplanagem', 'estrutura', 'hidráulica', 'elétrica'
        ],
        'Saúde': [
            'medicamento', 'hospitalar', 'saúde', 'médico', 'enfermagem', 'cirúrgico',
            'laboratorial', 'diagnóstico', 'vacina', 'ambulância', 'hospital'
        ],
        'Educação': [
            'escola', 'educação', 'ensino', 'pedagógico', 'didático', 'escolar',
            'creche', 'universidade', 'capacitação', 'treinamento', 'curso'
        ],
        'Alimentação': [
            'alimentação', 'refeição', 'merenda', 'alimento', 'cozinha', 'restaurante'
        ],
        'Veículos e Transporte': [
            'veículo', 'automóvel', 'carro', 'caminhão', 'ônibus', 'transporte', 'frete'
        ],
        'Limpeza e Conservação': [
            'limpeza', 'conservação', 'higienização', 'zeladoria', 'jardinagem'
        ],
        'Segurança': [
            'vigilância', 'segurança patrimonial', 'monitoramento', 'câmera', 'cftv'
        ],
    };

    for (const [area, palavras] of Object.entries(areaMap)) {
        if (palavras.some(p => objetoLower.includes(p))) {
            return area;
        }
    }

    return 'Outros';
}

// Calcular mediana
function calcularMediana(valores: number[]): number {
    if (valores.length === 0) return 0;
    const sorted = [...valores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Buscar contratos similares nos dados históricos
export async function buscarContratosSimilares(
    objeto: string,
    uf?: string,
    cnpjOrgao?: string
): Promise<ContratoHistorico[]> {
    const dados = await carregarDadosHistoricos();
    if (!dados || dados.contratos.length === 0) return [];

    const palavrasChave = extrairPalavrasChave(objeto);
    const areaAtuacao = extrairAreaAtuacao(objeto);

    return dados.contratos.filter(contrato => {
        // Filtrar por UF se especificado
        if (uf && contrato.uf !== uf) return false;

        // Priorizar mesmo órgão
        const mesmoOrgao = cnpjOrgao && contrato.cnpjOrgao === cnpjOrgao;

        // Verificar área de atuação
        const mesmaArea = contrato.areaAtuacao === areaAtuacao;

        // Verificar palavras-chave em comum
        const palavrasEmComum = contrato.palavrasChave.filter(p =>
            palavrasChave.includes(p)
        ).length;

        // Match se: mesmo órgão, mesma área, ou pelo menos 2 palavras em comum
        return mesmoOrgao || mesmaArea || palavrasEmComum >= 2;
    });
}

// Gerar análise de mercado baseada nos dados históricos
export async function gerarAnaliseMercado(
    objeto: string,
    uf?: string,
    cnpjOrgao?: string,
    valorEstimado?: number
): Promise<AnaliseMercado | null> {
    const contratosSimilares = await buscarContratosSimilares(objeto, uf, cnpjOrgao);

    if (contratosSimilares.length === 0) {
        return null;
    }

    // Agrupar por fornecedor
    const fornecedoresMap = new Map<string, {
        nome: string;
        contratos: ContratoHistorico[];
        valorTotal: number;
        orgaos: Set<string>;
        ufs: Set<string>;
        areas: Set<string>;
    }>();

    const valores: number[] = [];

    contratosSimilares.forEach(contrato => {
        const cnpj = contrato.fornecedorCnpj;

        if (!fornecedoresMap.has(cnpj)) {
            fornecedoresMap.set(cnpj, {
                nome: contrato.fornecedorNome,
                contratos: [],
                valorTotal: 0,
                orgaos: new Set(),
                ufs: new Set(),
                areas: new Set(),
            });
        }

        const fornecedor = fornecedoresMap.get(cnpj)!;
        fornecedor.contratos.push(contrato);
        fornecedor.valorTotal += contrato.valorContratado;
        fornecedor.orgaos.add(contrato.orgao);
        fornecedor.ufs.add(contrato.uf);
        fornecedor.areas.add(contrato.areaAtuacao);

        if (contrato.valorContratado > 0) {
            valores.push(contrato.valorContratado);
        }
    });

    // Criar lista de fornecedores ordenada
    const principaisFornecedores: EstatisticasFornecedor[] = Array.from(fornecedoresMap.entries())
        .map(([cnpj, data]) => ({
            cnpj,
            nome: data.nome,
            totalContratos: data.contratos.length,
            valorTotal: data.valorTotal,
            valorMedio: data.valorTotal / data.contratos.length,
            areasAtuacao: Array.from(data.areas),
            orgaosAtendidos: Array.from(data.orgaos),
            ufsAtuacao: Array.from(data.ufs),
        }))
        .sort((a, b) => b.totalContratos - a.totalContratos)
        .slice(0, 10);

    // Calcular faixa de preços
    const faixaPrecos = {
        minimo: valores.length > 0 ? Math.min(...valores) : 0,
        maximo: valores.length > 0 ? Math.max(...valores) : 0,
        media: valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0,
        mediana: calcularMediana(valores),
    };

    // Calcular concentração de mercado (% dos top 5)
    const totalContratos = contratosSimilares.length;
    const top5Contratos = principaisFornecedores.slice(0, 5).reduce((sum, f) => sum + f.totalContratos, 0);
    const concentracaoMercado = (top5Contratos / totalContratos) * 100;

    // Gerar insights
    const insights: string[] = [];
    const recomendacoes: string[] = [];

    insights.push(`Foram encontrados ${contratosSimilares.length} contratos similares no histórico.`);

    if (principaisFornecedores.length > 0) {
        const lider = principaisFornecedores[0];
        insights.push(
            `O principal concorrente é ${lider.nome} com ${lider.totalContratos} contratos (${((lider.totalContratos / totalContratos) * 100).toFixed(0)}% do mercado).`
        );
    }

    if (concentracaoMercado > 70) {
        insights.push(`Mercado concentrado: os 5 maiores fornecedores detêm ${concentracaoMercado.toFixed(0)}% dos contratos.`);
        recomendacoes.push('Considere buscar diferenciais competitivos, pois o mercado é dominado por poucos players.');
    } else if (concentracaoMercado < 40) {
        insights.push(`Mercado fragmentado: muitos fornecedores competindo sem dominância clara.`);
        recomendacoes.push('Mercado pulverizado oferece boas oportunidades para novos entrantes.');
    }

    if (valorEstimado && faixaPrecos.media > 0) {
        const diferenca = ((valorEstimado / faixaPrecos.media) - 1) * 100;
        if (diferenca > 20) {
            insights.push(`O valor estimado está ${diferenca.toFixed(0)}% acima da média praticada.`);
            recomendacoes.push('Há espaço para propostas mais competitivas abaixo do estimado.');
        } else if (diferenca < -20) {
            insights.push(`O valor estimado está ${Math.abs(diferenca).toFixed(0)}% abaixo da média praticada.`);
            recomendacoes.push('Atenção: valor estimado baixo pode indicar margens apertadas.');
        }
    }

    recomendacoes.push(`Faixa de preços sugerida: ${formatarMoeda(faixaPrecos.minimo)} a ${formatarMoeda(faixaPrecos.media * 0.9)}`);
    recomendacoes.push('Analise os editais anteriores para entender requisitos técnicos comuns.');

    return {
        totalContratosAnalisados: contratosSimilares.length,
        totalLicitacoesAnalisadas: 0,
        periodoAnalise: {
            inicio: contratosSimilares.reduce((min, c) => c.dataPublicacao < min ? c.dataPublicacao : min, contratosSimilares[0]?.dataPublicacao || ''),
            fim: contratosSimilares.reduce((max, c) => c.dataPublicacao > max ? c.dataPublicacao : max, contratosSimilares[0]?.dataPublicacao || ''),
        },
        faixaPrecos,
        principaisFornecedores,
        concentracaoMercado,
        insights,
        recomendacoes,
    };
}

function formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
    }).format(valor);
}

// Adicionar novos contratos ao histórico
export async function adicionarContratos(novosContratos: ContratoHistorico[]): Promise<number> {
    let dados = await carregarDadosHistoricos();

    if (!dados) {
        dados = {
            ultimaAtualizacao: new Date().toISOString(),
            totalContratos: 0,
            totalLicitacoes: 0,
            periodoInicio: '',
            periodoFim: '',
            contratos: [],
            licitacoes: [],
        };
    }

    // Evitar duplicatas
    const idsExistentes = new Set(dados.contratos.map(c => c.id));
    const contratosNovos = novosContratos.filter(c => !idsExistentes.has(c.id));

    dados.contratos.push(...contratosNovos);
    dados.totalContratos = dados.contratos.length;
    dados.ultimaAtualizacao = new Date().toISOString();

    // Atualizar período
    if (dados.contratos.length > 0) {
        dados.periodoInicio = dados.contratos.reduce(
            (min, c) => c.dataPublicacao < min ? c.dataPublicacao : min,
            dados.contratos[0].dataPublicacao
        );
        dados.periodoFim = dados.contratos.reduce(
            (max, c) => c.dataPublicacao > max ? c.dataPublicacao : max,
            dados.contratos[0].dataPublicacao
        );
    }

    await salvarDadosHistoricos(dados);
    return contratosNovos.length;
}

// Obter estatísticas gerais do histórico
export async function obterEstatisticasHistorico(): Promise<{
    totalContratos: number;
    totalLicitacoes: number;
    periodoInicio: string;
    periodoFim: string;
    ultimaAtualizacao: string;
} | null> {
    const dados = await carregarDadosHistoricos();
    if (!dados) return null;

    return {
        totalContratos: dados.totalContratos,
        totalLicitacoes: dados.totalLicitacoes,
        periodoInicio: dados.periodoInicio,
        periodoFim: dados.periodoFim,
        ultimaAtualizacao: dados.ultimaAtualizacao,
    };
}
