import { AppProvider, useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import AlertContainer from '@/components/layout/AlertContainer';
import SyncStatusBar from '@/components/layout/SyncStatusBar';
import AuthPage from '@/pages/AuthPage';
import DashboardPage from '@/pages/DashboardPage';
import CasesPage from '@/pages/CasesPage';
import ChecklistPage from '@/pages/ChecklistPage';
import RiskPage from '@/pages/RiskPage';
import SchedulePage from '@/pages/SchedulePage';
import SearchPage from '@/pages/SearchPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
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
    logs: <LogsPage />,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 pb-14 overflow-y-auto synapse-scrollbar">
        {pageMap[activePage] || <DashboardPage />}
      </main>
      <AlertContainer />
      <SyncStatusBar />
    </div>
  );
}

function AuthenticatedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default function Index() {
  return <AuthenticatedApp />;
}
