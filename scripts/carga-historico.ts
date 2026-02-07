/**
 * Script para realizar carga completa de contratos do PNCP (2024-2025)
 * 
 * Uso: npx tsx scripts/carga-historico.ts
 * 
 * Este script:
 * 1. Limpa a tabela de histórico existente
 * 2. Busca contratos de 2024 e 2025 em intervalos de 15 dias
 * 3. Processa todas as páginas de cada intervalo
 * 4. Salva no banco de dados
 */

// Carregar variáveis de ambiente
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: ['error'],
});

// Função para testar conexão com retry
async function testarConexao(maxTentativas = 5): Promise<boolean> {
    for (let i = 1; i <= maxTentativas; i++) {
        try {
            console.log(`  🔄 Tentativa ${i}/${maxTentativas} de conexão...`);
            await prisma.$connect();
            await prisma.$queryRaw`SELECT 1`;
            console.log(`  ✅ Conexão estabelecida com sucesso!`);
            return true;
        } catch (error) {
            console.log(`  ⚠️ Falha na tentativa ${i}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            if (i < maxTentativas) {
                const delay = i * 5000; // 5s, 10s, 15s...
                console.log(`  ⏳ Aguardando ${delay / 1000}s antes de tentar novamente...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    return false;
}
const PNCP_BASE_URL = 'https://pncp.gov.br/api/consulta/v1';

// Configurações
const CONFIG = {
    // Intervalo de dias para cada busca (PNCP limita resultados por consulta)
    intervaloDias: 15,
    // Máximo de páginas por intervalo
    maxPaginasPorIntervalo: 100,
    // Delay entre requisições (ms)
    delayRequisicao: 200,
    // Delay entre páginas (ms)
    delayPagina: 100,
    // Timeout de requisição (ms)
    timeoutRequisicao: 30000,
    // Máximo de retries
    maxRetries: 3,
};

interface PNCPContrato {
    orgaoEntidade: {
        cnpj: string;
        razaoSocial: string;
    };
    unidadeOrgao: {
        ufSigla: string;
        municipioNome?: string;
    };
    niFornecedor?: string;
    nomeRazaoSocialFornecedor?: string;
    tipoPessoa?: string;
    tipoContrato?: {
        id: number;
        nome: string;
    };
    anoContrato: number;
    sequencialContrato: number;
    objetoContrato: string;
    valorInicial?: number;
    valorGlobal?: number;
    dataAssinatura?: string;
    dataPublicacaoPncp: string;
}

interface ContratoHistorico {
    id: string;
    cnpj_orgao: string;
    orgao: string;
    uf: string;
    municipio: string | null;
    objeto: string;
    fornecedor_cnpj: string;
    fornecedor_nome: string;
    valor_contratado: number;
    data_assinatura: string | null;
    data_publicacao: string | null;
    tipo_contrato: string;
    area_atuacao: string;
    palavras_chave: string[];
}

// Extrair palavras-chave
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

// Extrair área de atuação
function extrairAreaAtuacao(objeto: string): string {
    const objetoLower = objeto.toLowerCase();

    const areaMap: Record<string, string[]> = {
        'Tecnologia da Informação': [
            'software', 'sistema', 'informática', 'ti', 'computador', 'notebook',
            'servidor', 'rede', 'data center', 'cloud', 'nuvem', 'desenvolvimento',
            'aplicativo', 'website', 'portal', 'segurança da informação', 'backup',
            'programação', 'banco de dados', 'licença de software', 'saas', 'hosting'
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

// Formatar data para o PNCP (YYYYMMDD)
function formatarData(d: Date): string {
    return d.toISOString().split('T')[0].replace(/-/g, '');
}

// Gerar intervalos de datas
function gerarIntervalos(dataInicio: Date, dataFim: Date, intervaloDias: number): Array<{ inicio: Date; fim: Date }> {
    const intervalos: Array<{ inicio: Date; fim: Date }> = [];
    let atual = new Date(dataInicio);

    while (atual < dataFim) {
        const fimIntervalo = new Date(atual);
        fimIntervalo.setDate(fimIntervalo.getDate() + intervaloDias);

        intervalos.push({
            inicio: new Date(atual),
            fim: fimIntervalo > dataFim ? new Date(dataFim) : fimIntervalo,
        });

        atual = new Date(fimIntervalo);
        atual.setDate(atual.getDate() + 1);
    }

    return intervalos;
}

// Fetch com retry e timeout
async function fetchComRetry(url: string, maxRetries: number = CONFIG.maxRetries): Promise<Response> {
    let lastError: Error | null = null;

    for (let tentativa = 0; tentativa <= maxRetries; tentativa++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeoutRequisicao);

            const response = await fetch(url, {
                headers: { 'Accept': 'application/json' },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (tentativa < maxRetries) {
                const delay = Math.pow(2, tentativa) * 1000;
                console.log(`  ⚠️ Retry ${tentativa + 1}/${maxRetries} em ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error('Fetch failed after retries');
}

// Buscar contratos do PNCP
async function buscarContratosPNCP(
    dataInicial: string,
    dataFinal: string,
    pagina: number = 1
): Promise<{ data: PNCPContrato[]; totalPaginas: number; totalRegistros: number }> {
    try {
        const params = new URLSearchParams({
            dataInicial,
            dataFinal,
            pagina: String(pagina),
            tamanhoPagina: '500', // Máximo permitido pela API
        });

        const url = `${PNCP_BASE_URL}/contratos?${params.toString()}`;
        const response = await fetchComRetry(url);

        if (!response.ok) {
            console.error(`  ❌ HTTP ${response.status} para ${url}`);
            return { data: [], totalPaginas: 0, totalRegistros: 0 };
        }

        const text = await response.text();
        if (!text || text.trim() === '') {
            return { data: [], totalPaginas: 0, totalRegistros: 0 };
        }

        const result = JSON.parse(text);
        return {
            data: result.data || [],
            totalPaginas: result.totalPaginas || 0,
            totalRegistros: result.totalRegistros || 0,
        };
    } catch (error) {
        console.error(`  ❌ Erro na busca:`, error);
        return { data: [], totalPaginas: 0, totalRegistros: 0 };
    }
}

// Transformar contrato PNCP para formato do banco
function transformarContrato(contrato: PNCPContrato): ContratoHistorico | null {
    if (!contrato.niFornecedor) {
        return null;
    }

    const objeto = contrato.objetoContrato || '';

    return {
        id: `${contrato.orgaoEntidade.cnpj}-${contrato.anoContrato}-${contrato.sequencialContrato}`,
        cnpj_orgao: contrato.orgaoEntidade.cnpj,
        orgao: contrato.orgaoEntidade.razaoSocial,
        uf: contrato.unidadeOrgao.ufSigla,
        municipio: contrato.unidadeOrgao.municipioNome || null,
        objeto,
        fornecedor_cnpj: contrato.niFornecedor,
        fornecedor_nome: contrato.nomeRazaoSocialFornecedor || 'Não informado',
        valor_contratado: contrato.valorGlobal || contrato.valorInicial || 0,
        data_assinatura: contrato.dataAssinatura || null,
        data_publicacao: contrato.dataPublicacaoPncp || null,
        tipo_contrato: contrato.tipoContrato?.nome || 'Não informado',
        area_atuacao: extrairAreaAtuacao(objeto),
        palavras_chave: extrairPalavrasChave(objeto),
    };
}

// Salvar contratos no banco em lote
async function salvarContratosEmLote(contratos: ContratoHistorico[]): Promise<number> {
    if (contratos.length === 0) return 0;

    let salvos = 0;
    const loteSize = 100;

    for (let i = 0; i < contratos.length; i += loteSize) {
        const lote = contratos.slice(i, i + loteSize);

        // Usar createMany com skipDuplicates para eficiência
        try {
            const result = await prisma.historico_contrato.createMany({
                data: lote,
                skipDuplicates: true,
            });
            salvos += result.count;
        } catch (error) {
            // Fallback para upsert individual em caso de erro
            for (const contrato of lote) {
                try {
                    await prisma.historico_contrato.upsert({
                        where: { id: contrato.id },
                        create: contrato,
                        update: {
                            objeto: contrato.objeto,
                            fornecedor_nome: contrato.fornecedor_nome,
                            valor_contratado: contrato.valor_contratado,
                            data_assinatura: contrato.data_assinatura,
                            data_publicacao: contrato.data_publicacao,
                            tipo_contrato: contrato.tipo_contrato,
                            area_atuacao: contrato.area_atuacao,
                            palavras_chave: contrato.palavras_chave,
                        },
                    });
                    salvos++;
                } catch {
                    // Ignora erro de duplicata
                }
            }
        }
    }

    return salvos;
}

// Função principal
async function main() {
    console.log('🚀 Iniciando carga de histórico de contratos do PNCP');
    console.log('='.repeat(60));

    // Testar conexão com o banco
    console.log('\n🔌 Testando conexão com o banco de dados...');
    const conectado = await testarConexao();
    if (!conectado) {
        console.error('\n❌ Não foi possível conectar ao banco de dados.');
        console.error('   Verifique se o projeto Supabase está ativo no dashboard.');
        console.error('   Link: https://supabase.com/dashboard/projects');
        process.exit(1);
    }

    // Definir período: 01/01/2024 até hoje
    const dataInicio = new Date('2024-01-01');
    const dataFim = new Date(); // Hoje

    console.log(`📅 Período: ${dataInicio.toLocaleDateString('pt-BR')} até ${dataFim.toLocaleDateString('pt-BR')}`);

    // Passo 1: Limpar tabela existente
    console.log('\n🗑️ Limpando tabela de histórico existente...');
    const deletados = await prisma.historico_contrato.deleteMany();
    console.log(`   ✅ ${deletados.count} registros removidos`);

    // Passo 2: Gerar intervalos de busca
    const intervalos = gerarIntervalos(dataInicio, dataFim, CONFIG.intervaloDias);
    console.log(`\n📊 ${intervalos.length} intervalos de busca criados`);

    // Estatísticas
    let totalContratos = 0;
    let totalSalvos = 0;
    let intervalosProcessados = 0;

    // Passo 3: Processar cada intervalo
    for (const intervalo of intervalos) {
        intervalosProcessados++;
        const dataInicialStr = formatarData(intervalo.inicio);
        const dataFinalStr = formatarData(intervalo.fim);

        console.log(`\n📆 Intervalo ${intervalosProcessados}/${intervalos.length}: ${intervalo.inicio.toLocaleDateString('pt-BR')} - ${intervalo.fim.toLocaleDateString('pt-BR')}`);

        // Buscar primeira página para saber total
        const primeiraConsulta = await buscarContratosPNCP(dataInicialStr, dataFinalStr, 1);

        if (primeiraConsulta.data.length === 0) {
            console.log('   ⚪ Nenhum contrato encontrado neste intervalo');
            continue;
        }

        console.log(`   📋 ${primeiraConsulta.totalRegistros} contratos em ${primeiraConsulta.totalPaginas} páginas`);

        // Processar todas as páginas
        let contratosIntervalo: ContratoHistorico[] = [];

        for (let pagina = 1; pagina <= Math.min(primeiraConsulta.totalPaginas, CONFIG.maxPaginasPorIntervalo); pagina++) {
            const resultado = pagina === 1
                ? primeiraConsulta
                : await buscarContratosPNCP(dataInicialStr, dataFinalStr, pagina);

            const contratosValidos = resultado.data
                .map(transformarContrato)
                .filter((c): c is ContratoHistorico => c !== null);

            contratosIntervalo.push(...contratosValidos);

            if (pagina % 10 === 0 || pagina === primeiraConsulta.totalPaginas) {
                process.stdout.write(`   📥 Página ${pagina}/${primeiraConsulta.totalPaginas} (${contratosIntervalo.length} contratos)\r`);
            }

            if (pagina < primeiraConsulta.totalPaginas) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.delayPagina));
            }
        }

        console.log(''); // Nova linha após o progresso

        // Salvar contratos do intervalo
        const salvosIntervalo = await salvarContratosEmLote(contratosIntervalo);
        totalContratos += contratosIntervalo.length;
        totalSalvos += salvosIntervalo;

        console.log(`   ✅ ${salvosIntervalo} novos contratos salvos`);

        // Delay entre intervalos
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayRequisicao));
    }

    // Estatísticas finais
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA CARGA');
    console.log('='.repeat(60));

    const totalNoBanco = await prisma.historico_contrato.count();
    const estatsPorUF = await prisma.historico_contrato.groupBy({
        by: ['uf'],
        _count: true,
        orderBy: { _count: { uf: 'desc' } },
        take: 10,
    });

    const estatsPorArea = await prisma.historico_contrato.groupBy({
        by: ['area_atuacao'],
        _count: true,
        orderBy: { _count: { area_atuacao: 'desc' } },
    });

    console.log(`\n✅ Total de contratos no banco: ${totalNoBanco.toLocaleString('pt-BR')}`);
    console.log(`📥 Contratos processados: ${totalContratos.toLocaleString('pt-BR')}`);
    console.log(`💾 Novos contratos salvos: ${totalSalvos.toLocaleString('pt-BR')}`);

    console.log('\n🗺️ Top 10 UFs por quantidade de contratos:');
    estatsPorUF.forEach((uf, i) => {
        console.log(`   ${i + 1}. ${uf.uf}: ${uf._count.toLocaleString('pt-BR')}`);
    });

    console.log('\n📁 Contratos por área de atuação:');
    estatsPorArea.forEach(area => {
        console.log(`   • ${area.area_atuacao}: ${area._count.toLocaleString('pt-BR')}`);
    });

    console.log('\n✨ Carga concluída com sucesso!');
}

// Executar
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
