import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { localDB, DB_KEYS, generateSequentialDisplayId } from '@/lib/localDB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Trash2, MapPin, Eye } from 'lucide-react';
import RiskPlantModal from '@/components/risk/RiskPlantModal';
import RiskForm from '@/components/risk/RiskForm';

export interface RiskAssessment {
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

export const RISK_CATEGORIES = ['Patrimonial', 'Pessoal', 'Operacional', 'Ambiental', 'Tecnológico', 'Financeiro'];

export function calcPriority(gut: number): string {
  if (gut >= 100) return 'Crítico';
  if (gut >= 50) return 'Alto';
  if (gut >= 20) return 'Médio';
  return 'Baixo';
}

export function priorityColor(p: string): string {
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

function overallLevel(risks: RiskAssessment[]): string {
  if (risks.some(r => r.priority === 'Crítico')) return 'Crítico';
  if (risks.some(r => r.priority === 'Alto')) return 'Alto';
  if (risks.some(r => r.priority === 'Médio')) return 'Médio';
  return 'Baixo';
}

export default function RiskPage() {
  const { currentUser, log, showAlert } = useApp();
  const [risks, setRisks] = useState<RiskAssessment[]>(() => localDB.load<RiskAssessment>(DB_KEYS.risks));
  const [showForm, setShowForm] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);

  const refresh = () => setRisks(localDB.load<RiskAssessment>(DB_KEYS.risks));

  const handleCreate = (form: any) => {
    const all = localDB.load<RiskAssessment>(DB_KEYS.risks);
    const gut = form.gravidade * form.urgencia * form.tendencia;
    const newRisk: RiskAssessment = {
      id: crypto.randomUUID(),
      displayId: generateSequentialDisplayId('RSK', all),
      ...form,
      gut,
      priority: calcPriority(gut),
      status: 'identificado',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
    };
    localDB.add(DB_KEYS.risks, newRisk);
    log(`Cadastrou risco: ${newRisk.displayId}`);
    showAlert('Risco cadastrado com sucesso!', 'success');
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

  // Group by plant/local
  const plantGroups = useMemo(() => {
    const groups: Record<string, RiskAssessment[]> = {};
    risks.forEach(r => {
      const plant = r.local || 'Sem Local';
      if (!groups[plant]) groups[plant] = [];
      groups[plant].push(r);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [risks]);

  const selectedPlantRisks = useMemo(() => {
    if (!selectedPlant) return [];
    return risks.filter(r => (r.local || 'Sem Local') === selectedPlant);
  }, [risks, selectedPlant]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary" /> Avaliação de Risco
        </h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" /> Novo Risco</Button>
      </div>

      {/* KPI Cards */}
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

      {/* Form */}
      {showForm && <RiskForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {/* Plant Cards */}
      {plantGroups.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Riscos por Planta / Local
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plantGroups.map(([plant, plantRisks]) => {
              const level = overallLevel(plantRisks);
              const criticos = plantRisks.filter(r => r.priority === 'Crítico').length;
              return (
                <Card key={plant} className="hover:border-primary/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedPlant(plant)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold truncate">{plant}</h3>
                      <Badge className={priorityColor(level)}>{level}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{plantRisks.length} risco(s)</span>
                      {criticos > 0 && <span className="text-destructive font-bold">{criticos} crítico(s)</span>}
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2 w-full text-primary">
                      <Eye className="w-4 h-4 mr-1" /> Ver Detalhes
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Risk Matrix */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Matriz de Riscos</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-1 max-w-md">
            {[5,4,3,2,1].map(g =>
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
            )}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span>← Urgência →</span><span>↑ Gravidade</span>
          </div>
        </CardContent>
      </Card>

      {/* Risk List */}
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

      {/* Plant Modal */}
      <RiskPlantModal
        open={!!selectedPlant}
        onOpenChange={(open) => { if (!open) setSelectedPlant(null); }}
        plant={selectedPlant || ''}
        risks={selectedPlantRisks}
      />
    </div>
  );
}
