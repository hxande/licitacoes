import { NextResponse } from 'next/server';
import {
    DashboardData,
    EstatisticasGerais,
    DadosPorUF,
    DadosPorModalidade,
    DadosPorArea,
    DadosPorOrgao,
    TendenciaTemporal,
    DadosSazonalidade,
} from '@/types/dashboard';
import { PNCPContratacao, MODALIDADES } from '@/types/licitacao';

const PNCP_BASE_URL = 'https://pncp.gov.br/api/consulta/v1';

// Todas as modalidades disponíveis (1..13)
const TODAS_MODALIDADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// Categoriza a área de atuação com base no objeto da licitação (igual ao pncp.ts)
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

// Limite máximo da API PNCP
const PNCP_MAX_PAGE_SIZE = 50;

async function buscarTodasLicitacoes(dataInicio: string, dataFim: string): Promise<PNCPContratacao[]> {
    const todasLicitacoes: PNCPContratacao[] = [];

    // Buscar por modalidade em paralelo (todas as modalidades, 1 página cada - igual ao pncp.ts)
    const fetchPromises = TODAS_MODALIDADES.map(async (modalidade) => {
        try {
            const params = new URLSearchParams({
                dataInicial: dataInicio,
                dataFinal: dataFim,
                pagina: '1',
                tamanhoPagina: String(PNCP_MAX_PAGE_SIZE),
                codigoModalidadeContratacao: String(modalidade),
            });

            const response = await fetch(`${PNCP_BASE_URL}/contratacoes/publicacao?${params}`, {
                headers: {
                    'Accept': 'application/json',
                },
                cache: 'no-store',
            });

            if (!response.ok) {
                return [];
            }

            const text = await response.text();
            if (!text || text.trim() === '') {
                return [];
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch {
                return [];
            }

            return data.data || [];
        } catch (error) {
            console.error(`Erro na modalidade ${modalidade}:`, error);
            return [];
        }
    });

    const results = await Promise.all(fetchPromises);
    for (const result of results) {
        todasLicitacoes.push(...result);
    }

    return todasLicitacoes;
}

function processarEstatisticas(licitacoes: PNCPContratacao[]): EstatisticasGerais {
    const valorTotal = licitacoes.reduce((acc, l) => acc + (l.valorTotalEstimado || 0), 0);
    const licitacoesComValor = licitacoes.filter(l => l.valorTotalEstimado && l.valorTotalEstimado > 0);

    return {
        totalLicitacoes: licitacoes.length,
        valorTotalEstimado: valorTotal,
        valorMedio: licitacoesComValor.length > 0 ? valorTotal / licitacoesComValor.length : 0,
        licitacoesAbertas: licitacoes.filter(l =>
            l.situacaoCompraNome.toLowerCase().includes('aberto') ||
            l.situacaoCompraNome.toLowerCase().includes('aberta')
        ).length,
        orgaosUnicos: new Set(licitacoes.map(l => l.orgaoEntidade.cnpj)).size,
        estadosAtivos: new Set(licitacoes.map(l => l.unidadeOrgao.ufSigla)).size,
    };
}

function processarPorUF(licitacoes: PNCPContratacao[]): DadosPorUF[] {
    const porUF = new Map<string, { quantidade: number; valorTotal: number }>();

    licitacoes.forEach(l => {
        const uf = l.unidadeOrgao.ufSigla;
        const atual = porUF.get(uf) || { quantidade: 0, valorTotal: 0 };
        porUF.set(uf, {
            quantidade: atual.quantidade + 1,
            valorTotal: atual.valorTotal + (l.valorTotalEstimado || 0),
        });
    });

    return Array.from(porUF.entries())
        .map(([uf, dados]) => ({
            uf,
            quantidade: dados.quantidade,
            valorTotal: dados.valorTotal,
            valorMedio: dados.quantidade > 0 ? dados.valorTotal / dados.quantidade : 0,
        }))
        .sort((a, b) => b.quantidade - a.quantidade);
}

function processarPorModalidade(licitacoes: PNCPContratacao[]): DadosPorModalidade[] {
    const porModalidade = new Map<string, { quantidade: number; valorTotal: number }>();
    const total = licitacoes.length;

    licitacoes.forEach(l => {
        const modalidade = MODALIDADES[l.modalidadeId] || l.modalidadeNome || 'Outros';
        const atual = porModalidade.get(modalidade) || { quantidade: 0, valorTotal: 0 };
        porModalidade.set(modalidade, {
            quantidade: atual.quantidade + 1,
            valorTotal: atual.valorTotal + (l.valorTotalEstimado || 0),
        });
    });

    return Array.from(porModalidade.entries())
        .map(([modalidade, dados]) => ({
            modalidade,
            quantidade: dados.quantidade,
            valorTotal: dados.valorTotal,
            percentual: total > 0 ? (dados.quantidade / total) * 100 : 0,
        }))
        .sort((a, b) => b.quantidade - a.quantidade);
}

function processarPorArea(licitacoes: PNCPContratacao[]): DadosPorArea[] {
    const porArea = new Map<string, { quantidade: number; valorTotal: number }>();
    const total = licitacoes.length;

    licitacoes.forEach(l => {
        const area = categorizarArea(l.objetoCompra);
        const atual = porArea.get(area) || { quantidade: 0, valorTotal: 0 };
        porArea.set(area, {
            quantidade: atual.quantidade + 1,
            valorTotal: atual.valorTotal + (l.valorTotalEstimado || 0),
        });
    });

    return Array.from(porArea.entries())
        .map(([area, dados]) => ({
            area,
            quantidade: dados.quantidade,
            valorTotal: dados.valorTotal,
            percentual: total > 0 ? (dados.quantidade / total) * 100 : 0,
        }))
        .sort((a, b) => b.quantidade - a.quantidade);
}

function processarTopOrgaos(licitacoes: PNCPContratacao[], limite: number = 10): DadosPorOrgao[] {
    const porOrgao = new Map<string, { orgao: string; uf: string; quantidade: number; valorTotal: number }>();

    licitacoes.forEach(l => {
        const cnpj = l.orgaoEntidade.cnpj;
        const atual = porOrgao.get(cnpj) || {
            orgao: l.orgaoEntidade.razaoSocial,
            uf: l.unidadeOrgao.ufSigla,
            quantidade: 0,
            valorTotal: 0,
        };
        porOrgao.set(cnpj, {
            ...atual,
            quantidade: atual.quantidade + 1,
            valorTotal: atual.valorTotal + (l.valorTotalEstimado || 0),
        });
    });

    return Array.from(porOrgao.entries())
        .map(([cnpj, dados]) => ({
            cnpj,
            ...dados,
        }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, limite);
}

function processarTendencia(licitacoes: PNCPContratacao[]): TendenciaTemporal[] {
    const porMes = new Map<string, { quantidade: number; valorTotal: number }>();

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    licitacoes.forEach(l => {
        const data = new Date(l.dataPublicacaoPncp);
        const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        const atual = porMes.get(chave) || { quantidade: 0, valorTotal: 0 };
        porMes.set(chave, {
            quantidade: atual.quantidade + 1,
            valorTotal: atual.valorTotal + (l.valorTotalEstimado || 0),
        });
    });

    return Array.from(porMes.entries())
        .map(([data, dados]) => {
            const [ano, mes] = data.split('-');
            return {
                data,
                mes: `${meses[parseInt(mes) - 1]}/${ano.slice(2)}`,
                quantidade: dados.quantidade,
                valorTotal: dados.valorTotal,
            };
        })
        .sort((a, b) => a.data.localeCompare(b.data));
}

function processarSazonalidade(licitacoes: PNCPContratacao[]): DadosSazonalidade[] {
    const porMes = new Map<number, { quantidade: number; valorTotal: number; count: number }>();
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    licitacoes.forEach(l => {
        const data = new Date(l.dataPublicacaoPncp);
        const mes = data.getMonth() + 1;
        const atual = porMes.get(mes) || { quantidade: 0, valorTotal: 0, count: 0 };
        porMes.set(mes, {
            quantidade: atual.quantidade + 1,
            valorTotal: atual.valorTotal + (l.valorTotalEstimado || 0),
            count: atual.count + 1,
        });
    });

    // Retornar apenas meses que têm dados
    return Array.from(porMes.entries())
        .filter(([, dados]) => dados.quantidade > 0)
        .map(([mesNumero, dados]) => ({
            mes: meses[mesNumero - 1],
            mesNumero,
            quantidade: dados.quantidade,
            valorMedio: dados.count > 0 ? dados.valorTotal / dados.count : 0,
        }))
        .sort((a, b) => a.mesNumero - b.mesNumero);
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Padrão: últimos 6 meses
        const hoje = new Date();
        const seisAtras = new Date();
        seisAtras.setMonth(hoje.getMonth() - 6);

        const dataInicio = searchParams.get('dataInicio') || seisAtras.toISOString().split('T')[0];
        const dataFim = searchParams.get('dataFim') || hoje.toISOString().split('T')[0];

        // Formatar datas para YYYYMMDD
        const dataInicioFormatada = dataInicio.replace(/-/g, '');
        const dataFimFormatada = dataFim.replace(/-/g, '');

        const licitacoes = await buscarTodasLicitacoes(dataInicioFormatada, dataFimFormatada);

        const dashboardData: DashboardData = {
            estatisticas: processarEstatisticas(licitacoes),
            porUF: processarPorUF(licitacoes),
            porModalidade: processarPorModalidade(licitacoes),
            porArea: processarPorArea(licitacoes),
            topOrgaos: processarTopOrgaos(licitacoes),
            tendencia: processarTendencia(licitacoes),
            sazonalidade: processarSazonalidade(licitacoes),
            periodo: {
                inicio: dataInicio,
                fim: dataFim,
            },
        };

        return NextResponse.json({
            success: true,
            data: dashboardData,
        });
    } catch (error) {
        console.error('Erro ao gerar dashboard:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao processar dados do dashboard' },
            { status: 500 }
        );
    }
}
