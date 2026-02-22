import { Licitacao, UFS } from '@/types/licitacao';
import { extractAreaAtuacao, extractCategoriasTI } from '@/services/pncp';

const SISTEMA_S_BASE_URL = 'https://sistematransparenciaweb.com.br/api-licitacoes';
const SISTEMA_S_PORTAL_URL = 'https://sistematransparenciaweb.com.br';

const TIMEOUT_MS = 5000;

// Cache em memória por chave "ENTIDADE-UF-ano"
// TTL mais curto para resultados vazios (departamento inexistente) evita
// bater na API desnecessariamente, mas sem guardar para sempre.
const CACHE_TTL_COM_DADOS_MS = 60 * 60 * 1000;  // 1 hora
const CACHE_TTL_SEM_DADOS_MS = 30 * 60 * 1000;  // 30 min (departamento vazio / inexistente)

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

// DTO retornado pela API pública do Sistema S (SESI/SENAI)
interface SistemaSLicitacaoDTO {
    codigoLicitacao?: number;
    idLicitacao?: number | string;
    numero?: string;
    titulo?: string;
    dataAbertura?: string;   // formato "DD/MM/YYYY"
    nmEmpresa?: string;
    anoSolicitacao?: number;
    modalidade?: string;
    objeto?: string;
    statusLicitacao?: string;
    critJulgamento?: string;
    dtHomologacao?: string;
    periodoFechamento?: string;
    ano?: number;
    dataPublicacao?: string;     // sempre "01/01/ANO 11:00:00" — inútil para filtro
    entidadeNacional?: string;
    entidadeRegional?: string;
}

// Normaliza datas dos formatos presentes na API:
//   "DD/MM/YYYY"                 → "YYYY-MM-DD"
//   "DD/MM/YYYY HH:MM:SS"        → "YYYY-MM-DD"  (descarta horário)
//   "YYYY-MM-DDTHH:..." ou ISO   → "YYYY-MM-DD"
//   "YYYYMMDD"                   → "YYYY-MM-DD"
function normalizarData(data: string | undefined | null): string | undefined {
    if (!data) return undefined;
    const s = data.trim();

    // ISO-like: começa com YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

    // DD/MM/YYYY (com ou sem horário depois)
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
        const d = s.slice(0, 2);
        const m = s.slice(3, 5);
        const y = s.slice(6, 10);
        return `${y}-${m}-${d}`;
    }

    // YYYYMMDD
    if (/^\d{8}$/.test(s)) {
        return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    }

    return undefined;
}

function extrairUF(departamento: string): string {
    // "SESI-SP" → "SP", "SENAI-RJ" → "RJ"
    const partes = departamento.split('-');
    return partes[partes.length - 1] || '';
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

    // dataPublicacao da API é sempre "01/01/ANO 11:00:00" (campo de sistema, não real).
    // Usa dataAbertura como proxy de data — é a data relevante para ordenação e exibição.
    const dataAbertura = normalizarData(item.dataAbertura);

    return {
        id: `${entidade}-${uf}-${ano}-${codigo}`,
        orgao: item.nmEmpresa || item.entidadeRegional || departamento,
        cnpjOrgao: '',
        uf,
        municipio: undefined,
        objeto,
        modalidade: item.modalidade || 'Processo Seletivo',
        dataPublicacao: dataAbertura || `${ano}-01-01`,
        dataAbertura,
        dataEncerramento: undefined,
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
    ano: number,
): Promise<Licitacao[]> {
    const chave = `${departamento}-${ano}`;

    const cached = getCached(chave);
    if (cached !== null) return cached;

    try {
        const url = new URL(`${SISTEMA_S_BASE_URL}/publico/licitacoes`);
        url.searchParams.set('entidade', entidade);
        url.searchParams.set('departamento', departamento);
        url.searchParams.set('ano', String(ano));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetch(url.toString(), {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) {
            setCache(chave, []);
            return [];
        }

        const texto = await response.text();
        if (!texto || texto.trim() === '') {
            setCache(chave, []);
            return [];
        }

        let dados: unknown;
        try {
            dados = JSON.parse(texto);
        } catch {
            setCache(chave, []);
            return [];
        }

        // A API retorna array direto, mas trata wrappers por segurança
        let items: SistemaSLicitacaoDTO[];
        if (Array.isArray(dados)) {
            items = dados;
        } else if (dados && typeof dados === 'object') {
            const obj = dados as Record<string, unknown>;
            const arr = obj['data'] ?? obj['content'] ?? obj['items'] ?? obj['licitacoes'];
            items = Array.isArray(arr) ? arr : [];
        } else {
            items = [];
        }

        const resultado = items.flatMap((item) => {
            try {
                return [transformSistemaS(item, entidade, departamento)];
            } catch {
                return [];
            }
        });

        setCache(chave, resultado);
        return resultado;

    } catch {
        // Timeout ou erro de rede — não cacheia para tentar novamente logo
        return [];
    }
}

export async function buscarLicitacoesSistemaS(params: {
    dataInicial: string; // YYYYMMDD — usado apenas para determinar o ano
    dataFinal: string;
    ufSigla?: string;
    entidades?: Array<'SESI' | 'SENAI'>;
}): Promise<Licitacao[]> {
    const entidades = params.entidades ?? ['SESI', 'SENAI'];

    // A API do Sistema S não filtra por data — só por ano (fiscal/ativo).
    // Buscamos o ano atual; a API já inclui itens de anos anteriores ainda ativos.
    const ano = new Date().getFullYear();

    const ufs = params.ufSigla ? [params.ufSigla] : UFS;

    const promises: Promise<Licitacao[]>[] = [];
    for (const entidade of entidades) {
        for (const uf of ufs) {
            promises.push(buscarDepartamento(entidade, `${entidade}-${uf}`, ano));
        }
    }

    const resultados = await Promise.allSettled(promises);

    const todas: Licitacao[] = [];
    for (const r of resultados) {
        if (r.status === 'fulfilled') {
            todas.push(...r.value);
        }
    }

    return todas;
}
