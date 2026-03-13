import { useState, useMemo } from 'react';
import { localDB, DB_KEYS, CaseData, formatDate } from '@/lib/localDB';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    const cases = localDB.load<CaseData>(DB_KEYS.occurrences);
    const checklists = localDB.load<any>(DB_KEYS.checklists);
    const risks = localDB.load<any>(DB_KEYS.risks);
    const schedules = localDB.load<any>(DB_KEYS.schedules);
    const logs = localDB.load<any>(DB_KEYS.activityLogs);

    const found: { type: string; id: string; title: string; detail: string }[] = [];

    cases.forEach(c => {
      const text = `${c.displayId} ${c.DESCRIÇÃO_DA_OCORRÊNCIA} ${c.LOCAL} ${c.CLIENTE_DA_OCORRÊNCIA} ${c.TIPO_DE_OCORRÊNCIA}`.toLowerCase();
      if (text.includes(q)) found.push({ type: 'Caso', id: c.displayId, title: c.DESCRIÇÃO_DA_OCORRÊNCIA?.slice(0, 80) || c.displayId, detail: `${c.LOCAL} • ${c.STATUS}` });
    });
    checklists.forEach((c: any) => {
      const text = `${c.displayId} ${c.title} ${c.local}`.toLowerCase();
      if (text.includes(q)) found.push({ type: 'Checklist', id: c.displayId, title: c.title, detail: c.local });
    });
    risks.forEach((r: any) => {
      const text = `${r.displayId} ${r.title} ${r.description} ${r.category}`.toLowerCase();
      if (text.includes(q)) found.push({ type: 'Risco', id: r.displayId, title: r.title, detail: `${r.category} • GUT: ${r.gut}` });
    });
    schedules.forEach((s: any) => {
      const text = `${s.title} ${s.type} ${s.local}`.toLowerCase();
      if (text.includes(q)) found.push({ type: 'Evento', id: s.id.slice(0, 8), title: s.title, detail: `${s.type} • ${formatDate(s.date)}` });
    });
    logs.forEach((l: any) => {
      const text = `${l.action} ${l.user}`.toLowerCase();
      if (text.includes(q)) found.push({ type: 'Log', id: '', title: l.action, detail: l.user });
    });

    return found.slice(0, 50);
  }, [query]);

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
          <Card key={i} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-3 flex items-center gap-3">
              <Badge variant="outline" className="shrink-0">{r.type}</Badge>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.id ? `${r.id} — ` : ''}{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
