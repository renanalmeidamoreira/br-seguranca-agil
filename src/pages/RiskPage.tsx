import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { localDB, DB_KEYS, generateSequentialDisplayId, formatDate } from '@/lib/localDB';
import { markForSync } from '@/lib/syncService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-dialog';
import { Shield, Plus, Trash2, MapPin, Eye, X, FileSpreadsheet, Pencil } from 'lucide-react';
// === NOVA FUNCIONALIDADE: Exportação para Excel ===
import { exportRowsToExcel } from '@/lib/exportExcel';
import RiskPlantModal from '@/components/risk/RiskPlantModal';
import RiskForm from '@/components/risk/RiskForm';
// === NOVA FUNCIONALIDADE: Mini-mapa nos cartões de planta ===
import PlantMiniMap from '@/components/risk/PlantMiniMap';
// === NOVA FUNCIONALIDADE: Modal de edição dinâmica de riscos ===
import RiskEditModal from '@/components/risk/RiskEditModal';

export interface RiskAssessment {
  id: string;
  displayId: string;
  plant: string;
  // === NOVA FUNCIONALIDADE: Campo LOCAL (cidade) separado da PLANTA (unidade) ===
  // PLANTA = nome da unidade/instalação (ex.: "Usina Ipatinga")
  // LOCAL  = cidade usada para o mapa de calor (ex.: "Ipatinga/MG")
  local?: string;
  sector: string;
  fact: string;
  evaluationDate: string;
  g: number;
  u: number;
  t: number;
  score: number;
  priority: string;
  level: number;
  recommendation: string;
  actionPlan: string;
  responsible: string;
  date: string;
  status: string;
  createdAt: string;
  createdBy: string;
}

function calcGut(g: number, u: number, t: number) {
  const score = g * u * t;
  let priority = 'Baixo';
  let level = 1;
  if (score >= 100) { priority = 'Crítico'; level = 4; }
  else if (score >= 50) { priority = 'Alto'; level = 3; }
  else if (score >= 20) { priority = 'Moderado'; level = 2; }
  return { score, priority, level };
}

export function priorityColor(p: string): string {
  switch (p) {
    case 'Crítico': return 'bg-destructive/20 text-destructive';
    case 'Alto': return 'bg-warning/20 text-warning';
    case 'Moderado': return 'bg-info/20 text-info';
    default: return 'bg-success/20 text-success';
  }
}

const STATUS_LABELS: Record<string, string> = {
  Pendente: 'Pendente', 'Em Andamento': 'Em Andamento', Concluído: 'Concluído', Cancelado: 'Cancelado',
};

