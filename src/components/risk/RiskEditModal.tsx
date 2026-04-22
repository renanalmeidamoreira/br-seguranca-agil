// === NOVA FUNCIONALIDADE: EDIÇÃO DINÂMICA DE AVALIAÇÕES DE RISCO ===
// Modal completo de edição de um risco/planta com autocomplete de cidades,
// recálculo automático do GUT (Gravidade × Urgência × Tendência) e atualização
// imediata do mapa, mini-mapa e cartões após salvar.
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import CityAutocomplete from '@/components/cases/CityAutocomplete';
import { findCoordsLocal, normalizeCity } from '@/lib/cityCoords';
import type { RiskAssessment } from '@/pages/RiskPage';
import { priorityColor } from '@/pages/RiskPage';
import { Info } from 'lucide-react';

const STATUS_OPTIONS = ['Pendente', 'Em Andamento', 'Concluído', 'Cancelado'];

function calcPriority(score: number): { priority: string; level: number } {
  if (score >= 100) return { priority: 'Crítico', level: 4 };
  if (score >= 50) return { priority: 'Alto', level: 3 };
  if (score >= 20) return { priority: 'Moderado', level: 2 };
  return { priority: 'Baixo', level: 1 };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  risk: RiskAssessment | null;
  existingPlants?: string[];
  onSave: (updated: RiskAssessment) => void;
}

export default function RiskEditModal({ open, onOpenChange, risk, existingPlants = [], onSave }: Props) {
  const [form, setForm] = useState<RiskAssessment | null>(risk);

  // Sincroniza o estado quando o risco selecionado mudar
  useEffect(() => { setForm(risk); }, [risk]);

  // Coordenadas resolvidas a partir do nome da planta (auto-preenchidas)
  const coords = useMemo(() => form ? findCoordsLocal(form.plant) || null : null, [form?.plant]);

  if (!form) return null;

  const set = <K extends keyof RiskAssessment>(key: K, value: RiskAssessment[K]) =>
    setForm(prev => prev ? { ...prev, [key]: value } : prev);

  const score = (form.g || 0) * (form.u || 0) * (form.t || 0);
  const { priority, level } = calcPriority(score);

  const handleSave = () => {
    if (!form.plant.trim() || !form.fact.trim()) return;
    // Normaliza nome da planta para garantir match com o COORD_MAP
    const normalizedPlant = form.plant.trim();
    onSave({
      ...form,
      plant: normalizedPlant,
      score,
      priority,
      level,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Editar Risco — <span className="font-mono text-primary">{form.displayId}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Planta com autocomplete de cidade */}
          <div className="md:col-span-2">
            <label className="text-sm text-muted-foreground flex items-center gap-1">
              <span title="Cidade que será plotada no mapa de calor">Planta / Local</span>
              <Info className="w-3 h-3" />
            </label>
            <CityAutocomplete
              value={form.plant}
              onChange={(v) => set('plant', v)}
              existingLocals={existingPlants}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              placeholder="Ex.: Visconde do Rio Branco"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {coords
                ? <>Coordenadas: <strong className="text-foreground">{coords[0].toFixed(3)}, {coords[1].toFixed(3)}</strong> (auto)</>
                : <>⚠ Cidade não mapeada — será geocodificada automaticamente no mapa.</>
              }
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Setor</label>
            <Input value={form.sector} onChange={e => set('sector', e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Data da Avaliação</label>
            <Input type="date" value={form.evaluationDate} onChange={e => set('evaluationDate', e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-muted-foreground">Fato Constatado</label>
            <textarea value={form.fact} onChange={e => set('fact', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px]" />
          </div>

          {/* Matriz GUT */}
          <div className="md:col-span-2 bg-secondary/30 p-4 rounded-lg border border-border">
            <h3 className="text-sm font-semibold text-primary mb-3">
              Matriz de Risco (GUT) — recalcula em tempo real
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {(['g', 'u', 't'] as const).map(k => (
                <div key={k}>
                  <label className="text-xs text-muted-foreground uppercase">
                    {k === 'g' ? 'Gravidade' : k === 'u' ? 'Urgência' : 'Tendência'}
                  </label>
                  <select value={form[k]} onChange={e => set(k, Number(e.target.value))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3 bg-background/50 p-3 rounded-md">
              <div>
                <p className="text-xs text-muted-foreground">Pontuação</p>
                <p className="text-2xl font-bold">{score}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prioridade</p>
                <Badge className={`${priorityColor(priority)} text-base`}>{priority}</Badge>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-muted-foreground">Recomendação</label>
            <textarea value={form.recommendation} onChange={e => set('recommendation', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-muted-foreground">Plano de Ação</label>
            <textarea value={form.actionPlan} onChange={e => set('actionPlan', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]" />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Responsável</label>
            <Input value={form.responsible} onChange={e => set('responsible', e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Data Prevista</label>
            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-muted-foreground">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
