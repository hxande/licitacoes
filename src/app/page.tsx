'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Filtros } from '@/components/Filtros';
import { ListaLicitacoes } from '@/components/ListaLicitacoes';
import { ModalPerfilEmpresa } from '@/components/ModalPerfilEmpresa';
import { ModalResumoEdital } from '@/components/ModalResumoEdital';
import { useLicitacoes } from '@/hooks/useLicitacoes';
import { useFavoritos } from '@/hooks/useFavoritos';
import { usePerfilEmpresa } from '@/hooks/usePerfilEmpresa';
import { useAuthContext } from '@/contexts/AuthContext';
import { Building2, Target, Zap, Heart, BarChart3, UserCog, Sparkles, Kanban, User, Loader2, FileUp, BrainCircuit } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { usuario, carregando: carregandoAuth, autenticado } = useAuthContext();
  const { licitacoes, loading, error, meta, buscar, carregarMais, irParaPagina } = useLicitacoes();
  const { favoritos, toggleFavorito, totalFavoritos } = useFavoritos();
  const { perfil, salvarPerfil, limparPerfil, calcularMatch, temPerfil, loaded } = usePerfilEmpresa();
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [modalResumoAberto, setModalResumoAberto] = useState(false);

  // Redirecionar para login se não autenticado
  useEffect(() => {
    if (!carregandoAuth && !autenticado) {
      router.push('/login');
    }
  }, [carregandoAuth, autenticado, router]);

  useEffect(() => {
    if (!autenticado) return;

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 15);

    buscar({
      dataInicio: startDate.toISOString().split('T')[0],
      dataFim: today.toISOString().split('T')[0],
    });
  }, [buscar, autenticado]);

  // Calcular matches para todas as licitações
  const licitacoesComMatch = licitacoes.map(l => ({
    ...l,
    match: calcularMatch(l),
  }));

  // Contar licitações com bom match
  const licitacoesComBomMatch = licitacoesComMatch.filter(l => l.match && l.match.percentual >= 60).length;

  // Loading de autenticação
  if (carregandoAuth || !autenticado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Licitações Brasil
                </h1>
                <p className="text-gray-500">
                  Encontre oportunidades de licitações públicas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setModalResumoAberto(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-12 min-w-[130px] bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition text-sm font-medium shadow-sm"
              >
                <FileUp className="w-4 h-4" />
                Resumir PDF
              </button>
              <button
                onClick={() => setModalPerfilAberto(true)}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 h-12 min-w-[130px] rounded-lg transition text-sm font-medium shadow-sm ${temPerfil
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
              >
                <UserCog className="w-4 h-4" />
                {temPerfil ? 'Perfil Empresa' : 'Config. Perfil'}
              </button>
              <Link
                href="/pipeline"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-12 min-w-[130px] bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition text-sm font-medium shadow-sm"
              >
                <Kanban className="w-4 h-4" />
                Acompanhar
              </Link>
              <Link
                href="/recomendacoes"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-12 min-w-[130px] bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition text-sm font-medium shadow-sm"
              >
                <BrainCircuit className="w-4 h-4" />
                IA Recomenda
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-12 min-w-[130px] bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition text-sm font-medium shadow-sm"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </Link>
              {/* Botão Perfil Usuário */}
              <Link
                href="/perfil"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-12 min-w-[130px] bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium shadow-sm"
                title="Meu Perfil"
              >
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {usuario?.nome?.charAt(0).toUpperCase() || usuario?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-gray-700">
                  {usuario?.nome?.split(' ')[0] || 'Perfil'}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Banner de Match se tiver perfil */}
        {temPerfil && licitacoesComBomMatch > 0 && (
          <div className="mb-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-lg">
                  {licitacoesComBomMatch} licitações com bom match para sua empresa!
                </p>
                <p className="text-green-100 text-sm">
                  Baseado no perfil de {perfil?.nomeEmpresa || 'sua empresa'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Banner para configurar perfil se não tiver */}
        {loaded && !temPerfil && (
          <div className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <UserCog className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-lg">
                    Configure o perfil da sua empresa
                  </p>
                  <p className="text-blue-100 text-sm">
                    Receba sugestões personalizadas com % de compatibilidade
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalPerfilAberto(true)}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition"
              >
                Configurar Agora
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{meta.totalFiltrado}</p>
                <p className="text-sm text-gray-500">Licitações encontradas</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {licitacoesComBomMatch || licitacoes.filter(l =>
                    l.situacao.toLowerCase().includes('aberto') ||
                    l.situacao.toLowerCase().includes('aberta')
                  ).length}
                </p>
                <p className="text-sm text-gray-500">
                  {temPerfil ? 'Bom match (≥60%)' : 'Propostas abertas'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(licitacoes.map(l => l.uf)).size}
                </p>
                <p className="text-sm text-gray-500">Estados com licitações</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-pink-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Heart className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-600">{totalFavoritos}</p>
                <p className="text-sm text-gray-500">Licitações favoritas</p>
              </div>
            </div>
          </div>
        </div>

        <Filtros onBuscar={buscar} loading={loading} />

        <ListaLicitacoes
          licitacoes={licitacoesComMatch}
          loading={loading}
          error={error}
          meta={meta}
          onCarregarMais={carregarMais}
          onIrParaPagina={irParaPagina}
          favoritos={favoritos}
          onToggleFavorito={toggleFavorito}
          perfil={perfil}
        />
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
