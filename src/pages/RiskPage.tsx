import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { localDB, DB_KEYS, generateSequentialDisplayId } from '@/lib/localDB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface RiskAssessment {
  id: string;
  displayId: string;
  title: string;
  local: string;
  category: string;
  description: string;
  gravidade: number;
  urgencia: number;
  tendencia: number;
  gut: number;
  priority: string;
  mitigation: string;
  responsible: string;
  status: 'identificado' | 'em_tratamento' | 'mitigado' | 'aceito';
  createdAt: string;
  createdBy: string;
}

const CATEGORIES = ['Patrimonial', 'Pessoal', 'Operacional', 'Ambiental', 'Tecnológico', 'Financeiro'];

function calcPriority(gut: number): string {
  if (gut >= 100) return 'Crítico';
  if (gut >= 50) return 'Alto';
  if (gut >= 20) return 'Médio';
  return 'Baixo';
}

function priorityColor(p: string): string {
  switch (p) {
    case 'Crítico': return 'bg-destructive/20 text-destructive';
    case 'Alto': return 'bg-warning/20 text-warning';
    case 'Médio': return 'bg-info/20 text-info';
    default: return 'bg-success/20 text-success';
  }
}

const STATUS_LABELS: Record<string, string> = {
  identificado: 'Identificado',
  em_tratamento: 'Em Tratamento',
  mitigado: 'Mitigado',
  aceito: 'Aceito',
};

export default function RiskPage() {
  const { currentUser, log, showAlert } = useApp();
  const [risks, setRisks] = useState<RiskAssessment[]>(() => localDB.load<RiskAssessment>(DB_KEYS.risks));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', local: '', category: CATEGORIES[0], description: '',
    gravidade: 3, urgencia: 3, tendencia: 3, mitigation: '', responsible: '',
  });

  const refresh = () => setRisks(localDB.load<RiskAssessment>(DB_KEYS.risks));

  const gut = form.gravidade * form.urgencia * form.tendencia;
  const priority = calcPriority(gut);

  const handleCreate = () => {
    if (!form.title.trim()) { showAlert('Preencha o título do risco.', 'warning'); return; }
    const all = localDB.load<RiskAssessment>(DB_KEYS.risks);
    const newRisk: RiskAssessment = {
      id: crypto.randomUUID(),
      displayId: generateSequentialDisplayId('RSK', all),
      ...form,
      gut,
      priority,
      status: 'identificado',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
    };
    localDB.add(DB_KEYS.risks, newRisk);
    log(`Cadastrou risco: ${newRisk.displayId}`);
    showAlert('Risco cadastrado com sucesso!', 'success');
    setForm({ title: '', local: '', category: CATEGORIES[0], description: '', gravidade: 3, urgencia: 3, tendencia: 3, mitigation: '', responsible: '' });
    setShowForm(false);
    refresh();
  };

  const updateStatus = (risk: RiskAssessment, status: RiskAssessment['status']) => {
    localDB.update(DB_KEYS.risks, { ...risk, status });
    refresh();
    showAlert(`Status atualizado para: ${STATUS_LABELS[status]}`, 'info');
  };

  const handleDelete = (id: string) => {
    localDB.delete(DB_KEYS.risks, id);
    refresh();
    showAlert('Risco excluído.', 'warning');
  };

  const stats = useMemo(() => ({
    total: risks.length,
    criticos: risks.filter(r => r.priority === 'Crítico').length,
    altos: risks.filter(r => r.priority === 'Alto').length,
    mitigados: risks.filter(r => r.status === 'mitigado').length,
  }), [risks]);

  const GutSlider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div>
      <label className="text-sm text-muted-foreground">{label}: <span className="font-bold text-primary">{value}</span></label>
      <input type="range" min={1} max={5} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary" /> Avaliação de Risco
        </h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" /> Novo Risco</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-primary' },
          { label: 'Críticos', value: stats.criticos, color: 'text-destructive' },
          { label: 'Altos', value: stats.altos, color: 'text-warning' },
          { label: 'Mitigados', value: stats.mitigados, color: 'text-success' },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-4 text-center">
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Cadastrar Risco</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="text-sm text-muted-foreground">Título</label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><label className="text-sm text-muted-foreground">Local</label>
                <Input value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} /></div>
              <div><label className="text-sm text-muted-foreground">Categoria</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
            </div>
            <div><label className="text-sm text-muted-foreground">Descrição</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]" /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GutSlider label="Gravidade" value={form.gravidade} onChange={v => setForm({ ...form, gravidade: v })} />
              <GutSlider label="Urgência" value={form.urgencia} onChange={v => setForm({ ...form, urgencia: v })} />
              <GutSlider label="Tendência" value={form.tendencia} onChange={v => setForm({ ...form, tendencia: v })} />
            </div>
            <div className="flex items-center gap-4 p-3 rounded bg-secondary/50">
              <span className="text-sm">GUT Score:</span>
              <span className="text-2xl font-bold text-primary">{gut}</span>
              <Badge className={priorityColor(priority)}>{priority}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-sm text-muted-foreground">Plano de Mitigação</label>
                <textarea value={form.mitigation} onChange={e => setForm({ ...form, mitigation: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]" /></div>
              <div><label className="text-sm text-muted-foreground">Responsável</label>
                <Input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Salvar Risco</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Matrix Visual */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Matriz de Riscos</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-1 max-w-md">
            {[5,4,3,2,1].map(g => (
              [1,2,3,4,5].map(u => {
                const score = g * u;
                const inCell = risks.filter(r => r.gravidade === g && r.urgencia === u);
                let bg = 'bg-success/20';
                if (score >= 15) bg = 'bg-destructive/30';
                else if (score >= 8) bg = 'bg-warning/30';
                else if (score >= 4) bg = 'bg-info/20';
                return (
                  <div key={`${g}-${u}`} className={`${bg} rounded p-2 text-center min-h-[40px] flex items-center justify-center`}>
                    {inCell.length > 0 && <span className="text-xs font-bold">{inCell.length}</span>}
                  </div>
                );
              })
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>← Urgência →</span><span>↑ Gravidade</span>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-3">
        {risks.sort((a, b) => b.gut - a.gut).map(risk => (
          <Card key={risk.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-primary">{risk.displayId}</span>
                    <Badge className={priorityColor(risk.priority)}>{risk.priority} (GUT: {risk.gut})</Badge>
                    <Badge variant="outline">{STATUS_LABELS[risk.status]}</Badge>
                  </div>
                  <p className="font-semibold">{risk.title}</p>
                  <p className="text-sm text-muted-foreground">{risk.category} • {risk.local} • {risk.createdBy}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={risk.status} onChange={e => updateStatus(risk, e.target.value as any)}
                    className="text-sm rounded border border-input bg-background px-2 py-1">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(risk.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
