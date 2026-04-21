// === NOVA FUNCIONALIDADE: FILTROS GLOBAIS (UI) ===
import { useMemo } from 'react';
import { useGlobalFilters } from '@/contexts/GlobalFiltersContext';
import type { CaseData } from '@/lib/localDB';
import { X, Filter } from 'lucide-react';

interface Props {
  cases: CaseData[];
}

function uniqueValues(cases: CaseData[], key: keyof CaseData): string[] {
  const set = new Set<string>();
  cases.forEach(c => {
    const v = (c[key] as unknown as string) || '';
    if (v.trim()) set.add(v.trim());
  });
  return Array.from(set).sort();
}

export default function GlobalFiltersBar({ cases }: Props) {
  const { filters, setFilter, resetFilters, hasActiveFilters } = useGlobalFilters();

  const years = useMemo(() => {
    const set = new Set<string>();
    cases.forEach(c => {
      const m = (c.DATA || '').match(/(\d{4})/);
      if (m) set.add(m[1]);
    });
    return Array.from(set).sort().reverse();
  }, [cases]);

  const units = useMemo(() => uniqueValues(cases, 'UNIDADE'), [cases]);
  const types = useMemo(() => uniqueValues(cases, 'TIPO_DE_OCORRÊNCIA'), [cases]);
  const statuses = useMemo(() => uniqueValues(cases, 'STATUS'), [cases]);

  return (
    <div className="bg-card border border-border rounded-lg p-3 mb-6 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Filter className="w-4 h-4" />
        Filtros:
      </div>

      <select
        value={filters.year}
        onChange={e => setFilter('year', e.target.value)}
        className="text-sm rounded-md px-2 py-1.5 bg-secondary border border-border text-foreground"
      >
        <option value="all">Todos os anos</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>

      <select
        value={filters.unit}
        onChange={e => setFilter('unit', e.target.value)}
        className="text-sm rounded-md px-2 py-1.5 bg-secondary border border-border text-foreground max-w-[200px]"
      >
        <option value="all">Todas as unidades</option>
        {units.map(u => <option key={u} value={u}>{u}</option>)}
      </select>

      <select
        value={filters.type}
        onChange={e => setFilter('type', e.target.value)}
        className="text-sm rounded-md px-2 py-1.5 bg-secondary border border-border text-foreground max-w-[220px]"
      >
        <option value="all">Todos os tipos</option>
        {types.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <select
        value={filters.status}
        onChange={e => setFilter('status', e.target.value)}
        className="text-sm rounded-md px-2 py-1.5 bg-secondary border border-border text-foreground"
      >
        <option value="all">Todos os status</option>
        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {hasActiveFilters && (
        <button
          onClick={resetFilters}
          className="ml-auto text-xs flex items-center gap-1 px-2 py-1 rounded-md bg-secondary hover:bg-destructive/20 hover:text-destructive transition-colors"
        >
          <X className="w-3 h-3" /> Limpar filtros
        </button>
      )}
    </div>
  );
}
