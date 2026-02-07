/**
 * Script para realizar carga de histórico via API local
 * 
 * Uso:
 * 1. Inicie o servidor: npm run dev
 * 2. Em outro terminal: npx tsx scripts/carga-via-api.ts
 * 
 * Este script faz chamadas à API /api/historico do seu app
 * que já tem conexão configurada com o banco.
 */

const BASE_URL = 'http://localhost:3000';

interface CargaResponse {
    success: boolean;
    message?: string;
    contratosEncontrados?: number;
    novosAdicionados?: number;
    paginasProcessadas?: number;
    totalPaginasDisponiveis?: number;
    stats?: {
        totalContratos: number;
        periodoInicio: string;
        periodoFim: string;
    };
    error?: string;
}

async function limparHistorico(): Promise<boolean> {
    console.log('🗑️ Limpando histórico existente...');

    try {
        const response = await fetch(`${BASE_URL}/api/historico`, {
            method: 'DELETE',
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`   ✅ ${data.deletados || 0} registros removidos`);
            return true;
        } else {
            console.log('   ⚠️ Endpoint DELETE não disponível, continuando...');
            return true; // Continua mesmo sem deletar
        }
    } catch (error) {
        console.log('   ⚠️ Não foi possível limpar, continuando com a carga...');
        return true;
    }
}

async function carregarPeriodo(meses: number, maxPaginas: number = 50): Promise<CargaResponse> {
    const response = await fetch(`${BASE_URL}/api/historico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meses, maxPaginas }),
    });

    return response.json();
}

async function verificarServidor(): Promise<boolean> {
    try {
        const response = await fetch(`${BASE_URL}/api/historico`, {
            method: 'GET',
        });
        return response.ok;
    } catch {
        return false;
    }
}

async function main() {
    console.log('🚀 Carga de Histórico via API Local');
    console.log('='.repeat(50));

    // Verificar se o servidor está rodando
    console.log('\n🔌 Verificando servidor local...');
    const serverOk = await verificarServidor();

    if (!serverOk) {
        console.error('\n❌ Servidor não está respondendo em http://localhost:3000');
        console.error('   Execute "npm run dev" em outro terminal primeiro.');
        process.exit(1);
    }
    console.log('   ✅ Servidor respondendo!');

    // Limpar histórico existente
    await limparHistorico();

    // Carregar em períodos de 6 meses para cobrir 2024-2025
    // 2024: jan-jun, jul-dez
    // 2025: jan-jun, jul-dez, etc.

    console.log('\n📥 Iniciando carga de contratos...');
    console.log('   Período: 2024 até hoje\n');

    // Vamos fazer cargas de 3 meses para pegar mais dados
    // A API do PNCP tem limites, então fazemos múltiplas chamadas
    const periodos = [
        { meses: 3, descricao: 'Últimos 3 meses' },
        { meses: 6, descricao: '3-6 meses atrás' },
        { meses: 9, descricao: '6-9 meses atrás' },
        { meses: 12, descricao: '9-12 meses atrás' },
        { meses: 15, descricao: '12-15 meses atrás' },
        { meses: 18, descricao: '15-18 meses atrás' },
        { meses: 21, descricao: '18-21 meses atrás' },
        { meses: 24, descricao: '21-24 meses atrás' },
    ];

    let totalCarregado = 0;
    let totalNovos = 0;

    for (const periodo of periodos) {
        console.log(`📆 Carregando: ${periodo.descricao} (${periodo.meses} meses)...`);

        try {
            const resultado = await carregarPeriodo(periodo.meses, 100);

            if (resultado.success) {
                totalCarregado += resultado.contratosEncontrados || 0;
                totalNovos += resultado.novosAdicionados || 0;

                console.log(`   ✅ ${resultado.contratosEncontrados} encontrados, ${resultado.novosAdicionados} novos`);
                console.log(`   📊 Total no banco: ${resultado.stats?.totalContratos || 'N/A'}`);
            } else {
                console.log(`   ⚠️ Erro: ${resultado.error}`);
            }
        } catch (error) {
            console.log(`   ❌ Falha na requisição: ${error}`);
        }

        // Pequeno delay entre requisições
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Estatísticas finais
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO DA CARGA');
    console.log('='.repeat(50));

    try {
        const statsResponse = await fetch(`${BASE_URL}/api/historico`);
        const stats = await statsResponse.json();

        console.log(`\n✅ Total de contratos no banco: ${stats.stats?.totalContratos?.toLocaleString('pt-BR') || 'N/A'}`);
        console.log(`📅 Período: ${stats.stats?.periodoInicio || 'N/A'} até ${stats.stats?.periodoFim || 'N/A'}`);
        console.log(`📥 Total processado nesta carga: ${totalCarregado.toLocaleString('pt-BR')}`);
        console.log(`💾 Novos adicionados: ${totalNovos.toLocaleString('pt-BR')}`);
    } catch {
        console.log(`\n📥 Total processado: ${totalCarregado.toLocaleString('pt-BR')}`);
        console.log(`💾 Novos adicionados: ${totalNovos.toLocaleString('pt-BR')}`);
    }

    console.log('\n✨ Carga concluída!');
}

main().catch(console.error);
