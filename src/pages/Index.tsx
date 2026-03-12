import { AppProvider, useApp } from '@/contexts/AppContext';
import Sidebar from '@/components/layout/Sidebar';
import AlertContainer from '@/components/layout/AlertContainer';
import DashboardPage from '@/pages/DashboardPage';
import CasesPage from '@/pages/CasesPage';
import PlaceholderPage from '@/pages/PlaceholderPage';

function MainContent() {
  const { activePage } = useApp();

  const pageMap: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage />,
    casos: <CasesPage />,
    cronograma: <PlaceholderPage title="Cronograma Anual" />,
    checklist: <PlaceholderPage title="Checklist de Inspeção" />,
    risco: <PlaceholderPage title="Avaliação de Risco" />,
    busca: <PlaceholderPage title="Busca Integrada" />,
    analise: <PlaceholderPage title="Análise & Insights" />,
    drones: <PlaceholderPage title="Missões de Drone" />,
    confidencial: <PlaceholderPage title="Operações Confidenciais" />,
    logs: <PlaceholderPage title="Logs de Atividade" />,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto synapse-scrollbar">
        <div className="bg-warning/10 border-l-4 border-warning text-warning p-4 rounded-r-lg mb-6">
          <p className="font-bold">⚠️ MODO OFFLINE ATIVADO</p>
          <p className="text-sm opacity-80">Todos os dados estão sendo salvos localmente neste navegador. Não há backup na nuvem.</p>
        </div>
        {pageMap[activePage] || <DashboardPage />}
      </main>
      <AlertContainer />
    </div>
  );
}

export default function Index() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
