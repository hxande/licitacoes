import { Licitacao, UFS } from '@/types/licitacao';
import { extractAreaAtuacao, extractCategoriasTI, fetchWithRetry } from '@/services/pncp';

const SISTEMA_S_BASE_URL = 'https://sistematransparenciaweb.com.br/api-licitacoes';
const SISTEMA_S_PORTAL_URL = 'https://sistematransparenciaweb.com.br';

const TIMEOUT_MS = 8000;
const MAX_RETRIES = 0; // sem retry — falhas devem ser rápidas

// Cache em memória por chave "ENTIDADE-UF-ano"
const CACHE_TTL_COM_DADOS_MS = 60 * 60 * 1000;  // 1 hora
const CACHE_TTL_SEM_DADOS_MS = 30 * 60 * 1000;  // 30 min (departamento vazio/inexistente)

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
    dataPublicacao?: string; // sempre "01/01/ANO 11:00:00" — campo de sistema, sem uso
    entidadeNacional?: string;
    entidadeRegional?: string;
}

// Normaliza datas dos formatos presentes na API:
//   "DD/MM/YYYY"              → "YYYY-MM-DD"
//   "DD/MM/YYYY HH:MM:SS"     → "YYYY-MM-DD"  (lê posicionalmente, ignora horário)
//   "YYYY-MM-DD..." (ISO-ish) → "YYYY-MM-DD"
//   "YYYYMMDD"                → "YYYY-MM-DD"
function normalizarData(data: string | undefined | null): string | undefined {
    if (!data) return undefined;
    const s = data.trim();

    // ISO-like: começa com YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

    // DD/MM/YYYY (com ou sem horário depois — lê por posição, não por split)
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

    // dataPublicacao da API é sempre "01/01/ANO 11:00:00" — campo de sistema sem valor.
    // Usa dataAbertura como data principal (sorting e exibição).
    const dataAbertura = normalizarData(item.dataAbertura);

    return {
        id: `${entidade}-${uf}-${ano}-${codigo}`,
        orgao: item.nmEmpresa || item.entidadeRegional || departamento,
        cnpjOrgao: '',
        uf,
        municipio: undefined,
        objeto,
        modalidade: item.modalidade || 'Processo Seletivo',
        dataPublicacao: dataAbertura || `${ano}-07-01`,
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
    if (cached !== null) {
        return cached;
    }

    try {
        const url = new URL(`${SISTEMA_S_BASE_URL}/publico/licitacoes`);
        url.searchParams.set('entidade', entidade);
        url.searchParams.set('departamento', departamento);
        url.searchParams.set('ano', String(ano));

        const response = await fetchWithRetry(
            url.toString(),
            { headers: { Accept: 'application/json' }, cache: 'no-store' },
            MAX_RETRIES,
            TIMEOUT_MS,
        );

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

        // API retorna array direto; trata wrappers por segurança
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

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[SistemaS] ${departamento}/${ano}: ${msg}`);
        return [];
    }
}

export async function buscarLicitacoesSistemaS(params: {
    dataInicial: string; // YYYYMMDD
    dataFinal: string;
    ufSigla?: string;
    entidades?: Array<'SESI' | 'SENAI'>;
}): Promise<Licitacao[]> {
    const entidades = params.entidades ?? ['SESI', 'SENAI'];

    // A API filtra por ano fiscal/ativo — busca o ano corrente.
    // A API já inclui itens de anos anteriores que ainda estão ativos.
    const ano = new Date().getFullYear();

    const ufs = params.ufSigla ? [params.ufSigla] : UFS;

    const promises: Promise<Licitacao[]>[] = [];
    for (const entidade of entidades) {
        for (const uf of ufs) {
            promises.push(buscarDepartamento(entidade, `${entidade}-${uf}`, ano));
        }
    }

    const inicio = Date.now();
    const resultados = await Promise.allSettled(promises);
    const elapsed = Date.now() - inicio;

    const todas: Licitacao[] = [];
    let erros = 0;
    for (const r of resultados) {
        if (r.status === 'fulfilled') {
            todas.push(...r.value);
        } else {
            erros++;
        }
    }

    console.log(
        `[SistemaS] ${todas.length} itens de ${promises.length} chamadas em ${elapsed}ms` +
        (erros > 0 ? ` (${erros} rejeitadas)` : ''),
    );

    return todas;
}
