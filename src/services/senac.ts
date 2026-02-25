import { Licitacao, UFS } from '@/types/licitacao';
import { extractAreaAtuacao, extractCategoriasTI, fetchWithRetry } from '@/services/pncp';

const SENAC_API_BASE = 'https://transparencia.senac.br/service/api';
const SENAC_PORTAL_URL = 'https://transparencia.senac.br';

const TIMEOUT_MS = 8000;
const MAX_RETRIES = 0;

const CACHE_TTL_COM_DADOS_MS = 60 * 60 * 1000;  // 1 hora
const CACHE_TTL_SEM_DADOS_MS = 30 * 60 * 1000;  // 30 min

interface CacheEntry {
    dados: Licitacao[];
    hora: number;
    ttl: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(chave: string): Licitacao[] | null {
    const entry = cache.get(chave);
    if (!entry) return null;
    if (Date.now() - entry.hora > entry.ttl) {
        cache.delete(chave);
        return null;
    }
    return entry.dados;
}

function setCache(chave: string, dados: Licitacao[]): void {
    const ttl = dados.length > 0 ? CACHE_TTL_COM_DADOS_MS : CACHE_TTL_SEM_DADOS_MS;
    cache.set(chave, { dados, hora: Date.now(), ttl });
}

// DTO retornado pela API de licitações do SENAC por regional
interface SenacLicitacaoItem {
    id: string;
    situacao: string;
    numeroProcesso?: string;
    objeto: string;
    dataAbertura?: string;       // ISO "2026-03-10T09:00:00Z"
    dataSituacao?: string;
    documentos?: Array<{
        dataPublicacao?: string; // ISO com offset "-03:00"
    }>;
}

interface SenacModalidadeGrupo {
    id: string;
    modalidade: string;
    dadosModalidadeLicitacao: SenacLicitacaoItem[];
}

interface SenacResponse {
    success: boolean;
    data: SenacModalidadeGrupo[];
}

// Normaliza data ISO para "YYYY-MM-DD"
function normalizarData(data: string | undefined | null): string | undefined {
    if (!data) return undefined;
    const s = data.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return undefined;
}

function transformSenac(
    item: SenacLicitacaoItem,
    modalidade: string,
    uf: string,
): Licitacao {
    const objeto = item.objeto || 'Sem descrição';

    // Usa a data de publicação do primeiro documento como dataPublicacao;
    // fallback: dataAbertura
    const docDataPublicacao = item.documentos?.[0]?.dataPublicacao;
    const dataPublicacao =
        normalizarData(docDataPublicacao) ??
        normalizarData(item.dataAbertura) ??
        new Date().toISOString().split('T')[0];

    const dataAbertura = normalizarData(item.dataAbertura);

    return {
        id: `SENAC-${uf}-${item.id}`,
        orgao: `SENAC ${uf}`,
        cnpjOrgao: '',
        uf,
        municipio: undefined,
        objeto,
        modalidade,
        dataPublicacao,
        dataAbertura,
        dataEncerramento: undefined,
        valorEstimado: undefined,
        situacao: item.situacao,
        linkEdital: `${SENAC_PORTAL_URL}/#/${uf.toLowerCase()}/licitacoes`,
        fonte: 'SENAC',
        areaAtuacao: extractAreaAtuacao(objeto),
        categorias: extractCategoriasTI(objeto),
    };
}

async function buscarRegional(uf: string): Promise<Licitacao[]> {
    const cached = getCached(uf);
    if (cached !== null) return cached;

    try {
        const url = `${SENAC_API_BASE}/licitacoes/regional/${uf}`;
        const response = await fetchWithRetry(
            url,
            { headers: { Accept: 'application/json' }, cache: 'no-store' },
            MAX_RETRIES,
            TIMEOUT_MS,
        );

        if (!response.ok) {
            setCache(uf, []);
            return [];
        }

        const texto = await response.text();
        if (!texto || texto.trim() === '') {
            setCache(uf, []);
            return [];
        }

        let dados: unknown;
        try {
            dados = JSON.parse(texto);
        } catch {
            setCache(uf, []);
            return [];
        }

        const resposta = dados as SenacResponse;
        if (!resposta.success || !Array.isArray(resposta.data)) {
            setCache(uf, []);
            return [];
        }

        const resultado: Licitacao[] = [];
        for (const grupo of resposta.data) {
            const modalidade = grupo.modalidade || 'Processo Seletivo';
            for (const item of grupo.dadosModalidadeLicitacao ?? []) {
                try {
                    resultado.push(transformSenac(item, modalidade, uf));
                } catch {
                    // item malformado — ignora
                }
            }
        }

        setCache(uf, resultado);
        return resultado;

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[SENAC] ${uf}: ${msg}`);
        return [];
    }
}

export async function buscarLicitacoesSENAC(params: {
    ufSigla?: string;
}): Promise<Licitacao[]> {
    const ufs = params.ufSigla ? [params.ufSigla] : UFS;

    const resultados = await Promise.allSettled(ufs.map(uf => buscarRegional(uf)));

    const todas: Licitacao[] = [];
    for (const r of resultados) {
        if (r.status === 'fulfilled') {
            todas.push(...r.value);
        }
    }

    // Remove licitações finalizadas e canceladas
    return todas.filter(l => {
        const s = l.situacao.toLowerCase();
        return !s.includes('finalizada') && !s.includes('cancelada');
    });
}
