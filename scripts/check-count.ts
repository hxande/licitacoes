import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
    try {
        const count = await prisma.historico_contrato.count();
        console.log(`Total de contratos no banco: ${count.toLocaleString('pt-BR')}`);
    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
})();
