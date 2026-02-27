/**
 * Recategoriza registros históricos classificados como "Outros"
 * usando as 3 novas categorias adicionadas em fev/2026:
 * Agropecuária, Meio Ambiente, Energia.
 *
 * Uso: npx tsx scripts/recategorizar-outros.ts
 *
 * Só toca registros com area_atuacao = 'Outros' — os demais ficam intactos.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });

// ─── Sistema de scoring (mesmo algoritmo de src/services/pncp.ts) ────────────

interface TermoCategoria {
    termo: string;
    peso: number;
}

interface CategoriaConfig {
    termos: TermoCategoria[];
    exclusoes: string[];
    scoreMinimo: number;
}

const NOVAS_CATEGORIAS: Record<string, CategoriaConfig> = {
    'Agropecuária': {
        termos: [
            { termo: 'defensivo agrícola', peso: 3 },
            { termo: 'insumo agrícola', peso: 3 },
            { termo: 'sementes', peso: 3 },
            { termo: 'fertilizante', peso: 3 },
            { termo: 'agrotóxico', peso: 3 },
            { termo: 'gado', peso: 2 },
            { termo: 'bovino', peso: 2 },
            { termo: 'suíno', peso: 2 },
            { termo: 'aves', peso: 2 },
            { termo: 'piscicultura', peso: 2 },
            { termo: 'aquicultura', peso: 2 },
            { termo: 'agrícola', peso: 1 },
            { termo: 'rural', peso: 1 },
            { termo: 'pecuária', peso: 1 },
            { termo: 'agropecuária', peso: 1 },
        ],
        exclusoes: ['maquinário pesado', 'construção'],
        scoreMinimo: 3,
    },
    'Meio Ambiente': {
        termos: [
            { termo: 'coleta de resíduos', peso: 3 },
            { termo: 'licença ambiental', peso: 3 },
            { termo: 'gestão ambiental', peso: 3 },
            { termo: 'esgotamento sanitário', peso: 3 },
            { termo: 'saneamento', peso: 2 },
            { termo: 'resíduos sólidos', peso: 2 },
            { termo: 'aterro sanitário', peso: 2 },
            { termo: 'monitoramento ambiental', peso: 2 },
            { termo: 'ambiental', peso: 1 },
            { termo: 'sustentável', peso: 1 },
            { termo: 'ecológico', peso: 1 },
        ],
        exclusoes: [],
        scoreMinimo: 3,
    },
    'Energia': {
        termos: [
            { termo: 'energia solar', peso: 3 },
            { termo: 'painel fotovoltaico', peso: 3 },
            { termo: 'geração fotovoltaica', peso: 3 },
            { termo: 'usina solar', peso: 3 },
            { termo: 'transformador', peso: 2 },
            { termo: 'subestação', peso: 2 },
            { termo: 'gerador', peso: 2 },
            { termo: 'energia elétrica', peso: 2 },
            { termo: 'iluminação pública', peso: 2 },
            { termo: 'elétrico', peso: 1 },
            { termo: 'energético', peso: 1 },
            { termo: 'potência', peso: 1 },
        ],
        exclusoes: ['manutenção predial', 'ar condicionado'],
        scoreMinimo: 3,
    },
};

function novaCategoria(objeto: string): string | null {
    const lower = objeto.toLowerCase();
    let melhor: string | null = null;
    let melhorScore = 0;

    for (const [categoria, cfg] of Object.entries(NOVAS_CATEGORIAS)) {
        const temExclusao = cfg.exclusoes.some(e => lower.includes(e));
        if (temExclusao) continue;

        const score = cfg.termos.reduce(
            (acc, { termo, peso }) => acc + (lower.includes(termo) ? peso : 0),
            0,
        );

        if (score >= cfg.scoreMinimo && score > melhorScore) {
            melhorScore = score;
            melhor = categoria;
        }
    }

    return melhor;
}

// ─── Conexão com retry ────────────────────────────────────────────────────────

async function testarConexao(maxTentativas = 5): Promise<boolean> {
    for (let i = 1; i <= maxTentativas; i++) {
        try {
            console.log(`  🔄 Tentativa ${i}/${maxTentativas}...`);
            await prisma.$connect();
            await prisma.$queryRaw`SELECT 1`;
            console.log('  ✅ Conectado.');
            return true;
        } catch (err) {
            console.log(`  ⚠️  Falha: ${err instanceof Error ? err.message : err}`);
            if (i < maxTentativas) {
                const delay = i * 5000;
                console.log(`  ⏳ Aguardando ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    return false;
}

// ─── Processamento em lotes ───────────────────────────────────────────────────

async function processar(tamanhoLote = 200): Promise<void> {
    const totalOutros = await prisma.historico_contrato.count({
        where: { area_atuacao: 'Outros' },
    });

    console.log(`\n📊 Registros com "Outros": ${totalOutros.toLocaleString('pt-BR')}\n`);

    if (totalOutros === 0) {
        console.log('✅ Nenhum registro para processar.');
        return;
    }

    let offset = 0;
    let processados = 0;
    let atualizados = 0;
    let erros = 0;

    // Contadores por nova categoria
    const contadores: Record<string, number> = {
        'Agropecuária': 0,
        'Meio Ambiente': 0,
        'Energia': 0,
    };

    // Exemplos por categoria (até 3 por categoria)
    const exemplos: Record<string, string[]> = {
        'Agropecuária': [],
        'Meio Ambiente': [],
        'Energia': [],
    };

    console.log('🔄 Processando...\n');

    while (true) {
        const registros = await prisma.historico_contrato.findMany({
            where: { area_atuacao: 'Outros' },
            select: { id: true, objeto: true },
            skip: offset,
            take: tamanhoLote,
        });

        if (registros.length === 0) break;

        for (const reg of registros) {
            processados++;
            const nova = novaCategoria(reg.objeto);

            if (nova) {
                try {
                    await prisma.historico_contrato.update({
                        where: { id: reg.id },
                        data: { area_atuacao: nova },
                    });
                    atualizados++;
                    contadores[nova]++;
                    if (exemplos[nova].length < 3) {
                        exemplos[nova].push(reg.objeto.slice(0, 120));
                    }
                } catch (err) {
                    erros++;
                    console.error(`❌ Erro no id ${reg.id}:`, err);
                }
            }

            if (processados % 200 === 0) {
                const pct = ((processados / totalOutros) * 100).toFixed(1);
                process.stdout.write(
                    `   📦 ${processados.toLocaleString('pt-BR')}/${totalOutros.toLocaleString('pt-BR')} (${pct}%) — recategorizados: ${atualizados}\r`,
                );
            }
        }

        offset += tamanhoLote;
    }

    // ─── Relatório ────────────────────────────────────────────────────────────
    console.log('\n');
    console.log('='.repeat(70));
    console.log('📊 RESULTADO');
    console.log('='.repeat(70));
    console.log(`✅ Processados : ${processados.toLocaleString('pt-BR')}`);
    console.log(`🔄 Atualizados : ${atualizados.toLocaleString('pt-BR')}`);
    console.log(`⚠️  Erros       : ${erros}`);
    console.log(`📌 Permanecem "Outros": ${(totalOutros - atualizados).toLocaleString('pt-BR')}`);

    console.log('\n📂 Recategorizados por área:');
    for (const [area, qtd] of Object.entries(contadores)) {
        if (qtd === 0) continue;
        console.log(`\n   ${area}: ${qtd.toLocaleString('pt-BR')} registros`);
        for (const ex of exemplos[area]) {
            console.log(`      • ${ex}`);
        }
    }

    // Distribuição final de "Outros" x novas categorias
    console.log('\n📁 Contagem final das 3 novas áreas na base:');
    for (const area of ['Agropecuária', 'Meio Ambiente', 'Energia']) {
        const total = await prisma.historico_contrato.count({ where: { area_atuacao: area } });
        console.log(`   ${area}: ${total.toLocaleString('pt-BR')}`);
    }
    const outrosRestantes = await prisma.historico_contrato.count({ where: { area_atuacao: 'Outros' } });
    console.log(`   Outros (restantes): ${outrosRestantes.toLocaleString('pt-BR')}`);

    console.log('\n✨ Concluído.');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🚀 Recategorizar "Outros" → novas áreas (Agropecuária, Meio Ambiente, Energia)');
    console.log('='.repeat(70));
    console.log('\n🔌 Conectando ao banco...');

    if (!(await testarConexao())) {
        console.error('\n❌ Não foi possível conectar. Verifique o .env.local e o banco.');
        process.exit(1);
    }

    await processar(200);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
