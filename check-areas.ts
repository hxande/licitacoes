import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
    try {
        const areas = await prisma.historico_contrato.groupBy({
            by: ['area_atuacao'],
            _count: true,
            orderBy: { _count: { area_atuacao: 'desc' } },
        });

        console.log('📊 Distribuição por área após recategorização:');
        areas.forEach(a => {
            console.log(`   ${a.area_atuacao}: ${a._count.toLocaleString('pt-BR')}`);
        });
    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
})();
