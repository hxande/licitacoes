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

        // ============================================================================
        // SISTEMA DE SCORING COM PESOS PARA TERMOS RELACIONADOS
        // ============================================================================
        interface TermoPeso {
            termo: string;
            peso: number; // 1=genérico, 2=moderado, 3=específico
        }

        interface ConfigCapacidade {
            termos: TermoPeso[];
            exclusoes: string[];
            scoreMinimo: number;
        }

        // Configuração de termos por capacidade/área com pesos
        const termosConfig: Record<string, ConfigCapacidade> = {
            // ================================================================
            // ÁREAS DE ATUAÇÃO
            // ================================================================
            'tecnologia da informacao': {
                termos: [
                    // Peso 3 - Muito específicos
                    { termo: 'software', peso: 3 },
                    { termo: 'sistema de informacao', peso: 3 },
                    { termo: 'desenvolvimento de sistema', peso: 3 },
                    { termo: 'infraestrutura de ti', peso: 3 },
                    { termo: 'data center', peso: 3 },
                    { termo: 'suporte de ti', peso: 3 },
                    { termo: 'helpdesk', peso: 3 },
                    { termo: 'licenca de software', peso: 3 },
                    { termo: 'seguranca da informacao', peso: 3 },
                    { termo: 'banco de dados', peso: 3 },
                    // Peso 2 - Moderados
                    { termo: 'informatica', peso: 2 },
                    { termo: 'computador', peso: 2 },
                    { termo: 'notebook', peso: 2 },
                    { termo: 'servidor', peso: 2 },
                    { termo: 'rede de dados', peso: 2 },
                    { termo: 'firewall', peso: 2 },
                    { termo: 'backup', peso: 2 },
                    { termo: 'aplicativo', peso: 2 },
                    // Peso 1 - Genéricos
                    { termo: 'digital', peso: 1 },
                    { termo: 'sistema', peso: 1 },
                    { termo: 'rede', peso: 1 },
                ],
                exclusoes: ['ar condicionado', 'climatizacao', 'refrigeracao'],
                scoreMinimo: 3
            },
            'engenharia e obras': {
                termos: [
                    // Peso 3 - Muito específicos
                    { termo: 'construcao civil', peso: 3 },
                    { termo: 'obra de engenharia', peso: 3 },
                    { termo: 'pavimentacao asfaltica', peso: 3 },
                    { termo: 'terraplanagem', peso: 3 },
                    { termo: 'estrutura metalica', peso: 3 },
                    { termo: 'estrutura de concreto', peso: 3 },
                    { termo: 'reforma predial', peso: 3 },
                    { termo: 'manutencao predial', peso: 3 },
                    { termo: 'saneamento basico', peso: 3 },
                    // Peso 2 - Moderados
                    { termo: 'construcao', peso: 2 },
                    { termo: 'obra', peso: 2 },
                    { termo: 'reforma', peso: 2 },
                    { termo: 'edificacao', peso: 2 },
                    { termo: 'alvenaria', peso: 2 },
                    { termo: 'concreto', peso: 2 },
                    { termo: 'instalacao hidraulica', peso: 2 },
                    { termo: 'instalacao eletrica predial', peso: 2 },
                    // Peso 1 - Genéricos (evitar sozinhos)
                    { termo: 'engenharia', peso: 1 },
                    { termo: 'projeto', peso: 1 },
                    { termo: 'estrutura', peso: 1 },
                    { termo: 'eletrica', peso: 1 },
                    { termo: 'hidraulica', peso: 1 },
                ],
                exclusoes: ['evento', 'carnaval', 'festa', 'show', 'palco', 'trio eletrico', 'bombeiro', 'brigadista', 'cenario', 'decoracao'],
                scoreMinimo: 3
            },
            'saude': {
                termos: [
                    // Peso 3
                    { termo: 'medicamento', peso: 3 },
                    { termo: 'material hospitalar', peso: 3 },
                    { termo: 'equipamento hospitalar', peso: 3 },
                    { termo: 'equipamento medico', peso: 3 },
                    { termo: 'servico de saude', peso: 3 },
                    { termo: 'unidade basica de saude', peso: 3 },
                    { termo: 'ambulancia', peso: 3 },
                    // Peso 2
                    { termo: 'hospital', peso: 2 },
                    { termo: 'hospitalar', peso: 2 },
                    { termo: 'farmaceutico', peso: 2 },
                    { termo: 'clinica', peso: 2 },
                    { termo: 'laboratorial', peso: 2 },
                    { termo: 'cirurgico', peso: 2 },
                    // Peso 1
                    { termo: 'saude', peso: 1 },
                    { termo: 'medico', peso: 1 },
                    { termo: 'exame', peso: 1 },
                ],
                exclusoes: ['saude financeira', 'saude ocupacional'],
                scoreMinimo: 3
            },
            'educacao': {
                termos: [
                    // Peso 3
                    { termo: 'material didatico', peso: 3 },
                    { termo: 'material pedagogico', peso: 3 },
                    { termo: 'material escolar', peso: 3 },
                    { termo: 'merenda escolar', peso: 3 },
                    { termo: 'transporte escolar', peso: 3 },
                    { termo: 'mobiliario escolar', peso: 3 },
                    // Peso 2
                    { termo: 'escola', peso: 2 },
                    { termo: 'educacao', peso: 2 },
                    { termo: 'ensino', peso: 2 },
                    { termo: 'pedagogico', peso: 2 },
                    { termo: 'escolar', peso: 2 },
                    { termo: 'creche', peso: 2 },
                    { termo: 'universidade', peso: 2 },
                    // Peso 1
                    { termo: 'curso', peso: 1 },
                    { termo: 'capacitacao', peso: 1 },
                    { termo: 'treinamento', peso: 1 },
                ],
                exclusoes: ['educacao financeira'],
                scoreMinimo: 3
            },
            'alimentacao': {
                termos: [
                    // Peso 3
                    { termo: 'genero alimenticio', peso: 3 },
                    { termo: 'fornecimento de refeicao', peso: 3 },
                    { termo: 'merenda escolar', peso: 3 },
                    { termo: 'cesta basica', peso: 3 },
                    { termo: 'cozinha industrial', peso: 3 },
                    // Peso 2
                    { termo: 'alimentacao', peso: 2 },
                    { termo: 'refeicao', peso: 2 },
                    { termo: 'alimento', peso: 2 },
                    { termo: 'restaurante', peso: 2 },
                    { termo: 'hortifruti', peso: 2 },
                    // Peso 1
                    { termo: 'cafe', peso: 1 },
                    { termo: 'lanche', peso: 1 },
                    { termo: 'agua mineral', peso: 1 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },
            'veiculos e transporte': {
                termos: [
                    // Peso 3
                    { termo: 'locacao de veiculo', peso: 3 },
                    { termo: 'manutencao de frota', peso: 3 },
                    { termo: 'manutencao veicular', peso: 3 },
                    { termo: 'transporte escolar', peso: 3 },
                    { termo: 'gestao de frota', peso: 3 },
                    // Peso 2
                    { termo: 'veiculo', peso: 2 },
                    { termo: 'automovel', peso: 2 },
                    { termo: 'caminhao', peso: 2 },
                    { termo: 'onibus', peso: 2 },
                    { termo: 'combustivel', peso: 2 },
                    { termo: 'frota', peso: 2 },
                    // Peso 1
                    { termo: 'transporte', peso: 1 },
                    { termo: 'frete', peso: 1 },
                ],
                exclusoes: ['transporte de dados'],
                scoreMinimo: 3
            },
            'limpeza e conservacao': {
                termos: [
                    // Peso 3
                    { termo: 'servico de limpeza', peso: 3 },
                    { termo: 'limpeza predial', peso: 3 },
                    { termo: 'material de limpeza', peso: 3 },
                    { termo: 'coleta de lixo', peso: 3 },
                    { termo: 'controle de pragas', peso: 3 },
                    // Peso 2
                    { termo: 'limpeza', peso: 2 },
                    { termo: 'conservacao', peso: 2 },
                    { termo: 'higienizacao', peso: 2 },
                    { termo: 'zeladoria', peso: 2 },
                    { termo: 'jardinagem', peso: 2 },
                    { termo: 'dedetizacao', peso: 2 },
                    // Peso 1
                    { termo: 'asseio', peso: 1 },
                ],
                exclusoes: ['limpeza de dados', 'conservacao de documento'],
                scoreMinimo: 3
            },
            'seguranca': {
                termos: [
                    // Peso 3
                    { termo: 'vigilancia patrimonial', peso: 3 },
                    { termo: 'seguranca patrimonial', peso: 3 },
                    { termo: 'vigilancia armada', peso: 3 },
                    { termo: 'monitoramento eletronico', peso: 3 },
                    { termo: 'controle de acesso', peso: 3 },
                    // Peso 2
                    { termo: 'vigilancia', peso: 2 },
                    { termo: 'cftv', peso: 2 },
                    { termo: 'camera de seguranca', peso: 2 },
                    { termo: 'portaria', peso: 2 },
                    // Peso 1
                    { termo: 'monitoramento', peso: 1 },
                    { termo: 'alarme', peso: 1 },
                ],
                exclusoes: ['seguranca da informacao', 'seguranca de ti', 'seguranca do trabalho', 'seguranca alimentar'],
                scoreMinimo: 3
            },
            'mobiliario e equipamentos': {
                termos: [
                    // Peso 3
                    { termo: 'mobiliario de escritorio', peso: 3 },
                    { termo: 'movel de escritorio', peso: 3 },
                    { termo: 'ar condicionado', peso: 3 },
                    { termo: 'sistema de climatizacao', peso: 3 },
                    // Peso 2
                    { termo: 'mobiliario', peso: 2 },
                    { termo: 'cadeira', peso: 2 },
                    { termo: 'armario', peso: 2 },
                    { termo: 'climatizacao', peso: 2 },
                    // Peso 1
                    { termo: 'equipamento', peso: 1 },
                    { termo: 'movel', peso: 1 },
                    { termo: 'mesa', peso: 1 },
                ],
                exclusoes: ['equipamento hospitalar', 'equipamento medico', 'equipamento de ti'],
                scoreMinimo: 3
            },
            'comunicacao e marketing': {
                termos: [
                    // Peso 3
                    { termo: 'servico de publicidade', peso: 3 },
                    { termo: 'campanha publicitaria', peso: 3 },
                    { termo: 'assessoria de imprensa', peso: 3 },
                    { termo: 'organizacao de evento', peso: 3 },
                    { termo: 'producao de video', peso: 3 },
                    // Peso 2
                    { termo: 'publicidade', peso: 2 },
                    { termo: 'propaganda', peso: 2 },
                    { termo: 'marketing', peso: 2 },
                    { termo: 'grafica', peso: 2 },
                    { termo: 'banner', peso: 2 },
                    // Peso 1
                    { termo: 'evento', peso: 1 },
                    { termo: 'comunicacao', peso: 1 },
                ],
                exclusoes: ['comunicacao de dados', 'rede de comunicacao'],
                scoreMinimo: 3
            },
            'juridico e contabil': {
                termos: [
                    // Peso 3
                    { termo: 'servico juridico', peso: 3 },
                    { termo: 'assessoria juridica', peso: 3 },
                    { termo: 'servico contabil', peso: 3 },
                    { termo: 'consultoria contabil', peso: 3 },
                    { termo: 'auditoria contabil', peso: 3 },
                    // Peso 2
                    { termo: 'juridico', peso: 2 },
                    { termo: 'advocacia', peso: 2 },
                    { termo: 'contabil', peso: 2 },
                    { termo: 'contabilidade', peso: 2 },
                    { termo: 'auditoria', peso: 2 },
                    // Peso 1
                    { termo: 'fiscal', peso: 1 },
                ],
                exclusoes: ['auditoria de sistema', 'auditoria de ti'],
                scoreMinimo: 3
            },
            'recursos humanos': {
                termos: [
                    // Peso 3
                    { termo: 'gestao de recursos humanos', peso: 3 },
                    { termo: 'folha de pagamento', peso: 3 },
                    { termo: 'terceirizacao de mao de obra', peso: 3 },
                    { termo: 'recrutamento e selecao', peso: 3 },
                    // Peso 2
                    { termo: 'recursos humanos', peso: 2 },
                    { termo: 'mao de obra', peso: 2 },
                    { termo: 'recrutamento', peso: 2 },
                    // Peso 1
                    { termo: 'rh', peso: 1 },
                    { termo: 'selecao', peso: 1 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },

            // ================================================================
            // CAPACIDADES - TI (mais específicas)
            // ================================================================
            'desenvolvimento de software': {
                termos: [
                    { termo: 'desenvolvimento de software', peso: 3 },
                    { termo: 'fabrica de software', peso: 3 },
                    { termo: 'desenvolvimento de sistema', peso: 3 },
                    { termo: 'software', peso: 2 },
                    { termo: 'sistema', peso: 1 },
                    { termo: 'aplicativo', peso: 2 },
                    { termo: 'programacao', peso: 2 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },
            'desenvolvimento web': {
                termos: [
                    { termo: 'desenvolvimento web', peso: 3 },
                    { termo: 'portal web', peso: 3 },
                    { termo: 'website', peso: 3 },
                    { termo: 'site', peso: 2 },
                    { termo: 'portal', peso: 2 },
                    { termo: 'pagina', peso: 1 },
                    { termo: 'web', peso: 1 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },
            'desenvolvimento mobile': {
                termos: [
                    { termo: 'aplicativo mobile', peso: 3 },
                    { termo: 'app mobile', peso: 3 },
                    { termo: 'android', peso: 2 },
                    { termo: 'ios', peso: 2 },
                    { termo: 'mobile', peso: 2 },
                    { termo: 'aplicativo', peso: 1 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },
            'cloud computing': {
                termos: [
                    { termo: 'cloud computing', peso: 3 },
                    { termo: 'computacao em nuvem', peso: 3 },
                    { termo: 'aws', peso: 3 },
                    { termo: 'azure', peso: 3 },
                    { termo: 'google cloud', peso: 3 },
                    { termo: 'cloud', peso: 2 },
                    { termo: 'nuvem', peso: 2 },
                    { termo: 'saas', peso: 2 },
                    { termo: 'iaas', peso: 2 },
                    { termo: 'hospedagem', peso: 1 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },
            'infraestrutura de ti': {
                termos: [
                    { termo: 'infraestrutura de ti', peso: 3 },
                    { termo: 'data center', peso: 3 },
                    { termo: 'cabeamento estruturado', peso: 3 },
                    { termo: 'rede de computadores', peso: 3 },
                    { termo: 'servidor', peso: 2 },
                    { termo: 'switch', peso: 2 },
                    { termo: 'roteador', peso: 2 },
                    { termo: 'storage', peso: 2 },
                    { termo: 'rack', peso: 1 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },
            'seguranca da informacao': {
                termos: [
                    { termo: 'seguranca da informacao', peso: 3 },
                    { termo: 'ciberseguranca', peso: 3 },
                    { termo: 'firewall', peso: 3 },
                    { termo: 'antivirus', peso: 2 },
                    { termo: 'backup', peso: 2 },
                    { termo: 'criptografia', peso: 2 },
                    { termo: 'pentest', peso: 2 },
                ],
                exclusoes: ['seguranca patrimonial', 'vigilancia'],
                scoreMinimo: 3
            },
            'suporte tecnico': {
                termos: [
                    { termo: 'suporte tecnico', peso: 3 },
                    { termo: 'suporte de ti', peso: 3 },
                    { termo: 'help desk', peso: 3 },
                    { termo: 'helpdesk', peso: 3 },
                    { termo: 'service desk', peso: 3 },
                    { termo: 'atendimento ao usuario', peso: 2 },
                    { termo: 'chamado', peso: 1 },
                    { termo: 'suporte', peso: 1 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },
            'licenciamento de software': {
                termos: [
                    { termo: 'licenca de software', peso: 3 },
                    { termo: 'licenciamento de software', peso: 3 },
                    { termo: 'licenciamento microsoft', peso: 3 },
                    { termo: 'assinatura de software', peso: 3 },
                    { termo: 'licenca', peso: 2 },
                    { termo: 'microsoft', peso: 1 },
                    { termo: 'office', peso: 1 },
                ],
                exclusoes: ['licenca ambiental', 'licenca de operacao'],
                scoreMinimo: 3
            },
            'hardware e equipamentos': {
                termos: [
                    { termo: 'equipamento de informatica', peso: 3 },
                    { termo: 'computador', peso: 3 },
                    { termo: 'notebook', peso: 3 },
                    { termo: 'servidor', peso: 2 },
                    { termo: 'desktop', peso: 2 },
                    { termo: 'impressora', peso: 2 },
                    { termo: 'monitor', peso: 2 },
                    { termo: 'hardware', peso: 2 },
                ],
                exclusoes: ['equipamento hospitalar', 'equipamento medico'],
                scoreMinimo: 3
            },
            'business intelligence': {
                termos: [
                    { termo: 'business intelligence', peso: 3 },
                    { termo: 'bi', peso: 2 },
                    { termo: 'dashboard', peso: 2 },
                    { termo: 'analytics', peso: 2 },
                    { termo: 'analise de dados', peso: 2 },
                    { termo: 'relatorio gerencial', peso: 2 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },
            'inteligencia artificial': {
                termos: [
                    { termo: 'inteligencia artificial', peso: 3 },
                    { termo: 'machine learning', peso: 3 },
                    { termo: 'aprendizado de maquina', peso: 3 },
                    { termo: 'ia', peso: 2 },
                    { termo: 'chatbot', peso: 2 },
                    { termo: 'modelo preditivo', peso: 2 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },
            'sistemas erp': {
                termos: [
                    { termo: 'sistema erp', peso: 3 },
                    { termo: 'erp', peso: 3 },
                    { termo: 'gestao empresarial', peso: 2 },
                    { termo: 'sistema integrado', peso: 2 },
                    { termo: 'gestao integrada', peso: 2 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },
            'sistemas crm': {
                termos: [
                    { termo: 'sistema crm', peso: 3 },
                    { termo: 'crm', peso: 3 },
                    { termo: 'gestao de relacionamento', peso: 2 },
                    { termo: 'relacionamento com cliente', peso: 2 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },

            // ================================================================
            // CAPACIDADES - ENGENHARIA
            // ================================================================
            'construcao civil': {
                termos: [
                    { termo: 'construcao civil', peso: 3 },
                    { termo: 'obra de engenharia', peso: 3 },
                    { termo: 'edificacao', peso: 2 },
                    { termo: 'construcao', peso: 2 },
                    { termo: 'obra', peso: 1 },
                ],
                exclusoes: ['evento', 'palco'],
                scoreMinimo: 3
            },
            'reformas': {
                termos: [
                    { termo: 'reforma predial', peso: 3 },
                    { termo: 'reforma de edificio', peso: 3 },
                    { termo: 'adequacao', peso: 2 },
                    { termo: 'reforma', peso: 2 },
                    { termo: 'revitalizacao', peso: 2 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },
            'manutencao predial': {
                termos: [
                    { termo: 'manutencao predial', peso: 3 },
                    { termo: 'manutencao de edificio', peso: 3 },
                    { termo: 'manutencao preventiva', peso: 2 },
                    { termo: 'manutencao corretiva', peso: 2 },
                    { termo: 'conservacao predial', peso: 2 },
                ],
                exclusoes: ['manutencao de veiculo', 'manutencao de equipamento'],
                scoreMinimo: 3
            },
            'instalacoes eletricas': {
                termos: [
                    { termo: 'instalacao eletrica', peso: 3 },
                    { termo: 'rede eletrica', peso: 3 },
                    { termo: 'quadro eletrico', peso: 2 },
                    { termo: 'subestacao', peso: 2 },
                    { termo: 'eletrica', peso: 1 },
                ],
                exclusoes: ['trio eletrico', 'cerca eletrica'],
                scoreMinimo: 3
            },
            'instalacoes hidraulicas': {
                termos: [
                    { termo: 'instalacao hidraulica', peso: 3 },
                    { termo: 'rede hidraulica', peso: 3 },
                    { termo: 'encanamento', peso: 2 },
                    { termo: 'tubulacao', peso: 2 },
                    { termo: 'hidraulica', peso: 1 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },

            // ================================================================
            // CAPACIDADES - OUTRAS ÁREAS
            // ================================================================
            'vigilancia patrimonial': {
                termos: [
                    { termo: 'vigilancia patrimonial', peso: 3 },
                    { termo: 'seguranca patrimonial', peso: 3 },
                    { termo: 'vigilancia armada', peso: 3 },
                    { termo: 'vigilancia desarmada', peso: 3 },
                    { termo: 'vigilancia', peso: 2 },
                    { termo: 'vigilante', peso: 2 },
                ],
                exclusoes: ['seguranca da informacao'],
                scoreMinimo: 3
            },
            'monitoramento cftv': {
                termos: [
                    { termo: 'sistema de cftv', peso: 3 },
                    { termo: 'circuito fechado', peso: 3 },
                    { termo: 'cftv', peso: 3 },
                    { termo: 'camera de seguranca', peso: 2 },
                    { termo: 'monitoramento de video', peso: 2 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },
            'locacao de veiculos': {
                termos: [
                    { termo: 'locacao de veiculo', peso: 3 },
                    { termo: 'aluguel de veiculo', peso: 3 },
                    { termo: 'locacao de automovel', peso: 3 },
                    { termo: 'frota locada', peso: 2 },
                    { termo: 'locacao', peso: 1 },
                ],
                exclusoes: ['locacao de imovel', 'locacao de equipamento'],
                scoreMinimo: 3
            },
            'publicidade': {
                termos: [
                    { termo: 'servico de publicidade', peso: 3 },
                    { termo: 'campanha publicitaria', peso: 3 },
                    { termo: 'agencia de publicidade', peso: 3 },
                    { termo: 'publicidade', peso: 2 },
                    { termo: 'propaganda', peso: 2 },
                    { termo: 'midia', peso: 1 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },
            'producao de eventos': {
                termos: [
                    { termo: 'organizacao de evento', peso: 3 },
                    { termo: 'producao de evento', peso: 3 },
                    { termo: 'cerimonial', peso: 2 },
                    { termo: 'conferencia', peso: 2 },
                    { termo: 'seminario', peso: 2 },
                    { termo: 'evento', peso: 1 },
                ],
                exclusoes: [],
                scoreMinimo: 3
            },
        };

        // Função para calcular score de match usando o sistema de pesos
        const calcularScoreMatch = (capacidade: string, texto: string): { match: boolean; score: number; termosEncontrados: string[] } => {
            const capacidadeNorm = normalizar(capacidade);
            const config = termosConfig[capacidadeNorm];

            if (!config) {
                // Fallback: match direto se não tiver config específica
                const matchDireto = texto.includes(capacidadeNorm);
                return { match: matchDireto, score: matchDireto ? 3 : 0, termosEncontrados: matchDireto ? [capacidade] : [] };
            }

            // Verificar exclusões primeiro
            const temExclusao = config.exclusoes.some(exc => texto.includes(normalizar(exc)));
            if (temExclusao) {
                return { match: false, score: 0, termosEncontrados: [] };
            }

            // Calcular score
            let score = 0;
            const termosEncontrados: string[] = [];

            for (const { termo, peso } of config.termos) {
                if (texto.includes(normalizar(termo))) {
                    score += peso;
                    termosEncontrados.push(termo);
                }
            }

            return {
                match: score >= config.scoreMinimo,
                score,
                termosEncontrados
            };
        };

        // ====================================================================
        // PASSO 1: ÁREA DE ATUAÇÃO (peso 25%)
        // ====================================================================
        if (perfil.areasAtuacao.length > 0) {
            // Primeiro: verificar match exato na categoria da licitação
            const areaExata = perfil.areasAtuacao.includes(licitacao.areaAtuacao);

            // Segundo: verificar se termos da área aparecem no objeto usando scoring
            let melhorScoreArea = 0;
            let melhorAreaMatch = '';

            for (const area of perfil.areasAtuacao) {
                const resultado = calcularScoreMatch(area, objetoNormalizado);
                if (resultado.match && resultado.score > melhorScoreArea) {
                    melhorScoreArea = resultado.score;
                    melhorAreaMatch = area;
                }
            }

            if (areaExata) {
                fatores.area = 100;
                destaques.push(`✓ Área: ${licitacao.areaAtuacao}`);
            } else if (melhorScoreArea >= 3) {
                // Score alto = match forte
                fatores.area = Math.min(90, 60 + melhorScoreArea * 5);
                destaques.push(`✓ Área relacionada: ${melhorAreaMatch}`);
            } else {
                fatores.area = 0;
            }
        } else {
            fatores.area = 50;
        }

        // ====================================================================
        // PASSO 2: CAPACIDADES (peso 35% - O MAIS IMPORTANTE)
        // ====================================================================
        const capacidadesMatchInfo: { capacidade: string; score: number }[] = [];

        if (perfil.capacidades.length > 0) {
            for (const capacidade of perfil.capacidades) {
                // Verificar no objeto da licitação
                const resultadoObjeto = calcularScoreMatch(capacidade, objetoNormalizado);

                // Verificar nas categorias
                let resultadoCategorias = { match: false, score: 0, termosEncontrados: [] as string[] };
                for (const cat of categoriasNormalizadas) {
                    const res = calcularScoreMatch(capacidade, cat);
                    if (res.score > resultadoCategorias.score) {
                        resultadoCategorias = res;
                    }
                }

                const melhorScore = Math.max(resultadoObjeto.score, resultadoCategorias.score);
                const match = resultadoObjeto.match || resultadoCategorias.match;

                if (match) {
                    capacidadesMatchInfo.push({ capacidade, score: melhorScore });
                }
            }

            // Ordenar por score e pegar os melhores
            capacidadesMatchInfo.sort((a, b) => b.score - a.score);

            // Calcular score baseado em quantas capacidades bateram E qual o score delas
            if (capacidadesMatchInfo.length === 0) {
                fatores.capacidades = 0;
            } else {
                // Score médio das capacidades que bateram + bônus por quantidade
                const scoreTotal = capacidadesMatchInfo.reduce((acc, c) => acc + c.score, 0);
                const scoreMedio = scoreTotal / capacidadesMatchInfo.length;
                const bonusQuantidade = Math.min(capacidadesMatchInfo.length * 10, 30);

                fatores.capacidades = Math.min(100, Math.round(scoreMedio * 10 + bonusQuantidade));
            }

            // Adicionar capacidades aos destaques
            capacidadesMatchInfo.slice(0, 2).forEach(c => {
                destaques.push(`✓ ${c.capacidade}`);
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
