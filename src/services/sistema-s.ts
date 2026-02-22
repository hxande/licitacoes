import { Licitacao, UFS } from '@/types/licitacao';
import { fetchWithRetry, extractAreaAtuacao, extractCategoriasTI } from '@/services/pncp';

const SISTEMA_S_BASE_URL = 'https://sistematransparenciaweb.com.br/api-licitacoes';
const SISTEMA_S_PORTAL_URL = 'https://sistematransparenciaweb.com.br';

// Timeout e retry conservadores — API externa menos confiável que o PNCP
const TIMEOUT_MS = 8000;
const MAX_RETRIES = 1;

// DTO retornado pela API pública do Sistema S (SESI/SENAI)
interface SistemaSLicitacaoDTO {
    codigoLicitacao?: number;
    idLicitacao?: string;
    numero?: string;
    titulo?: string;
    dataAbertura?: string;
    nmEmpresa?: string;
    anoSolicitacao?: number;
    modalidade?: string;
    objeto?: string;
    statusLicitacao?: string;
    critJulgamento?: string;
    dtHomologacao?: string;
    periodoFechamento?: string;
    ano?: number;
    dataPublicacao?: string;
    entidadeNacional?: string;
    entidadeRegional?: string;
}

function extrairUF(departamento: string): string {
    // "SESI-SP" → "SP", "SENAI-RJ" → "RJ"
    const partes = departamento.split('-');
    return partes[partes.length - 1] || '';
}

// Normaliza datas que podem vir em vários formatos (ISO, DD/MM/YYYY, YYYYMMDD)
function normalizarData(data: string | undefined): string | undefined {
    if (!data) return undefined;
    // Já está em formato ISO-like (YYYY-MM-DD ou YYYY-MM-DDTHH:...)
    if (/^\d{4}-\d{2}-\d{2}/.test(data)) return data.slice(0, 10);
    // Formato BR: DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}/.test(data)) {
        const [d, m, y] = data.split('/');
        return `${y}-${m}-${d}`;
    }
    // Formato YYYYMMDD
    if (/^\d{8}$/.test(data)) {
        return `${data.slice(0, 4)}-${data.slice(4, 6)}-${data.slice(6, 8)}`;
    }
    return data;
}

function transformSistemaS(
    item: SistemaSLicitacaoDTO,
    entidade: 'SESI' | 'SENAI',
    departamento: string,
): Licitacao {
    const uf = extrairUF(departamento);
    const objeto = item.objeto || item.titulo || 'Sem descrição';
    const codigo = item.codigoLicitacao ?? item.idLicitacao ?? item.numero ?? 'X';
    const ano = item.ano ?? item.anoSolicitacao ?? new Date().getFullYear();

    return {
        id: `${entidade}-${uf}-${ano}-${codigo}`,
        orgao: item.nmEmpresa || item.entidadeRegional || departamento,
        cnpjOrgao: '',
        uf,
        municipio: undefined,
        objeto,
        modalidade: item.modalidade || 'Processo Seletivo',
        dataPublicacao: normalizarData(item.dataPublicacao) || `${ano}-01-01`,
        dataAbertura: normalizarData(item.dataAbertura),
        dataEncerramento: normalizarData(item.periodoFechamento),
        valorEstimado: undefined,
        situacao: item.statusLicitacao || 'Não informado',
        linkEdital: SISTEMA_S_PORTAL_URL,
        fonte: entidade,
        areaAtuacao: extractAreaAtuacao(objeto),
        categorias: extractCategoriasTI(objeto),
    };
}

async function buscarDepartamento(
    entidade: 'SESI' | 'SENAI',
    departamento: string,
    anos: number[],
): Promise<Licitacao[]> {
    const resultados: Licitacao[] = [];

    for (const ano of anos) {
        try {
            const url = new URL(`${SISTEMA_S_BASE_URL}/publico/licitacoes`);
            url.searchParams.set('entidade', entidade);
            url.searchParams.set('departamento', departamento);
            url.searchParams.set('ano', String(ano));

            const response = await fetchWithRetry(
                url.toString(),
                { headers: { Accept: 'application/json' } },
                MAX_RETRIES,
                TIMEOUT_MS,
            );

            if (!response.ok) continue;

            const texto = await response.text();
            if (!texto || texto.trim() === '') continue;

            const dados: unknown = JSON.parse(texto);
            if (!Array.isArray(dados)) continue;

            for (const item of dados as SistemaSLicitacaoDTO[]) {
                try {
                    resultados.push(transformSistemaS(item, entidade, departamento));
                } catch {
                    // item malformado — pula
                }
            }
        } catch {
            // departamento indisponível — pula silenciosamente
        }
    }

    return resultados;
}

export async function buscarLicitacoesSistemaS(params: {
    dataInicial: string; // YYYYMMDD
    dataFinal: string;   // YYYYMMDD
    ufSigla?: string;
    entidades?: Array<'SESI' | 'SENAI'>;
}): Promise<Licitacao[]> {
    const entidades = params.entidades ?? ['SESI', 'SENAI'];

    // Determina quais anos cobrir com base no range de datas
    const anoInicial = parseInt(params.dataInicial.slice(0, 4), 10);
    const anoFinal = parseInt(params.dataFinal.slice(0, 4), 10);
    const anos: number[] = [];
    for (let y = anoInicial; y <= anoFinal && anos.length < 3; y++) {
        anos.push(y);
    }
    if (anos.length === 0) anos.push(new Date().getFullYear());

    // Se UF específica, busca só o departamento dela (2 chamadas vs 54)
    const ufs = params.ufSigla ? [params.ufSigla] : UFS;

    const promises: Promise<Licitacao[]>[] = [];
    for (const entidade of entidades) {
        for (const uf of ufs) {
            promises.push(buscarDepartamento(entidade, `${entidade}-${uf}`, anos));
        }
    }

    const resultados = await Promise.allSettled(promises);

    const todas: Licitacao[] = [];
    for (const r of resultados) {
        if (r.status === 'fulfilled') {
            todas.push(...r.value);
        }
    }

    // Filtra pelo range de datas solicitado
    const di = `${params.dataInicial.slice(0, 4)}-${params.dataInicial.slice(4, 6)}-${params.dataInicial.slice(6, 8)}`;
    const df = `${params.dataFinal.slice(0, 4)}-${params.dataFinal.slice(4, 6)}-${params.dataFinal.slice(6, 8)}`;

    return todas.filter(l => {
        const dp = (l.dataPublicacao || '').slice(0, 10);
        if (!dp) return true;
        return dp >= di && dp <= df;
    });
}
