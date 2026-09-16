import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { localDB, DB_KEYS, CaseData, USERS, UserProfile, logActivity } from '@/lib/localDB';
import { markForSync } from '@/lib/syncService';

interface AlertMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface UserProfileSettings {
  name: string;
  role: string;
  unit?: string;
  icon: string;
  accentColor?: string;
  avatarUrl?: string;
}

const PROFILE_KEY = 'synapse_profile_v1';

function loadProfile(): UserProfileSettings {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...USERS[0], accentColor: 'cyan', ...JSON.parse(raw) };
  } catch (e) {
    console.error('Erro ao carregar perfil:', e);
  }
  return { ...USERS[0], accentColor: 'cyan' };
}

interface AppContextType {
  currentUser: UserProfileSettings;
  currentUserIndex: number;
  switchUser: (index: number) => void;
  updateProfile: (profile: UserProfileSettings) => void;
  cases: CaseData[];
  refreshCases: () => void;
  addCase: (data: CaseData) => void;
  updateCase: (data: CaseData) => void;
  deleteCase: (id: string) => void;
  alerts: AlertMessage[];
  showAlert: (message: string, type?: AlertMessage['type']) => void;
  log: (action: string) => void;
  activePage: string;
  setActivePage: (page: string) => void;
  // === NOVA FUNCIONALIDADE: Busca → navegar e abrir item ===
  pendingItem: { module: string; id: string } | null;
  openItem: (module: string, id: string) => void;
  clearPendingItem: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [cases, setCases] = useState<CaseData[]>([]);
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [activePage, setActivePage] = useState('dashboard');
  const [pendingItem, setPendingItem] = useState<{ module: string; id: string } | null>(null);

  const [profile, setProfile] = useState<UserProfileSettings>(() => loadProfile());
  const currentUser = profile;

  const updateProfile = useCallback((next: UserProfileSettings) => {
    setProfile(next);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('Erro ao salvar perfil:', e);
    }
  }, []);

  const refreshCases = useCallback(() => {
    setCases(localDB.load<CaseData>(DB_KEYS.occurrences));
  }, []);

  useEffect(() => {
    refreshCases();
  }, [refreshCases]);

  const showAlert = useCallback((message: string, type: AlertMessage['type'] = 'info') => {
    const id = crypto.randomUUID();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 4000);
  }, []);

  const log = useCallback((action: string) => {
    const entry = logActivity(currentUser.name, action);
    // === SYNC SUPABASE === marca log para sync
    markForSync(DB_KEYS.activityLogs, entry.id!);
  }, [currentUser.name]);

  const switchUser = useCallback((index: number) => {
    setCurrentUserIndex(index);
  }, []);

  const addCase = useCallback((data: CaseData) => {
    localDB.add(DB_KEYS.occurrences, data);
    refreshCases();
    log(`Criou novo caso: ${data.displayId}`);
    showAlert('Novo caso salvo com sucesso!', 'success');
    // === SYNC SUPABASE ===
    markForSync(DB_KEYS.occurrences, data.id);
  }, [refreshCases, log, showAlert]);

  const updateCase = useCallback((data: CaseData) => {
    localDB.update(DB_KEYS.occurrences, data);
    refreshCases();
    log(`Atualizou caso: ${data.displayId}`);
    showAlert('Caso atualizado com sucesso!', 'success');
    // === SYNC SUPABASE ===
    markForSync(DB_KEYS.occurrences, data.id);
  }, [refreshCases, log, showAlert]);

  const deleteCase = useCallback((id: string) => {
    const caseItem = cases.find(c => c.id === id);
    localDB.delete(DB_KEYS.occurrences, id);
    refreshCases();
    if (caseItem) {
      log(`Excluiu caso: ${caseItem.displayId}`);
      showAlert('Caso excluído.', 'warning');
    }
  }, [cases, refreshCases, log, showAlert]);

  // === NOVA FUNCIONALIDADE: Busca → abrir item específico em outro módulo ===
  const openItem = useCallback((module: string, id: string) => {
    setPendingItem({ module, id });
    setActivePage(module);
  }, []);
  const clearPendingItem = useCallback(() => setPendingItem(null), []);

  return (
    <AppContext.Provider value={{
      currentUser, currentUserIndex, switchUser,
      cases, refreshCases, addCase, updateCase, deleteCase,
      alerts, showAlert, log,
      activePage, setActivePage,
      pendingItem, openItem, clearPendingItem,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
