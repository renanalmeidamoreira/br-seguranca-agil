// === NOVA FUNCIONALIDADE: FILTROS GLOBAIS ===
// Filtros aplicados em KPIs, gráficos do dashboard e mapa de calor.
import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import type { CaseData } from '@/lib/localDB';

export interface GlobalFilters {
  year: string;        // 'all' | '2024' ...
  unit: string;        // 'all' | nome da unidade
  type: string;        // 'all' | tipo de ocorrência
  status: string;      // 'all' | status
}

const DEFAULT_FILTERS: GlobalFilters = {
  year: 'all',
  unit: 'all',
  type: 'all',
  status: 'all',
};

interface GlobalFiltersContextType {
  filters: GlobalFilters;
  setFilter: <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => void;
  resetFilters: () => void;
  applyFilters: (cases: CaseData[]) => CaseData[];
  hasActiveFilters: boolean;
}

const GlobalFiltersContext = createContext<GlobalFiltersContextType | null>(null);

export function GlobalFiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<GlobalFilters>(DEFAULT_FILTERS);

  const setFilter = useCallback(<K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const applyFilters = useCallback((cases: CaseData[]) => {
    return cases.filter(c => {
      if (filters.year !== 'all') {
        const m = (c.DATA || '').match(/(\d{4})/);
        if (!m || m[1] !== filters.year) return false;
      }
      if (filters.unit !== 'all' && (c.UNIDADE || '') !== filters.unit) return false;
      if (filters.type !== 'all' && (c.TIPO_DE_OCORRÊNCIA || '') !== filters.type) return false;
      if (filters.status !== 'all' && (c.STATUS || '') !== filters.status) return false;
      return true;
    });
  }, [filters]);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some(v => v !== 'all'),
    [filters]
  );

  return (
    <GlobalFiltersContext.Provider value={{ filters, setFilter, resetFilters, applyFilters, hasActiveFilters }}>
      {children}
    </GlobalFiltersContext.Provider>
  );
}

export function useGlobalFilters() {
  const ctx = useContext(GlobalFiltersContext);
  if (!ctx) throw new Error('useGlobalFilters must be used within GlobalFiltersProvider');
  return ctx;
}
