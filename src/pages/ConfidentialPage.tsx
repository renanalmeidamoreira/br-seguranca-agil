import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { localDB, DB_KEYS, formatDate, generateSequentialDisplayId } from '@/lib/localDB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserX, Plus, Trash2, Lock, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ConfidentialOp {
  id: string;
  displayId: string;
  codename: string;
  objective: string;
  details: string;
  classification: 'confidencial' | 'secreto' | 'ultra_secreto';
  status: 'planejamento' | 'ativa' | 'encerrada' | 'arquivada';
  responsible: string;
  team: string[];
  startDate: string;
  endDate: string;
  createdBy: string;
  createdAt: string;
}

const CLASS_LABELS: Record<string, string> = { confidencial: 'Confidencial', secreto: 'Secreto', ultra_secreto: 'Ultra Secreto' };
const CLASS_COLORS: Record<string, string> = {
  confidencial: 'bg-warning/20 text-warning', secreto: 'bg-destructive/20 text-destructive', ultra_secreto: 'bg-destructive/40 text-destructive',
};
const STATUS_LABELS: Record<string, string> = { planejamento: 'Planejamento', ativa: 'Ativa', encerrada: 'Encerrada', arquivada: 'Arquivada' };

export default function ConfidentialPage() {
  const { currentUser, showAlert, log } = useApp();
  const [ops, setOps] = useState<ConfidentialOp[]>(() => localDB.load<ConfidentialOp>(DB_KEYS.operations));
  const [showForm, setShowForm] = useState(false);
  const [viewOp, setViewOp] = useState<ConfidentialOp | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    codename: '', objective: '', details: '', classification: 'confidencial' as const,
    responsible: '', team: '', startDate: '', endDate: '',
  });

  const refresh = () => setOps(localDB.load<ConfidentialOp>(DB_KEYS.operations));

  const handleCreate = () => {
    if (!form.codename.trim()) { showAlert('Preencha o codinome.', 'warning'); return; }
    const all = localDB.load<ConfidentialOp>(DB_KEYS.operations);
    const op: ConfidentialOp = {
      id: crypto.randomUUID(),
      displayId: generateSequentialDisplayId('OPC', all),
      ...form,
      team: form.team.split(',').map(t => t.trim()).filter(Boolean),
      status: 'planejamento', createdBy: currentUser.name, createdAt: new Date().toISOString(),
    };
    localDB.add(DB_KEYS.operations, op);
    log(`Criou operação confidencial: ${op.displayId}`);
    showAlert('Operação registrada!', 'success');
    setForm({ codename: '', objective: '', details: '', classification: 'confidencial', responsible: '', team: '', startDate: '', endDate: '' });
    setShowForm(false);
    refresh();
  };

  const toggleReveal = (id: string) => {
    const n = new Set(revealed);
    n.has(id) ? n.delete(id) : n.add(id);
    setRevealed(n);
  };

  const updateStatus = (op: ConfidentialOp, status: ConfidentialOp['status']) => {
    localDB.update(DB_KEYS.operations, { ...op, status });
    refresh();
  };

  const handleDelete = (id: string) => { localDB.delete(DB_KEYS.operations, id); refresh(); showAlert('Operação removida.', 'warning'); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserX className="w-7 h-7 text-primary" /> Operações Confidenciais
        </h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" /> Nova Operação</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: ops.length, color: 'text-primary' },
          { label: 'Ativas', value: ops.filter(o => o.status === 'ativa').length, color: 'text-warning' },
          { label: 'Encerradas', value: ops.filter(o => o.status === 'encerrada').length, color: 'text-success' },
          { label: 'Ultra Secreto', value: ops.filter(o => o.classification === 'ultra_secreto').length, color: 'text-destructive' },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-4 text-center">
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Nova Operação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="text-sm text-muted-foreground">Codinome</label>
                <Input value={form.codename} onChange={e => setForm({ ...form, codename: e.target.value })} placeholder="Ex: FALCÃO NEGRO" /></div>
              <div><label className="text-sm text-muted-foreground">Classificação</label>
                <select value={form.classification} onChange={e => setForm({ ...form, classification: e.target.value as any })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {Object.entries(CLASS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-sm text-muted-foreground">Responsável</label>
                <Input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} /></div>
            </div>
            <div><label className="text-sm text-muted-foreground">Objetivo</label>
              <Input value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} /></div>
            <div><label className="text-sm text-muted-foreground">Detalhes</label>
              <textarea value={form.details} onChange={e => setForm({ ...form, details: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="text-sm text-muted-foreground">Equipe (separar por vírgula)</label>
                <Input value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} /></div>
              <div><label className="text-sm text-muted-foreground">Início</label>
                <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><label className="text-sm text-muted-foreground">Previsão Término</label>
                <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Registrar Operação</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {ops.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(op => (
          <Card key={op.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-mono text-primary">{op.displayId}</span>
                  <Badge className={CLASS_COLORS[op.classification]}>{CLASS_LABELS[op.classification]}</Badge>
                  <Badge variant="outline">{STATUS_LABELS[op.status]}</Badge>
                </div>
                <p className="font-semibold">{revealed.has(op.id) ? op.codename : '████████'}</p>
                {revealed.has(op.id) && <p className="text-sm text-muted-foreground">{op.objective} • {op.responsible}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => toggleReveal(op.id)}>
                  {revealed.has(op.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <select value={op.status} onChange={e => updateStatus(op, e.target.value as any)}
                  className="text-sm rounded border border-input bg-background px-2 py-1">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(op.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {ops.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma operação registrada.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
