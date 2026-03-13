import { AppProvider, useApp } from '@/contexts/AppContext';
import Sidebar from '@/components/layout/Sidebar';
import AlertContainer from '@/components/layout/AlertContainer';
import DashboardPage from '@/pages/DashboardPage';
import CasesPage from '@/pages/CasesPage';
import ChecklistPage from '@/pages/ChecklistPage';
import RiskPage from '@/pages/RiskPage';
import SchedulePage from '@/pages/SchedulePage';
import SearchPage from '@/pages/SearchPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import DronesPage from '@/pages/DronesPage';
import ConfidentialPage from '@/pages/ConfidentialPage';
import LogsPage from '@/pages/LogsPage';

function MainContent() {
  const { activePage } = useApp();

  const pageMap: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage />,
    casos: <CasesPage />,
    cronograma: <SchedulePage />,
    checklist: <ChecklistPage />,
    risco: <RiskPage />,
    busca: <SearchPage />,
    analise: <AnalyticsPage />,
    drones: <DronesPage />,
    confidencial: <ConfidentialPage />,
    logs: <LogsPage />,
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
