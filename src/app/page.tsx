'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Filtros } from '@/components/Filtros';
import { ListaLicitacoes } from '@/components/ListaLicitacoes';
import { ModalPerfilEmpresa } from '@/components/ModalPerfilEmpresa';
import { ModalResumoEdital } from '@/components/ModalResumoEdital';
import { useLicitacoes } from '@/hooks/useLicitacoes';
import { useFavoritos } from '@/hooks/useFavoritos';
import { usePipeline } from '@/hooks/usePipeline';
import { usePerfilEmpresa } from '@/hooks/usePerfilEmpresa';
import { useAlertas } from '@/hooks/useAlertas';
import { useAuthContext } from '@/contexts/AuthContext';
import { FiltrosLicitacao } from '@/types/licitacao';
import { FiltrosAlerta } from '@/types/alerta';
import { Building2, Target, Zap, Heart, BarChart3, UserCog, Sparkles, Kanban, Loader2, FileUp, BrainCircuit, Search, Bell, Check } from 'lucide-react';
import { NotificacaoBell } from '@/components/NotificacaoBell';

export default function Home() {
  const router = useRouter();
  const { usuario, carregando: carregandoAuth, autenticado } = useAuthContext();
  const { licitacoes, loading, error, meta, buscar, carregarMais, irParaPagina } = useLicitacoes();
  const { favoritos, toggleFavorito, totalFavoritos, loaded: favoritosLoaded } = useFavoritos();
  const { licitacoes: pipelineLicitacoes, adicionarAoPipeline, carregado: pipelineLoaded } = usePipeline();
  const { perfil, salvarPerfil, limparPerfil, calcularMatch, temPerfil, loaded } = usePerfilEmpresa();
  const { criarAlerta } = useAlertas();
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [modalResumoAberto, setModalResumoAberto] = useState(false);
  const [jaCarregou, setJaCarregou] = useState(false);
  const [ultimosFiltros, setUltimosFiltros] = useState<FiltrosLicitacao | null>(null);
  const [alertaSalvo, setAlertaSalvo] = useState(false);

  // Criar Set de IDs do pipeline para verificação rápida
  const pipelineIds = useMemo(() =>
    new Set(pipelineLicitacoes.map(l => l.id)),
    [pipelineLicitacoes]
  );

  // Redirecionar para login se não autenticado
  useEffect(() => {
    if (!carregandoAuth && !autenticado) {
      router.push('/login');
    }
  }, [carregandoAuth, autenticado, router]);

  const handleBuscar = (filtros: Parameters<typeof buscar>[0]) => {
    setJaCarregou(true);
    setUltimosFiltros(filtros);
    setAlertaSalvo(false);
    buscar(filtros);
  };

  const salvarComoAlerta = async () => {
    if (!ultimosFiltros) return;
    const filtrosAlerta: FiltrosAlerta = {};
    if (ultimosFiltros.termo) filtrosAlerta.palavrasChave = [ultimosFiltros.termo];
    if (ultimosFiltros.uf) filtrosAlerta.regioes = [ultimosFiltros.uf];
    if (ultimosFiltros.modalidade) filtrosAlerta.modalidades = [ultimosFiltros.modalidade];
    if (ultimosFiltros.valorMaximo) filtrosAlerta.valorMax = ultimosFiltros.valorMaximo;
    const partes: string[] = [];
    if (ultimosFiltros.termo) partes.push(ultimosFiltros.termo);
    if (ultimosFiltros.uf) partes.push(ultimosFiltros.uf);
    if (ultimosFiltros.modalidade === '8') partes.push('Dispensa');
    else if (ultimosFiltros.modalidade === '6') partes.push('Pregão');
    if (ultimosFiltros.area) partes.push(ultimosFiltros.area);
    const nome = partes.length > 0 ? partes.join(' · ') : 'Todas as licitações';
    await criarAlerta({ nome, filtros: filtrosAlerta, periodicidade: 'diario' });
    setAlertaSalvo(true);
  };

  // Calcular matches para todas as licitações (memoized - calcularMatch is expensive)
  const licitacoesComMatch = useMemo(() =>
    licitacoes.map(l => ({ ...l, match: calcularMatch(l) })),
    [licitacoes, calcularMatch]
  );

  // Contar licitações com bom match
  const licitacoesComBomMatch = useMemo(() =>
    licitacoesComMatch.filter(l => l.match && l.match.percentual >= 60).length,
    [licitacoesComMatch]
  );

  // Loading de autenticação
  if (carregandoAuth || !autenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center gap-4">
        <img src="/logo/licitaly-icon.svg" alt="Licitaly" className="w-16 h-16 animate-pulse" />
        <Loader2 className="w-6 h-6 text-[#0D4F8B] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo/licitaly-full.svg" alt="Licitaly" className="h-12 w-auto" />
              <div className="hidden sm:block border-l border-gray-200 pl-3">
                <p className="text-sm text-gray-500">
                  Encontre oportunidades de licitações públicas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Resumir PDF — icon-only on mobile */}
              <button
                onClick={() => setModalResumoAberto(true)}
                className="inline-flex items-center justify-center gap-2 px-2.5 sm:px-4 py-2.5 h-10 sm:h-12 sm:min-w-[130px] bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition text-sm font-medium shadow-sm"
                title="Resumir PDF"
              >
                <FileUp className="w-4 h-4" />
                <span className="hidden sm:inline">Resumir PDF</span>
              </button>
              {/* Config. Perfil — icon-only on mobile */}
              <button
                onClick={() => setModalPerfilAberto(true)}
                className={`inline-flex items-center justify-center gap-2 px-2.5 sm:px-4 py-2.5 h-10 sm:h-12 sm:min-w-[130px] rounded-lg transition text-sm font-medium shadow-sm ${temPerfil
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                title={temPerfil ? 'Perfil Empresa' : 'Config. Perfil'}
              >
                <UserCog className="w-4 h-4" />
                <span className="hidden sm:inline">{temPerfil ? 'Perfil Empresa' : 'Config. Perfil'}</span>
              </button>
              {/* Acompanhar — icon-only on mobile */}
              <Link
                href="/pipeline"
                className="inline-flex items-center justify-center gap-2 px-2.5 sm:px-4 py-2.5 h-10 sm:h-12 sm:min-w-[130px] bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition text-sm font-medium shadow-sm"
                title="Acompanhar"
              >
                <Kanban className="w-4 h-4" />
                <span className="hidden sm:inline">Acompanhar</span>
              </Link>
              {/* IA Recomenda — hidden on mobile */}
              <Link
                href="/recomendacoes"
                className="hidden md:inline-flex items-center justify-center gap-2 px-4 py-2.5 h-12 min-w-[130px] bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition text-sm font-medium shadow-sm"
              >
                <BrainCircuit className="w-4 h-4" />
                IA Recomenda
              </Link>
              {/* Dashboard — hidden on mobile */}
              <Link
                href="/dashboard"
                className="hidden md:inline-flex items-center justify-center gap-2 px-4 py-2.5 h-12 min-w-[130px] bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition text-sm font-medium shadow-sm"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </Link>
              <NotificacaoBell />
              {/* Perfil Usuário — icon-only on mobile */}
              <Link
                href="/perfil"
                className="inline-flex items-center justify-center gap-2 px-2.5 sm:px-4 py-2.5 h-10 sm:h-12 sm:min-w-[130px] bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium shadow-sm"
                title="Meu Perfil"
              >
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                  {usuario?.nome?.charAt(0).toUpperCase() || usuario?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline text-gray-700">
                  {usuario?.nome?.split(' ')[0] || 'Perfil'}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filtros sempre visíveis */}
        <Filtros onBuscar={handleBuscar} loading={loading} />

        {/* Estado: ainda não pesquisou */}
        {!jaCarregou && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5">
              <Search className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Pronto para buscar licitações
            </h2>
            <p className="text-gray-500 max-w-md text-sm leading-relaxed">
              Selecione as fontes e o período acima, adicione um termo opcional e clique em{' '}
              <span className="font-medium text-blue-600">Pesquisar</span>.
            </p>
            {loaded && !temPerfil && (
              <button
                onClick={() => setModalPerfilAberto(true)}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium shadow-sm"
              >
                <UserCog className="w-4 h-4" />
                Configure o perfil para ver % de match
              </button>
            )}
            {temPerfil && (
              <p className="mt-4 text-xs text-green-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Perfil configurado — os resultados virão com % de compatibilidade
              </p>
            )}
          </div>
        )}

        {/* Resultados após pesquisa */}
        {jaCarregou && (
          <>
            {/* Banner match */}
            {temPerfil && licitacoesComBomMatch > 0 && (
              <div className="mb-5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">
                      {licitacoesComBomMatch} licitações com bom match para sua empresa
                    </p>
                    <p className="text-green-100 text-sm">
                      Baseado no perfil de {perfil?.nomeEmpresa || 'sua empresa'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Target className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{meta.totalFiltrado}</p>
                    <p className="text-xs text-gray-500">Encontradas</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Zap className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">
                      {licitacoesComBomMatch || licitacoes.filter(l =>
                        l.situacao.toLowerCase().includes('aberto') ||
                        l.situacao.toLowerCase().includes('aberta')
                      ).length}
                    </p>
                    <p className="text-xs text-gray-500">
                      {temPerfil ? 'Bom match (≥60%)' : 'Abertas'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">
                      {new Set(licitacoes.map(l => l.uf)).size}
                    </p>
                    <p className="text-xs text-gray-500">Estados</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-pink-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-50 rounded-lg">
                    <Heart className="w-4 h-4 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-pink-600">{totalFavoritos}</p>
                    <p className="text-xs text-gray-500">Favoritas</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Salvar busca como alerta */}
            {!loading && ultimosFiltros && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={salvarComoAlerta}
                  disabled={alertaSalvo}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${alertaSalvo
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-white border border-gray-200 text-gray-500 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600'
                    }`}
                >
                  {alertaSalvo
                    ? <><Check className="w-3.5 h-3.5" /> Alerta salvo!</>
                    : <><Bell className="w-3.5 h-3.5" /> Salvar alerta</>
                  }
                </button>
              </div>
            )}

            <ListaLicitacoes
              licitacoes={licitacoesComMatch}
              loading={loading || !favoritosLoaded || !pipelineLoaded}
              error={error}
              meta={meta}
              onCarregarMais={carregarMais}
              onIrParaPagina={irParaPagina}
              favoritos={favoritos}
              onToggleFavorito={toggleFavorito}
              perfil={perfil}
              pipelineIds={pipelineIds}
              onAdicionarPipeline={adicionarAoPipeline}
            />
          </>
        )}
      </div>

      <footer className="bg-white border-t border-gray-100 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>
            Dados obtidos do <a href="https://pncp.gov.br" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Portal Nacional de Contratações Públicas (PNCP)</a>
          </p>
          <p className="mt-1">
            Desenvolvido para empresas que desejam participar de licitações públicas
          </p>
        </div>
      </footer>

      {/* Modal de Perfil */}
      <ModalPerfilEmpresa
        isOpen={modalPerfilAberto}
        onClose={() => setModalPerfilAberto(false)}
        perfilAtual={perfil}
        onSalvar={salvarPerfil}
        onLimpar={limparPerfil}
      />

      {/* Modal de Resumo de Edital */}
      <ModalResumoEdital
        isOpen={modalResumoAberto}
        onClose={() => setModalResumoAberto(false)}
      />
    </div>
  );
}
