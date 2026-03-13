import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { localDB, DB_KEYS, formatDate } from '@/lib/localDB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Plus, Trash2, CheckCircle } from 'lucide-react';

interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  endDate: string;
  type: string;
  local: string;
  responsible: string;
  status: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado';
  createdBy: string;
  createdAt: string;
}

const EVENT_TYPES = ['Inspeção', 'Treinamento', 'Auditoria', 'Reunião', 'Manutenção', 'Simulado', 'Outro'];
const STATUS_LABELS: Record<string, string> = {
  agendado: 'Agendado', em_andamento: 'Em Andamento', concluido: 'Concluído', cancelado: 'Cancelado',
};
const STATUS_COLORS: Record<string, string> = {
  agendado: 'bg-info/20 text-info', em_andamento: 'bg-warning/20 text-warning',
  concluido: 'bg-success/20 text-success', cancelado: 'bg-destructive/20 text-destructive',
};

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function SchedulePage() {
  const { currentUser, showAlert } = useApp();
  const [events, setEvents] = useState<ScheduleEvent[]>(() => localDB.load<ScheduleEvent>(DB_KEYS.schedules));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', date: '', endDate: '', type: EVENT_TYPES[0], local: '', responsible: '',
  });

  const refresh = () => setEvents(localDB.load<ScheduleEvent>(DB_KEYS.schedules));
  const year = new Date().getFullYear();

  const handleCreate = () => {
    if (!form.title.trim() || !form.date) { showAlert('Preencha título e data.', 'warning'); return; }
    const ev: ScheduleEvent = {
      id: crypto.randomUUID(), ...form,
      status: 'agendado', createdBy: currentUser.name, createdAt: new Date().toISOString(),
    };
    localDB.add(DB_KEYS.schedules, ev);
    showAlert('Evento adicionado!', 'success');
    setForm({ title: '', description: '', date: '', endDate: '', type: EVENT_TYPES[0], local: '', responsible: '' });
    setShowForm(false);
    refresh();
  };

  const updateStatus = (ev: ScheduleEvent, status: ScheduleEvent['status']) => {
    localDB.update(DB_KEYS.schedules, { ...ev, status });
    refresh();
  };

  const handleDelete = (id: string) => { localDB.delete(DB_KEYS.schedules, id); refresh(); showAlert('Evento removido.', 'warning'); };

  // Group by month
  const byMonth = useMemo(() => {
    const map: Record<number, ScheduleEvent[]> = {};
    events.forEach(ev => {
      const m = new Date(ev.date + 'T00:00:00').getMonth();
      if (!map[m]) map[m] = [];
      map[m].push(ev);
    });
    return map;
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="w-7 h-7 text-primary" /> Cronograma Anual {year}
        </h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" /> Novo Evento</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Adicionar Evento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="text-sm text-muted-foreground">Título</label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><label className="text-sm text-muted-foreground">Tipo</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select></div>
              <div><label className="text-sm text-muted-foreground">Local</label>
                <Input value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="text-sm text-muted-foreground">Data Início</label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><label className="text-sm text-muted-foreground">Data Fim</label>
                <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
              <div><label className="text-sm text-muted-foreground">Responsável</label>
                <Input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} /></div>
            </div>
            <div><label className="text-sm text-muted-foreground">Descrição</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]" /></div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Salvar</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline by month */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {MONTHS.map((m, i) => {
          const monthEvents = byMonth[i] || [];
          return (
            <Card key={i} className={monthEvents.length > 0 ? 'border-primary/30' : ''}>
              <CardContent className="p-3">
                <p className="font-bold text-sm text-center mb-2">{m}</p>
                {monthEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center">—</p>
                ) : (
                  <div className="space-y-1">
                    {monthEvents.map(ev => (
                      <div key={ev.id} className="text-xs p-1 rounded bg-secondary/50 truncate" title={ev.title}>
                        <Badge className={`${STATUS_COLORS[ev.status]} text-[10px] px-1`}>{ev.type}</Badge>
                        <p className="truncate mt-0.5">{ev.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed list */}
      <div className="space-y-3">
        {events.sort((a, b) => a.date.localeCompare(b.date)).map(ev => (
          <Card key={ev.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{ev.type}</Badge>
                  <Badge className={STATUS_COLORS[ev.status]}>{STATUS_LABELS[ev.status]}</Badge>
                </div>
                <p className="font-semibold">{ev.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(ev.date)}{ev.endDate ? ` → ${formatDate(ev.endDate)}` : ''} • {ev.local} • {ev.responsible}
                </p>
              </div>
              <div className="flex gap-2">
                <select value={ev.status} onChange={e => updateStatus(ev, e.target.value as any)}
                  className="text-sm rounded border border-input bg-background px-2 py-1">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(ev.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
