import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { localDB, DB_KEYS, formatDate, formatDateTime, generateSequentialDisplayId } from '@/lib/localDB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Plus, Trash2, MapPin } from 'lucide-react';

interface DroneMission {
  id: string;
  displayId: string;
  title: string;
  drone: string;
  pilot: string;
  area: string;
  objective: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'planejada' | 'em_voo' | 'concluida' | 'abortada';
  findings: string;
  createdBy: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  planejada: 'Planejada', em_voo: 'Em Voo', concluida: 'Concluída', abortada: 'Abortada',
};
const STATUS_COLORS: Record<string, string> = {
  planejada: 'bg-info/20 text-info', em_voo: 'bg-warning/20 text-warning',
  concluida: 'bg-success/20 text-success', abortada: 'bg-destructive/20 text-destructive',
};

export default function DronesPage() {
  const { currentUser, showAlert, log } = useApp();
  const [missions, setMissions] = useState<DroneMission[]>(() => localDB.load<DroneMission>(DB_KEYS.droneMissions));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', drone: '', pilot: '', area: '', objective: '', date: '', startTime: '', endTime: '', findings: '',
  });

  const refresh = () => setMissions(localDB.load<DroneMission>(DB_KEYS.droneMissions));

  const handleCreate = () => {
    if (!form.title.trim() || !form.date) { showAlert('Preencha título e data.', 'warning'); return; }
    const all = localDB.load<DroneMission>(DB_KEYS.droneMissions);
    const mission: DroneMission = {
      id: crypto.randomUUID(),
      displayId: generateSequentialDisplayId('DRN', all),
      ...form, status: 'planejada', createdBy: currentUser.name, createdAt: new Date().toISOString(),
    };
    localDB.add(DB_KEYS.droneMissions, mission);
    log(`Criou missão drone: ${mission.displayId}`);
    showAlert('Missão registrada!', 'success');
    setForm({ title: '', drone: '', pilot: '', area: '', objective: '', date: '', startTime: '', endTime: '', findings: '' });
    setShowForm(false);
    refresh();
  };

  const updateStatus = (m: DroneMission, status: DroneMission['status']) => {
    localDB.update(DB_KEYS.droneMissions, { ...m, status });
    refresh();
  };

  const handleDelete = (id: string) => { localDB.delete(DB_KEYS.droneMissions, id); refresh(); showAlert('Missão removida.', 'warning'); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Send className="w-7 h-7 text-primary" /> Missões de Drone
        </h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" /> Nova Missão</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: missions.length, color: 'text-primary' },
          { label: 'Planejadas', value: missions.filter(m => m.status === 'planejada').length, color: 'text-info' },
          { label: 'Em Voo', value: missions.filter(m => m.status === 'em_voo').length, color: 'text-warning' },
          { label: 'Concluídas', value: missions.filter(m => m.status === 'concluida').length, color: 'text-success' },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-4 text-center">
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Nova Missão</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="text-sm text-muted-foreground">Título</label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><label className="text-sm text-muted-foreground">Drone</label>
                <Input value={form.drone} onChange={e => setForm({ ...form, drone: e.target.value })} placeholder="Ex: DJI Mavic 3" /></div>
              <div><label className="text-sm text-muted-foreground">Piloto</label>
                <Input value={form.pilot} onChange={e => setForm({ ...form, pilot: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="text-sm text-muted-foreground">Área</label>
                <Input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} /></div>
              <div><label className="text-sm text-muted-foreground">Data</label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><label className="text-sm text-muted-foreground">Objetivo</label>
                <Input value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Salvar</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {missions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(m => (
          <Card key={m.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-mono text-primary">{m.displayId}</span>
                  <Badge className={STATUS_COLORS[m.status]}>{STATUS_LABELS[m.status]}</Badge>
                </div>
                <p className="font-semibold">{m.title}</p>
                <p className="text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3 inline mr-1" />{m.area} • {m.drone} • {m.pilot} • {formatDate(m.date)}
                </p>
              </div>
              <div className="flex gap-2">
                <select value={m.status} onChange={e => updateStatus(m, e.target.value as any)}
                  className="text-sm rounded border border-input bg-background px-2 py-1">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {missions.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma missão registrada.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
