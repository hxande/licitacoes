'use client';

import { useState, useEffect, useCallback } from 'react';
import { PerfilEmpresa, MatchResult } from '@/types/empresa';
import { Licitacao } from '@/types/licitacao';
import { useAuthContext } from '@/contexts/AuthContext';

const STORAGE_KEY = 'perfil-empresa';

export function usePerfilEmpresa() {
    const { autenticado } = useAuthContext();
    const [perfil, setPerfil] = useState<PerfilEmpresa | null>(null);
    const [loaded, setLoaded] = useState(false);

    // Carregar perfil do servidor
    useEffect(() => {
        if (!autenticado) {
            setPerfil(null);
            setLoaded(true);
            return;
        }

        async function load() {
            try {
                const res = await fetch('/api/perfil-empresa', { credentials: 'include' });
                if (!res.ok) throw new Error('API unavailable');
                const data = await res.json();
                if (data) {
                    const p = data.dados || data;
                    setPerfil(p);
                    setLoaded(true);
                    return;
                }
            } catch (e) {
                // If API fails, leave perfil as null (no local persistence)
                setPerfil(null);
            } finally {
                setLoaded(true);
            }
        }
        load();
    }, [autenticado]);

    function loadFromStorage(): PerfilEmpresa | null { return null; }
    function saveToStorage(_: PerfilEmpresa | null) { /* noop - server persists data */ }

    // Salvar perfil
    const salvarPerfil = useCallback((novoPerfil: PerfilEmpresa) => {
        setPerfil(novoPerfil);
        saveToStorage(novoPerfil);
        fetch('/api/perfil-empresa', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoPerfil), credentials: 'include' }).catch(() => { saveToStorage(novoPerfil); });
    }, []);

    // Limpar perfil
    const limparPerfil = useCallback(() => {
        setPerfil(null);
        saveToStorage(null);
        fetch('/api/perfil-empresa', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}), credentials: 'include' }).catch(() => { saveToStorage(null); });
    }, []);

    // Calcular match com uma licitação
    const calcularMatch = useCallback((licitacao: Licitacao): MatchResult | null => {
        if (!perfil) return null;

        const fatores = {
            area: 0,
            estado: 0,
            valor: 0,
            capacidades: 0,
            modalidade: 0,
        };
        const destaques: string[] = [];

        // Normalizar texto (remover acentos para comparação)
        const normalizar = (texto: string) =>
            texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const objetoNormalizado = normalizar(licitacao.objeto);
        const categoriasNormalizadas = (licitacao.categorias || []).map(normalizar);

        // Mapa de termos relacionados para cada área/capacidade
        const termosRelacionados: Record<string, string[]> = {
            // ================================================================
            // ÁREAS DE ATUAÇÃO (chaves sem acento para match com normalizar())
            // ================================================================
            'tecnologia da informacao': ['tecnologia', 'informacao', 'ti', 'informatica', 'sistema', 'software', 'digital', 'computacao', 'dados', 'tic', 'comunicacao', 'rede', 'internet', 'computador', 'equipamento', 'licenca'],
            'engenharia e obras': ['engenharia', 'obra', 'construcao', 'reforma', 'manutencao', 'predial', 'edificacao', 'estrutura', 'projeto', 'eletrica', 'hidraulica', 'civil', 'arquitetura', 'pavimentacao', 'terraplanagem', 'saneamento'],
            'saude': ['saude', 'medico', 'hospital', 'clinica', 'medicamento', 'farmacia', 'enfermagem', 'laboratorio', 'hospitalar', 'ambulancia', 'odontologico', 'fisioterapia', 'exame', 'cirurgia', 'uti', 'leito'],
            'educacao': ['educacao', 'ensino', 'escola', 'escolar', 'capacitacao', 'treinamento', 'curso', 'pedagogico', 'didatico', 'livro', 'apostila', 'professor', 'aluno', 'universitario', 'academico'],
            'alimentacao': ['alimentacao', 'refeicao', 'alimento', 'nutricao', 'cozinha', 'restaurante', 'merenda', 'genero alimenticio', 'catering', 'coffee', 'lanche', 'bebida', 'agua mineral', 'cafe'],
            'veiculos e transporte': ['veiculo', 'transporte', 'frota', 'locacao', 'motorista', 'onibus', 'combustivel', 'automotivo', 'caminhao', 'carro', 'motocicleta', 'abastecimento', 'gasolina', 'diesel', 'etanol', 'lubrificante', 'pneu', 'mecanica'],
            'limpeza e conservacao': ['limpeza', 'conservacao', 'asseio', 'higienizacao', 'zeladoria', 'faxina', 'jardinagem', 'paisagismo', 'dedetizacao', 'praga', 'desratizacao', 'material de limpeza', 'produto quimico'],
            'seguranca': ['seguranca', 'vigilancia', 'vigia', 'portaria', 'porteiro', 'monitoramento', 'cftv', 'camera', 'alarme', 'controle de acesso', 'ronda', 'patrimonial', 'brigadista', 'bombeiro'],
            'mobiliario e equipamentos': ['mobiliario', 'movel', 'equipamento', 'cadeira', 'mesa', 'armario', 'estante', 'arquivo', 'ar condicionado', 'climatizacao', 'refrigeracao', 'eletrodomestico', 'eletronico', 'impressora', 'copiadora'],
            'comunicacao e marketing': ['comunicacao', 'publicidade', 'marketing', 'propaganda', 'midia', 'assessoria', 'imprensa', 'evento', 'audio', 'video', 'fotografia', 'design', 'grafica', 'impressao', 'banner', 'sinalizacao', 'publicacao'],
            'juridico e contabil': ['juridico', 'advocacia', 'advogado', 'contabil', 'contabilidade', 'contador', 'auditoria', 'pericia', 'consultoria', 'fiscal', 'tributario', 'trabalhista', 'licitacao', 'contrato'],
            'recursos humanos': ['recursos humanos', 'rh', 'pessoal', 'folha', 'pagamento', 'beneficio', 'vale', 'recrutamento', 'selecao', 'terceirizacao', 'mao de obra', 'temporario', 'estagio', 'aprendiz'],

            // ================================================================
            // CAPACIDADES - TECNOLOGIA DA INFORMAÇÃO
            // ================================================================
            'desenvolvimento de software': ['software', 'sistema', 'aplicativo', 'aplicacao', 'desenvolvimento', 'programacao', 'plataforma', 'solucao', 'codigo', 'programa'],
            'desenvolvimento web': ['web', 'site', 'portal', 'pagina', 'internet', 'online', 'digital', 'website', 'homepage'],
            'desenvolvimento mobile': ['mobile', 'app', 'aplicativo', 'celular', 'smartphone', 'android', 'ios', 'tablet'],
            'sistemas erp': ['erp', 'gestao empresarial', 'integrado', 'administrativo', 'financeiro', 'contabil', 'gestao integrada'],
            'sistemas crm': ['crm', 'relacionamento', 'cliente', 'atendimento', 'vendas', 'comercial'],
            'business intelligence': ['bi', 'business intelligence', 'dashboard', 'relatorio', 'analytics', 'analise', 'dados', 'indicador', 'kpi'],
            'data analytics': ['analytics', 'dados', 'analise', 'big data', 'mineracao', 'estatistica', 'ciencia de dados'],
            'inteligencia artificial': ['inteligencia artificial', 'ia', 'machine learning', 'aprendizado', 'automatizado', 'automacao', 'chatbot', 'bot', 'neural', 'algoritmo'],
            'machine learning': ['machine learning', 'aprendizado de maquina', 'ia', 'inteligencia artificial', 'modelo', 'algoritmo', 'preditivo'],
            'cloud computing': ['cloud', 'nuvem', 'aws', 'azure', 'google cloud', 'hospedagem', 'servidor', 'saas', 'iaas', 'paas'],
            'infraestrutura de ti': ['infraestrutura', 'rede', 'servidor', 'datacenter', 'cabeamento', 'switch', 'roteador', 'rack', 'storage', 'hardware'],
            'redes de computadores': ['rede', 'cabeamento', 'switch', 'roteador', 'wifi', 'wireless', 'lan', 'wan', 'fibra', 'conectividade'],
            'seguranca da informacao': ['seguranca', 'ciberseguranca', 'firewall', 'antivirus', 'protecao', 'backup', 'criptografia', 'vulnerabilidade', 'pentest'],
            'suporte tecnico': ['suporte', 'help desk', 'atendimento', 'chamado', 'manutencao', 'assistencia', 'service desk', 'incidente'],
            'help desk': ['help desk', 'suporte', 'atendimento', 'chamado', 'usuario', 'service desk', 'nivel 1', 'nivel 2'],
            'noc/soc': ['noc', 'soc', 'monitoramento', 'operacao', 'centro', 'incidente', 'disponibilidade', 'rede'],
            'devops': ['devops', 'deploy', 'integracao', 'pipeline', 'ci', 'cd', 'docker', 'kubernetes', 'automacao'],
            'virtualizacao': ['virtualizacao', 'vmware', 'hyper-v', 'virtual', 'vm', 'maquina virtual', 'container'],
            'backup e recuperacao': ['backup', 'recuperacao', 'restore', 'contingencia', 'desastre', 'replicacao', 'copia'],
            'outsourcing de ti': ['outsourcing', 'terceirizacao', 'fabrica de software', 'alocacao', 'body shop', 'servico gerenciado'],
            'consultoria em ti': ['consultoria', 'assessoria', 'projeto', 'planejamento', 'diagnostico', 'estrategia', 'mapeamento'],
            'gestao de projetos': ['gestao de projeto', 'projeto', 'pmo', 'gerenciamento', 'cronograma', 'escopo', 'metodologia'],
            'treinamento e capacitacao': ['treinamento', 'capacitacao', 'curso', 'workshop', 'certificacao', 'ensino', 'formacao', 'educacao'],
            'licenciamento de software': ['licenca', 'licenciamento', 'microsoft', 'office', 'windows', 'adobe', 'software', 'assinatura', 'subscription'],
            'hardware e equipamentos': ['hardware', 'equipamento', 'computador', 'notebook', 'desktop', 'servidor', 'impressora', 'monitor', 'periferico'],
            'cabeamento estruturado': ['cabeamento', 'estruturado', 'rede', 'fibra', 'patch', 'rack', 'infraestrutura', 'cat5', 'cat6'],
            'data center': ['data center', 'datacenter', 'colocation', 'hosting', 'servidor', 'rack', 'refrigeracao', 'nobreak'],
            'iot': ['iot', 'internet das coisas', 'sensor', 'dispositivo', 'conectado', 'telemetria', 'monitoramento', 'embarcado'],
            'automacao': ['automacao', 'automatizado', 'rpa', 'processo', 'robo', 'workflow', 'bot'],

            // ================================================================
            // CAPACIDADES - ENGENHARIA E OBRAS
            // ================================================================
            'construcao civil': ['construcao', 'civil', 'obra', 'edificacao', 'predial', 'alvenaria', 'estrutura', 'fundacao', 'concreto'],
            'reformas': ['reforma', 'adequacao', 'adaptacao', 'revitalizacao', 'restauracao', 'recuperacao', 'reparo'],
            'manutencao predial': ['manutencao', 'predial', 'preventiva', 'corretiva', 'edificio', 'instalacao', 'conservacao'],
            'projetos de engenharia': ['projeto', 'engenharia', 'arquitetura', 'planta', 'desenho', 'tecnico', 'executivo', 'laudo'],
            'instalacoes eletricas': ['eletrica', 'eletrico', 'instalacao', 'quadro', 'disjuntor', 'fiacao', 'iluminacao', 'energia', 'subestacao'],
            'instalacoes hidraulicas': ['hidraulica', 'hidraulico', 'agua', 'esgoto', 'encanamento', 'tubulacao', 'bomba', 'reservatorio'],

            // ================================================================
            // CAPACIDADES - SAÚDE
            // ================================================================
            'equipamentos medicos': ['equipamento medico', 'hospitalar', 'aparelho', 'monitor', 'maquina', 'eletromedico', 'diagnostico', 'imagem'],
            'medicamentos': ['medicamento', 'remedio', 'farmaco', 'farmaceutico', 'farmacia', 'droga', 'principio ativo', 'receita'],
            'materiais hospitalares': ['material hospitalar', 'insumo', 'descartavel', 'seringa', 'agulha', 'luva', 'mascara', 'esteril', 'cirurgico'],
            'servicos de saude': ['servico de saude', 'atendimento', 'clinica', 'ambulatorio', 'consulta', 'exame', 'procedimento', 'plantao'],

            // ================================================================
            // CAPACIDADES - ALIMENTAÇÃO
            // ================================================================
            'fornecimento de refeicoes': ['refeicao', 'almoco', 'jantar', 'cafe da manha', 'self service', 'bandejao', 'refeitorio', 'cozinha industrial'],
            'generos alimenticios': ['genero alimenticio', 'alimento', 'mantimento', 'hortifruti', 'carne', 'legume', 'verdura', 'fruta', 'graos'],
            'catering': ['catering', 'coffee break', 'coquetel', 'buffet', 'evento', 'coffee', 'servico de alimentacao'],

            // ================================================================
            // CAPACIDADES - LIMPEZA E CONSERVAÇÃO (área já definida acima)
            // ================================================================
            'jardinagem': ['jardinagem', 'jardim', 'paisagismo', 'poda', 'grama', 'verde', 'planta', 'arvore', 'paisagistico'],
            'controle de pragas': ['praga', 'dedetizacao', 'desratizacao', 'descupinizacao', 'controle', 'inseto', 'roedor', 'veneno'],

            // ================================================================
            // CAPACIDADES - SEGURANÇA
            // ================================================================
            'vigilancia patrimonial': ['vigilancia', 'vigia', 'vigilante', 'patrimonial', 'seguranca', 'armada', 'desarmada', 'ronda'],
            'seguranca eletronica': ['seguranca eletronica', 'alarme', 'sensor', 'cerca eletrica', 'detector', 'central de monitoramento'],
            'monitoramento cftv': ['cftv', 'camera', 'monitoramento', 'video', 'gravacao', 'dvr', 'nvr', 'circuito fechado'],

            // ================================================================
            // CAPACIDADES - VEÍCULOS E TRANSPORTE
            // ================================================================
            'locacao de veiculos': ['locacao', 'veiculo', 'aluguel', 'carro', 'frota', 'automovel', 'utilitario', 'van'],
            'manutencao de frota': ['manutencao', 'frota', 'mecanica', 'oficina', 'reparo', 'revisao', 'veiculo', 'automotiva'],
            'combustiveis': ['combustivel', 'abastecimento', 'gasolina', 'diesel', 'etanol', 'gnv', 'posto', 'combustao'],

            // ================================================================
            // CAPACIDADES - COMUNICAÇÃO E MARKETING
            // ================================================================
            'publicidade': ['publicidade', 'propaganda', 'campanha', 'anuncio', 'midia', 'veiculo', 'comunicacao', 'divulgacao'],
            'marketing digital': ['marketing digital', 'digital', 'redes sociais', 'social media', 'google', 'facebook', 'instagram', 'seo', 'ads'],
            'producao de eventos': ['evento', 'producao', 'organizacao', 'cerimonia', 'conferencia', 'seminario', 'workshop', 'congresso', 'feira'],
            'assessoria de imprensa': ['assessoria', 'imprensa', 'comunicacao', 'release', 'midia', 'jornalismo', 'entrevista', 'coletiva'],

            // ================================================================
            // CAPACIDADES - OUTROS
            // ================================================================
            'mobiliario': ['mobiliario', 'movel', 'moveis', 'cadeira', 'mesa', 'armario', 'estante', 'balcao', 'bancada', 'estofado'],
            'ar condicionado': ['ar condicionado', 'climatizacao', 'hvac', 'refrigeracao', 'split', 'central', 'duto', 'temperatura'],
            'material de escritorio': ['material de escritorio', 'papelaria', 'papel', 'caneta', 'toner', 'cartucho', 'expediente', 'consumivel'],
        };

        // Função para verificar match com termos relacionados
        const verificarMatchComTermos = (termo: string, texto: string): boolean => {
            const termoNorm = normalizar(termo);

            // Match direto
            if (texto.includes(termoNorm)) return true;

            // Match por palavras do termo
            const palavras = termoNorm.split(/\s+/).filter(p => p.length > 3);
            if (palavras.length > 0) {
                const matchPalavras = palavras.filter(p => texto.includes(p));
                if (matchPalavras.length >= Math.ceil(palavras.length * 0.6)) return true;
            }

            // Match por termos relacionados
            const relacionados = termosRelacionados[termoNorm] || [];
            const matchRelacionados = relacionados.filter(rel => texto.includes(rel));
            if (matchRelacionados.length >= 2) return true;

            return false;
        };

        // ====================================================================
        // PASSO 1: ÁREA DE ATUAÇÃO (peso 25%)
        // ====================================================================
        if (perfil.areasAtuacao.length > 0) {
            // Primeiro: verificar match exato na categoria da licitação
            const areaExata = perfil.areasAtuacao.includes(licitacao.areaAtuacao);

            // Segundo: verificar se termos da área aparecem no objeto
            const areaNoObjeto = perfil.areasAtuacao.some(area =>
                verificarMatchComTermos(area, objetoNormalizado)
            );

            if (areaExata) {
                fatores.area = 100;
                destaques.push(`✓ Área: ${licitacao.areaAtuacao}`);
            } else if (areaNoObjeto) {
                fatores.area = 80; // Match por termos no objeto
                const areaMatch = perfil.areasAtuacao.find(a => verificarMatchComTermos(a, objetoNormalizado));
                if (areaMatch) destaques.push(`✓ Área relacionada: ${areaMatch}`);
            } else {
                fatores.area = 0;
            }
        } else {
            fatores.area = 50;
        }

        // ====================================================================
        // PASSO 2: CAPACIDADES (peso 35% - O MAIS IMPORTANTE)
        // ====================================================================
        let capacidadesMatch: string[] = [];

        if (perfil.capacidades.length > 0) {
            capacidadesMatch = perfil.capacidades.filter(capacidade => {
                // Verificar no objeto da licitação
                if (verificarMatchComTermos(capacidade, objetoNormalizado)) return true;

                // Verificar nas categorias
                const matchNaCategoria = categoriasNormalizadas.some(cat =>
                    verificarMatchComTermos(capacidade, cat)
                );

                return matchNaCategoria;
            });

            // Calcular score baseado em quantas capacidades bateram
            if (capacidadesMatch.length === 0) {
                fatores.capacidades = 0;
            } else if (capacidadesMatch.length >= 3) {
                fatores.capacidades = 100;
            } else if (capacidadesMatch.length === 2) {
                fatores.capacidades = 85;
            } else {
                fatores.capacidades = 70;
            }

            // Adicionar capacidades aos destaques
            capacidadesMatch.slice(0, 2).forEach(c => {
                destaques.push(`✓ ${c}`);
            });
        } else {
            fatores.capacidades = 0;
        }

        // ====================================================================
        // PASSO 3: ESTADOS DE ATUAÇÃO (peso 20%)
        // ====================================================================
        if (perfil.estadosAtuacao.length > 0) {
            if (perfil.estadosAtuacao.includes(licitacao.uf)) {
                fatores.estado = 100;
                destaques.push(`✓ Estado: ${licitacao.uf}`);
            } else {
                fatores.estado = 0;
            }
        } else {
            fatores.estado = 100;
        }

        // ====================================================================
        // PASSO 4: FAIXA DE VALOR (peso 10%)
        // ====================================================================
        if (licitacao.valorEstimado) {
            const valorLicitacao = licitacao.valorEstimado;
            const dentroDoMinimo = !perfil.valorMinimo || valorLicitacao >= perfil.valorMinimo;
            const dentroDoMaximo = !perfil.valorMaximo || valorLicitacao <= perfil.valorMaximo;

            if (dentroDoMinimo && dentroDoMaximo) {
                fatores.valor = 100;
            } else if (!dentroDoMinimo && perfil.valorMinimo) {
                const distancia = perfil.valorMinimo / valorLicitacao;
                fatores.valor = distancia <= 2 ? 40 : 0;
            } else if (!dentroDoMaximo && perfil.valorMaximo) {
                const distancia = valorLicitacao / perfil.valorMaximo;
                fatores.valor = distancia <= 2 ? 50 : 0;
            }
        } else {
            fatores.valor = 50;
        }

        // ====================================================================
        // PASSO 5: MODALIDADE PREFERIDA (peso 10%)
        // ====================================================================
        const modalidadeId = getModalidadeId(licitacao.modalidade);
        if (perfil.modalidadesPreferidas.length > 0) {
            if (perfil.modalidadesPreferidas.includes(modalidadeId)) {
                fatores.modalidade = 100;
            } else {
                fatores.modalidade = 30;
            }
        } else {
            fatores.modalidade = 100;
        }

        // ====================================================================
        // CALCULAR PERCENTUAL FINAL (PONDERADO)
        // ====================================================================
        const pesos = {
            capacidades: 0.35,
            area: 0.25,
            estado: 0.20,
            valor: 0.10,
            modalidade: 0.10,
        };

        let percentual = Math.round(
            fatores.capacidades * pesos.capacidades +
            fatores.area * pesos.area +
            fatores.estado * pesos.estado +
            fatores.valor * pesos.valor +
            fatores.modalidade * pesos.modalidade
        );

        // Se não tem match em capacidades E área, limita o percentual
        if (fatores.capacidades === 0 && fatores.area === 0) {
            percentual = Math.min(percentual, 20);
        }

        return {
            percentual,
            fatores,
            destaques: destaques.slice(0, 4),
        };
    }, [perfil]);

    return {
        perfil,
        loaded,
        salvarPerfil,
        limparPerfil,
        calcularMatch,
        temPerfil: !!perfil,
    };
}

// Helper para extrair ID da modalidade do nome
function getModalidadeId(modalidade: string): number {
    const modalidadeMap: Record<string, number> = {
        'Leilão - Eletrônico': 1,
        'Diálogo Competitivo': 2,
        'Concurso': 3,
        'Concorrência - Eletrônica': 4,
        'Concorrência - Presencial': 5,
        'Pregão - Eletrônico': 6,
        'Pregão - Presencial': 7,
        'Dispensa de Licitação': 8,
        'Inexigibilidade': 9,
        'Manifestação de Interesse': 10,
        'Pré-qualificação': 11,
        'Credenciamento': 12,
        'Leilão - Presencial': 13,
    };
    return modalidadeMap[modalidade] || 0;
}
