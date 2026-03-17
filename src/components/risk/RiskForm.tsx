import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RISK_CATEGORIES, calcPriority, priorityColor } from '@/pages/RiskPage';

interface Props {
  onSubmit: (form: any) => void;
  onCancel: () => void;
}

export default function RiskForm({ onSubmit, onCancel }: Props) {
  const [form, setForm] = useState({
    title: '', local: '', category: RISK_CATEGORIES[0], description: '',
    gravidade: 3, urgencia: 3, tendencia: 3, mitigation: '', responsible: '',
  });

  const gut = form.gravidade * form.urgencia * form.tendencia;
  const priority = calcPriority(gut);

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onSubmit(form);
  };

  const GutSlider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div>
      <label className="text-sm text-muted-foreground">{label}: <span className="font-bold text-primary">{value}</span></label>
      <input type="range" min={1} max={5} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary" />
    </div>
  );

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Cadastrar Risco</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="text-sm text-muted-foreground">Título</label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="text-sm text-muted-foreground">Local / Planta</label>
            <Input value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} placeholder="Ex: CD São Paulo" /></div>
          <div><label className="text-sm text-muted-foreground">Categoria</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {RISK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
          <Button onClick={handleSubmit}>Salvar Risco</Button>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
