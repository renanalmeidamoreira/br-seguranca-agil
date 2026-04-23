import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// === NOVA FUNCIONALIDADE: Autocomplete de cidade no campo LOCAL ===
import CityAutocomplete from '@/components/cases/CityAutocomplete';

const STATUS_OPTIONS = ['Pendente', 'Em Andamento', 'Concluído', 'Cancelado'];

function calcPriority(score: number): string {
  if (score >= 100) return 'Crítico';
  if (score >= 50) return 'Alto';
  if (score >= 20) return 'Moderado';
  return 'Baixo';
}

function priorityColor(p: string): string {
  switch (p) {
    case 'Crítico': return 'bg-destructive/20 text-destructive';
    case 'Alto': return 'bg-warning/20 text-warning';
    case 'Moderado': return 'bg-info/20 text-info';
    default: return 'bg-success/20 text-success';
  }
}

interface Props {
  onSubmit: (form: any) => void;
  onCancel: () => void;
}

export default function RiskForm({ onSubmit, onCancel }: Props) {
  const [form, setForm] = useState({
    plant: '', local: '', sector: '', fact: '', evaluationDate: new Date().toISOString().slice(0, 10),
    g: 1, u: 1, t: 1,
    recommendation: '', actionPlan: '',
    responsible: '', date: '', status: 'Pendente',
  });

  const score = form.g * form.u * form.t;
  const priority = calcPriority(score);

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const GutSelect = ({ label, tooltip, value, onChange }: { label: string; tooltip: string; value: number; onChange: (v: number) => void }) => (
    <div>
      <label className="text-sm text-muted-foreground" title={tooltip}>{label}</label>
      <select value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
        {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
      </select>
    </div>
  );

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Adicionar Nova Avaliação de Risco</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
          {/* Left column */}
          <div className="space-y-6">
            <div className="bg-secondary/30 p-4 rounded-lg border border-border space-y-4">
              <h3 className="text-base font-semibold text-primary">Risco Identificado</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground" title="Nome da unidade ou instalação (ex.: Usina Ipatinga)">
                    Planta / Unidade
                  </label>
                  <Input value={form.plant} onChange={e => set('plant', e.target.value)} placeholder="Ex.: Usina Ipatinga" required />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground" title="Cidade onde a planta está localizada — usada no mapa de calor">
                    Local (cidade) *
                  </label>
                  {/* === NOVA FUNCIONALIDADE: Autocomplete de cidades para o campo LOCAL === */}
                  <CityAutocomplete
                    value={form.local}
                    onChange={(v) => set('local', v)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    placeholder="Ex.: Ipatinga/MG"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Setor</label>
                <Input value={form.sector} onChange={e => set('sector', e.target.value)} required />
              </div>
              <div><label className="text-sm text-muted-foreground">Fato Constatado</label>
                <textarea value={form.fact} onChange={e => set('fact', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px]" required /></div>
              <div><label className="text-sm text-muted-foreground">Data da Avaliação</label>
                <Input type="date" value={form.evaluationDate} onChange={e => set('evaluationDate', e.target.value)} /></div>
            </div>
            <div className="bg-secondary/30 p-4 rounded-lg border border-border space-y-4">
              <h3 className="text-base font-semibold text-primary">Recomendação e Plano de Ação</h3>
              <div><label className="text-sm text-muted-foreground">Recomendação</label>
                <textarea value={form.recommendation} onChange={e => set('recommendation', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px]" /></div>
              <div><label className="text-sm text-muted-foreground">Plano de Ação</label>
                <textarea value={form.actionPlan} onChange={e => set('actionPlan', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px]" /></div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <div className="bg-secondary/30 p-4 rounded-lg border border-border space-y-4">
              <h3 className="text-base font-semibold text-primary">Matriz de Risco (GUT)</h3>
              <div className="grid grid-cols-3 gap-4">
                <GutSelect label="Gravidade (G)" tooltip="Impacto do problema" value={form.g} onChange={v => set('g', v)} />
                <GutSelect label="Urgência (U)" tooltip="Pressão do tempo" value={form.u} onChange={v => set('u', v)} />
                <GutSelect label="Tendência (T)" tooltip="Potencial de crescimento" value={form.t} onChange={v => set('t', v)} />
              </div>
              <div className="grid grid-cols-2 gap-4 bg-background/50 p-4 rounded-lg">
                <div><label className="text-sm text-muted-foreground">Pontuação</label>
                  <p className="text-2xl font-bold text-foreground">{score}</p></div>
                <div><label className="text-sm text-muted-foreground">Prioridade</label>
                  <Badge className={`${priorityColor(priority)} text-lg`}>{priority}</Badge></div>
              </div>
            </div>
            <div className="bg-secondary/30 p-4 rounded-lg border border-border space-y-4">
              <h3 className="text-base font-semibold text-primary">Acompanhamento</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-muted-foreground">Responsável</label>
                  <Input value={form.responsible} onChange={e => set('responsible', e.target.value)} /></div>
                <div><label className="text-sm text-muted-foreground">Data Prevista</label>
                  <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
              </div>
              <div><label className="text-sm text-muted-foreground">Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => {
            if (!form.plant.trim() || !form.fact.trim() || !form.local.trim()) return;
            onSubmit(form);
          }}>Salvar Risco</Button>
        </div>
      </CardContent>
    </Card>
  );
}