export default function RiskPage() {
  const { currentUser, log, showAlert } = useApp();
  const [risks, setRisks] = useState<RiskAssessment[]>(() => localDB.load<RiskAssessment>(DB_KEYS.risks));
  const [showForm, setShowForm] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<string>('');
  // === NOVA FUNCIONALIDADE: Confirmação de exclusão de risco ===
  const [deleteTarget, setDeleteTarget] = useState<RiskAssessment | null>(null);
  // === NOVA FUNCIONALIDADE: Edição dinâmica de risco ===
  const [editTarget, setEditTarget] = useState<RiskAssessment | null>(null);

  const refresh = () => setRisks(localDB.load<RiskAssessment>(DB_KEYS.risks));

  // === NOVA FUNCIONALIDADE: Salvar edição com recálculo automático e refresh do mapa ===
  const handleUpdate = (updated: RiskAssessment) => {
    localDB.update(DB_KEYS.risks, updated);
    markForSync(DB_KEYS.risks, updated.id);
    log(`Atualizou risco: ${updated.displayId}`);
    showAlert('Risco atualizado com sucesso!', 'success');
    setEditTarget(null);
    refresh();
  };

  const handleCreate = (form: any) => {
    const all = localDB.load<RiskAssessment>(DB_KEYS.risks);
    const { score, priority, level } = calcGut(form.g, form.u, form.t);
    const newRisk: RiskAssessment = {
      id: crypto.randomUUID(),
      displayId: generateSequentialDisplayId('RSK', all),
      plant: form.plant, local: form.local || '', sector: form.sector, fact: form.fact,
      evaluationDate: form.evaluationDate,
      g: form.g, u: form.u, t: form.t, score, priority, level,
      recommendation: form.recommendation, actionPlan: form.actionPlan,
      responsible: form.responsible, date: form.date, status: form.status,
      createdAt: new Date().toISOString(), createdBy: currentUser.name,
    };
    localDB.add(DB_KEYS.risks, newRisk);
    markForSync(DB_KEYS.risks, newRisk.id);
    log(`Cadastrou risco: ${newRisk.displayId}`);
    showAlert('Risco adicionado com sucesso!', 'success');
    setShowForm(false); refresh();
  };

  const handleDelete = (risk: RiskAssessment) => setDeleteTarget(risk);
  const confirmDelete = () => {
    if (!deleteTarget) return;
    localDB.delete(DB_KEYS.risks, deleteTarget.id);
    refresh();
    showAlert('Risco excluído.', 'warning');
    setDeleteTarget(null);
  };

  // Year options
  const years = useMemo(() => {
    const ySet = new Set<string>();
    risks.forEach(r => { if (r.evaluationDate) ySet.add(r.evaluationDate.slice(0, 4)); });
    return Array.from(ySet).sort().reverse();
  }, [risks]);

  // Filtered risks
  const filteredRisks = useMemo(() => {
    let list = [...risks];
    if (yearFilter) list = list.filter(r => r.evaluationDate?.startsWith(yearFilter));
    return list;
  }, [risks, yearFilter]);

  // Plant groups
  const plantGroups = useMemo(() => {
    const groups: Record<string, RiskAssessment[]> = {};
    filteredRisks.forEach(r => {
      const p = r.plant || 'Sem Local';
      if (!groups[p]) groups[p] = [];
      groups[p].push(r);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredRisks]);

  // Filtered by plant for table
  const tableRisks = useMemo(() => {
    if (!selectedPlant) return filteredRisks;
    return filteredRisks.filter(r => (r.plant || 'Sem Local') === selectedPlant);
  }, [filteredRisks, selectedPlant]);

  // Stats
  const stats = useMemo(() => ({
    total: filteredRisks.length,
    criticos: filteredRisks.filter(r => r.priority === 'Crítico').length,
    altos: filteredRisks.filter(r => r.priority === 'Alto').length,
    moderados: filteredRisks.filter(r => r.priority === 'Moderado').length,
  }), [filteredRisks]);

  function overallLevel(arr: RiskAssessment[]): string {
    if (arr.some(r => r.priority === 'Crítico')) return 'Crítico';
    if (arr.some(r => r.priority === 'Alto')) return 'Alto';
    if (arr.some(r => r.priority === 'Moderado')) return 'Moderado';
    return 'Baixo';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary" /> Painel de Avaliação de Risco
        </h1>
        <div className="flex gap-2">
          {/* === NOVA FUNCIONALIDADE: Exportar Excel (respeita filtros) === */}
          <Button
            variant="outline"
            onClick={() => {
              const rows = tableRisks.map(r => ({
                ID: r.displayId,
                Planta: r.plant,
                Local: r.local || '',
                Setor: r.sector,
                Fato: r.fact,
                'Data Avaliação': r.evaluationDate,
                G: r.g, U: r.u, T: r.t,
                Score: r.score,
                Prioridade: r.priority,
                Recomendação: r.recommendation,
                'Plano de Ação': r.actionPlan,
                Responsável: r.responsible,
                Status: r.status,
              }));
              const ok = exportRowsToExcel(rows, 'synapse_riscos', 'Riscos');
              showAlert(ok ? 'Riscos exportados.' : 'Nenhum risco para exportar.', ok ? 'success' : 'info');
            }}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Excel
          </Button>
          <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" /> Adicionar Risco</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-primary' },
          { label: 'Críticos', value: stats.criticos, color: 'text-destructive' },
          { label: 'Altos', value: stats.altos, color: 'text-warning' },
          { label: 'Moderados', value: stats.moderados, color: 'text-info' },
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
              const isActive = selectedPlant === plant;
              // === Cálculo do GUT médio (G + U + T) por planta ===
              const avgGut = plantRisks.length > 0
                ? plantRisks.reduce((s, r) => s + ((r.g || 0) + (r.u || 0) + (r.t || 0)) / 3, 0) / plantRisks.length
                : 0;
              return (
                <Card key={plant}
                  className={`cursor-pointer transition-all hover:shadow-lg border-l-4 ${
                    level === 'Crítico' ? 'border-l-destructive' :
                    level === 'Alto' ? 'border-l-warning' :
                    level === 'Moderado' ? 'border-l-info' : 'border-l-success'
                  } ${isActive ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedPlant(isActive ? null : plant)}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold">{plant}</h3>
                        <p className="text-sm text-muted-foreground">{plantRisks.length} risco(s) mapeado(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Nível de Risco</p>
                        <Badge className={`${priorityColor(level)} text-lg`}>{level}</Badge>
                      </div>
                    </div>
                    {/* === NOVA FUNCIONALIDADE: Mini-mapa da planta === */}
                    <PlantMiniMap plant={plant} avgGut={avgGut} />
                    <p className="text-xs text-muted-foreground text-center">
                      GUT médio: <strong className="text-foreground">{avgGut.toFixed(1)}</strong>
                    </p>
                    {/* === NOVA FUNCIONALIDADE: Botão de edição rápida do primeiro risco da planta === */}
                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setEditTarget(plantRisks[0]); }}
                        title="Editar dados desta planta (recalcula mapa e GUT automaticamente)"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Table Header with Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-lg font-bold text-primary">
          Gerenciamento de Riscos {yearFilter ? `(${yearFilter})` : '(Todos)'}
          {selectedPlant ? ` / ${selectedPlant}` : ''}
        </h2>
        <div className="flex items-center gap-3">
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Todos os anos</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {(selectedPlant || yearFilter) && (
            <Button variant="outline" size="sm" onClick={() => { setSelectedPlant(null); setYearFilter(''); }}>
              <X className="w-4 h-4 mr-1" /> Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Risk Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-3 text-xs uppercase font-semibold">ID</th>
                  <th className="text-left p-3 text-xs uppercase font-semibold">Planta</th>
                  <th className="text-left p-3 text-xs uppercase font-semibold">Setor</th>
                  <th className="text-left p-3 text-xs uppercase font-semibold">Fato Constatado</th>
                  <th className="text-left p-3 text-xs uppercase font-semibold">Prioridade</th>
                  <th className="text-left p-3 text-xs uppercase font-semibold">Status</th>
                  <th className="text-left p-3 text-xs uppercase font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tableRisks.sort((a, b) => b.score - a.score).map(risk => (
                  <tr key={risk.id} className="border-t border-border hover:bg-secondary/50">
                    <td className="p-3 font-mono text-primary">{risk.displayId}</td>
                    <td className="p-3">{risk.plant}</td>
                    <td className="p-3">{risk.sector}</td>
                    <td className="p-3 max-w-xs truncate" title={risk.recommendation || risk.fact}>{risk.fact}</td>
                    <td className="p-3"><Badge className={priorityColor(risk.priority)}>{risk.priority}</Badge></td>
                    <td className="p-3">{risk.status}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {/* === NOVA FUNCIONALIDADE: Editar risco individual === */}
                        <Button variant="ghost" size="icon" onClick={() => setEditTarget(risk)} title="Editar risco">
                          <Pencil className="w-4 h-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(risk)} title="Excluir risco">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tableRisks.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum risco encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Plant Detail Modal - reuse existing component */}
      <RiskPlantModal
        open={false}
        onOpenChange={() => {}}
        plant=""
        risks={[]}
      />

      {/* === NOVA FUNCIONALIDADE: Confirmação de exclusão === */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        itemLabel={deleteTarget ? `o risco ${deleteTarget.displayId}` : 'este risco'}
        onConfirm={confirmDelete}
      />

      {/* === NOVA FUNCIONALIDADE: Modal de edição dinâmica === */}
      <RiskEditModal
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        risk={editTarget}
        existingPlants={plantGroups.map(([p]) => p)}
        onSave={handleUpdate}
      />
    </div>
  );
}
