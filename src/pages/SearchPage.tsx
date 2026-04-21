import { useState, useMemo } from 'react';
import { localDB, DB_KEYS, CaseData, formatDate } from '@/lib/localDB';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowRight } from 'lucide-react';

// === NOVA FUNCIONALIDADE: Resultados clicáveis com navegação ===
const TYPE_TO_MODULE: Record<string, string> = {
  Caso: 'casos',
  Checklist: 'checklist',
  Risco: 'risco',
  Evento: 'cronograma',
  Log: 'logs',
};

interface SearchResult {
  type: string;
  id: string;
  title: string;
  detail: string;
  navigable: boolean;
}

export default function SearchPage() {
  const { openItem, setActivePage } = useApp();
  const [query, setQuery] = useState('');

  const results = useMemo<SearchResult[]>(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    const cases = localDB.load<CaseData>(DB_KEYS.occurrences);
    const checklists = localDB.load<any>(DB_KEYS.checklists);
    const risks = localDB.load<any>(DB_KEYS.risks);
    const schedules = localDB.load<any>(DB_KEYS.schedules);
    const logs = localDB.load<any>(DB_KEYS.activityLogs);

    const found: SearchResult[] = [];

    cases.forEach(c => {
      const text = `${c.displayId} ${c.DESCRIÇÃO_DA_OCORRÊNCIA} ${c.LOCAL} ${c.CLIENTE_DA_OCORRÊNCIA} ${c.TIPO_DE_OCORRÊNCIA}`.toLowerCase();
      if (text.includes(q)) found.push({ type: 'Caso', id: c.displayId, title: c.DESCRIÇÃO_DA_OCORRÊNCIA?.slice(0, 80) || c.displayId, detail: `${c.LOCAL} • ${c.STATUS}`, navigable: true });
    });
    checklists.forEach((c: any) => {
      const text = `${c.displayId} ${c.title} ${c.local}`.toLowerCase();
      if (text.includes(q)) found.push({ type: 'Checklist', id: c.displayId, title: c.title, detail: c.local, navigable: true });
    });
    risks.forEach((r: any) => {
      const text = `${r.displayId} ${r.title || r.fact} ${r.description || ''} ${r.category || ''}`.toLowerCase();
      if (text.includes(q)) found.push({ type: 'Risco', id: r.displayId, title: r.title || r.fact, detail: `${r.plant || r.category || ''} • Prioridade: ${r.priority || r.gut || ''}`, navigable: true });
    });
    schedules.forEach((s: any) => {
      const text = `${s.title} ${s.type} ${s.local}`.toLowerCase();
      if (text.includes(q)) found.push({ type: 'Evento', id: s.id?.slice(0, 8) || '', title: s.title, detail: `${s.type} • ${formatDate(s.date)}`, navigable: true });
    });
    logs.forEach((l: any) => {
      const text = `${l.action} ${l.user}`.toLowerCase();
      if (text.includes(q)) found.push({ type: 'Log', id: '', title: l.action, detail: l.user, navigable: true });
    });

    return found.slice(0, 50);
  }, [query]);

  const handleResultClick = (r: SearchResult) => {
    const module = TYPE_TO_MODULE[r.type];
    if (!module) return;
    if (r.id) {
      openItem(module, r.id);
    } else {
      setActivePage(module);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Search className="w-7 h-7 text-primary" /> Busca Integrada
      </h1>
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar em todos os módulos (casos, checklists, riscos, eventos, logs)..."
          className="pl-10 h-12 text-base"
          autoFocus
        />
      </div>
      {query.length >= 2 && (
        <p className="text-sm text-muted-foreground">{results.length} resultado(s) encontrado(s)</p>
      )}
      <div className="space-y-2">
        {results.map((r, i) => (
          <Card
            key={i}
            onClick={() => handleResultClick(r)}
            className="hover:border-primary/50 hover:bg-secondary/30 transition-colors cursor-pointer group"
          >
            <CardContent className="p-3 flex items-center gap-3">
              <Badge variant="outline" className="shrink-0">{r.type}</Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{r.id ? `${r.id} — ` : ''}{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.detail}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
