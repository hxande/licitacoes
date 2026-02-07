/**
 * Script para recategorizar todos os registros históricos existentes
 * 
 * Uso: npx tsx scripts/recategorizar-historico.ts
 * 
 * Este script:
 * 1. Busca todos os registros da tabela historico_contrato
 * 2. Aplica a lógica de categorização atualizada
 * 3. Atualiza apenas o campo area_atuacao dos registros
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

// Função de categorização - EXATAMENTE IGUAL ao dashboard/route.ts
function categorizarArea(objeto: string): string {
    const objetoLower = objeto.toLowerCase();

    const areaMap: Record<string, string[]> = {
        'Tecnologia da Informação': [
            'software', 'sistema de informação', 'informática', 'ti ', 'computador', 'notebook',
            'servidor', 'rede de dados', 'data center', 'cloud', 'nuvem', 'desenvolvimento de sistema',
            'programação', 'aplicativo', 'website', 'portal web', 'segurança da informação',
            'backup', 'firewall', 'helpdesk', 'suporte de ti', 'licença de software'
        ],
        'Engenharia e Obras': [
            'construção', 'obra', 'reforma', 'pavimentação', 'edificação', 'engenharia',
            'arquitetura', 'projeto', 'terraplanagem', 'fundação', 'estrutura', 'alvenaria',
            'hidráulica', 'elétrica', 'saneamento', 'drenagem', 'ponte', 'viaduto', 'estrada',
            'recuperação de prédio', 'manutenção predial', 'pintura', 'impermeabilização'
        ],
        'Saúde': [
            'medicamento', 'farmacêutico', 'hospitalar', 'saúde', 'médico', 'enfermagem',
            'cirúrgico', 'laboratorial', 'diagnóstico', 'vacina', 'ambulância', 'ubs',
            'hospital', 'clínica', 'odontológico', 'fisioterapia', 'exame', 'tratamento'
        ],
        'Educação': [
            'escola', 'educação', 'ensino', 'pedagógico', 'didático', 'escolar', 'professor',
            'creche', 'universidade', 'faculdade', 'capacitação', 'treinamento', 'curso',
            'material didático', 'livro', 'biblioteca'
        ],
        'Alimentação': [
            'alimentação', 'refeição', 'merenda', 'alimento', 'gênero alimentício', 'cozinha',
            'restaurante', 'lanche', 'café', 'água mineral', 'bebida', 'hortifruti',
            'carne', 'leite', 'pão', 'frutas', 'verduras', 'legumes'
        ],
        'Veículos e Transporte': [
            'veículo', 'automóvel', 'carro', 'caminhão', 'ônibus', 'motocicleta', 'transporte',
            'frete', 'combustível', 'gasolina', 'diesel', 'etanol', 'pneu', 'peça automotiva',
            'manutenção veicular', 'locação de veículo', 'frota'
        ],
        'Limpeza e Conservação': [
            'limpeza', 'conservação', 'higienização', 'zeladoria', 'jardinagem', 'paisagismo',
            'manutenção de área verde', 'coleta de lixo', 'resíduo', 'dedetização', 'desratização',
            'material de limpeza', 'produto de limpeza'
        ],
        'Segurança': [
            'vigilância', 'segurança patrimonial', 'monitoramento', 'alarme', 'câmera',
            'cftv', 'portaria', 'controle de acesso', 'cerca elétrica', 'guarda'
        ],
        'Mobiliário e Equipamentos': [
            'mobiliário', 'móvel', 'cadeira', 'mesa', 'armário', 'estante', 'ar condicionado',
            'climatização', 'eletrodoméstico', 'equipamento', 'máquina', 'ferramenta'
        ],
        'Comunicação e Marketing': [
            'publicidade', 'propaganda', 'marketing', 'comunicação', 'mídia', 'impressão',
            'gráfica', 'banner', 'outdoor', 'evento', 'cerimonial', 'assessoria de imprensa'
        ],
        'Jurídico e Contábil': [
            'jurídico', 'advocacia', 'advogado', 'contábil', 'contabilidade', 'auditoria',
            'perícia', 'assessoria jurídica', 'consultoria contábil', 'fiscal'
        ],
        'Recursos Humanos': [
            'recursos humanos', 'rh', 'folha de pagamento', 'recrutamento', 'seleção',
            'terceirização de mão de obra', 'gestão de pessoal'
        ],
    };

    for (const [area, palavras] of Object.entries(areaMap)) {
        if (palavras.some(palavra => objetoLower.includes(palavra))) {
            return area;
        }
    }

    return 'Outros';
}

// Processar registros em lotes
async function processarEmLotes(tamanhoLote: number = 100): Promise<void> {
    let offset = 0;
    let processados = 0;
    let atualizados = 0;
    let erros = 0;

    console.log('\n🔄 Iniciando processamento dos registros...\n');

    // Contar total de registros
    const totalRegistros = await prisma.historico_contrato.count();
    console.log(`📊 Total de registros a processar: ${totalRegistros.toLocaleString('pt-BR')}\n`);

    // Estatísticas de mudanças
    const mudancas: Record<string, { de: string; para: string; exemplo: string }[]> = {};

    while (true) {
        // Buscar lote
        const registros = await prisma.historico_contrato.findMany({
            select: {
                id: true,
                objeto: true,
                area_atuacao: true,
            },
            skip: offset,
            take: tamanhoLote,
        });

        if (registros.length === 0) {
            break; // Acabaram os registros
        }

        // Processar cada registro do lote
        for (const registro of registros) {
            processados++;

            const novaArea = categorizarArea(registro.objeto);

            // Se a área mudou, atualizar
            if (novaArea !== registro.area_atuacao) {
                try {
                    await prisma.historico_contrato.update({
                        where: { id: registro.id },
                        data: { area_atuacao: novaArea },
                    });

                    atualizados++;

                    // Guardar exemplo de mudança
                    const chave = `${registro.area_atuacao} → ${novaArea}`;
                    if (!mudancas[chave]) {
                        mudancas[chave] = [];
                    }
                    if (mudancas[chave].length < 3) {
                        mudancas[chave].push({
                            de: registro.area_atuacao,
                            para: novaArea,
                            exemplo: registro.objeto.substring(0, 100) + (registro.objeto.length > 100 ? '...' : ''),
                        });
                    }
                } catch (error) {
                    erros++;
                    console.error(`   ❌ Erro ao atualizar registro ${registro.id}:`, error);
                }
            }

            // Mostrar progresso a cada 100 registros
            if (processados % 100 === 0) {
                const percentual = ((processados / totalRegistros) * 100).toFixed(1);
                process.stdout.write(
                    `   📦 Processados: ${processados.toLocaleString('pt-BR')}/${totalRegistros.toLocaleString('pt-BR')} (${percentual}%) | ` +
                    `Atualizados: ${atualizados.toLocaleString('pt-BR')}\r`
                );
            }
        }

        offset += tamanhoLote;
    }

    console.log(''); // Nova linha após o progresso
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMO DA RECATEGORIZAÇÃO');
    console.log('='.repeat(80));
    console.log(`✅ Total de registros processados: ${processados.toLocaleString('pt-BR')}`);
    console.log(`🔄 Registros atualizados: ${atualizados.toLocaleString('pt-BR')}`);
    console.log(`⚠️  Erros encontrados: ${erros.toLocaleString('pt-BR')}`);

    // Mostrar exemplos de mudanças
    if (Object.keys(mudancas).length > 0) {
        console.log('\n📝 EXEMPLOS DE MUDANÇAS DE CATEGORIA:\n');

        for (const [chave, exemplos] of Object.entries(mudancas).slice(0, 10)) {
            console.log(`   ${chave}`);
            for (const ex of exemplos) {
                console.log(`      • ${ex.exemplo}`);
            }
            console.log('');
        }

        if (Object.keys(mudancas).length > 10) {
            console.log(`   ... e mais ${Object.keys(mudancas).length - 10} tipos de mudanças\n`);
        }
    }

    // Estatísticas finais por área
    console.log('📁 DISTRIBUIÇÃO FINAL POR ÁREA DE ATUAÇÃO:\n');

    const estatsPorArea = await prisma.historico_contrato.groupBy({
        by: ['area_atuacao'],
        _count: true,
        orderBy: { _count: { area_atuacao: 'desc' } },
    });

    estatsPorArea.forEach((area, i) => {
        const percentual = ((area._count / totalRegistros) * 100).toFixed(1);
        console.log(`   ${i + 1}. ${area.area_atuacao}: ${area._count.toLocaleString('pt-BR')} (${percentual}%)`);
    });

    console.log('\n✨ Recategorização concluída com sucesso!');
}

// Função principal
async function main() {
    console.log('🚀 Iniciando recategorização de histórico de contratos');
    console.log('='.repeat(80));

    // Testar conexão com o banco
    console.log('\n🔌 Testando conexão com o banco de dados...');
    const conectado = await testarConexao();
    if (!conectado) {
        console.error('\n❌ Não foi possível conectar ao banco de dados.');
        console.error('   Verifique se o projeto Supabase está ativo no dashboard.');
        process.exit(1);
    }

    // Processar registros
    await processarEmLotes(100);
}

// Executar
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
