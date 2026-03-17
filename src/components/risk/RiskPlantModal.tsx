import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

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
  status: string;
  createdAt: string;
  createdBy: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: string;
  risks: RiskAssessment[];
}

const priorityColor: Record<string, string> = {
  'Crítico': 'bg-destructive/20 text-destructive',
  'Alto': 'bg-warning/20 text-warning',
  'Médio': 'bg-info/20 text-info',
  'Baixo': 'bg-success/20 text-success',
};

const STATUS_LABELS: Record<string, string> = {
  identificado: 'Identificado',
  em_tratamento: 'Em Tratamento',
  mitigado: 'Mitigado',
  aceito: 'Aceito',
};

export default function RiskPlantModal({ open, onOpenChange, plant, risks }: Props) {
  const priorityCounts = useMemo(() => {
    const counts = { 'Crítico': 0, 'Alto': 0, 'Médio': 0, 'Baixo': 0 };
    risks.forEach(r => { if (counts[r.priority as keyof typeof counts] !== undefined) counts[r.priority as keyof typeof counts]++; });
    return counts;
  }, [risks]);

  const topResponsible = useMemo(() => {
    const resp: Record<string, number> = {};
    risks.forEach(r => { if (r.responsible) resp[r.responsible] = (resp[r.responsible] || 0) + 1; });
    return Object.entries(resp).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  }, [risks]);

  const chartData = {
    labels: Object.keys(priorityCounts),
    datasets: [{
      data: Object.values(priorityCounts),
      backgroundColor: ['#ef4444', '#f97316', '#3b82f6', '#34d399'],
      borderColor: '#1f2937',
    }],
  };

  const chartOpts: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#d1d5db' } },
      datalabels: {
        color: '#fff',
        font: { weight: 'bold' as const, size: 14 },
        formatter: (v: number) => v > 0 ? v : '',
      },
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Riscos — {plant}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{risks.length}</p>
            <p className="text-xs text-muted-foreground">Total de Riscos</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-destructive">{priorityCounts['Crítico']}</p>
            <p className="text-xs text-muted-foreground">Críticos</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm font-bold text-primary">{topResponsible}</p>
            <p className="text-xs text-muted-foreground">Responsável Principal</p>
          </CardContent></Card>
        </div>

        <div className="h-64 mb-4">
          <Doughnut data={chartData} options={chartOpts} />
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Título</th>
                <th className="text-left p-2">Categoria</th>
                <th className="text-left p-2">GUT</th>
                <th className="text-left p-2">Prioridade</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {risks.sort((a, b) => b.gut - a.gut).map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2 font-mono text-primary">{r.displayId}</td>
                  <td className="p-2">{r.title}</td>
                  <td className="p-2">{r.category}</td>
                  <td className="p-2 font-bold">{r.gut}</td>
                  <td className="p-2"><Badge className={priorityColor[r.priority] || ''}>{r.priority}</Badge></td>
                  <td className="p-2"><Badge variant="outline">{STATUS_LABELS[r.status] || r.status}</Badge></td>
                </tr>
              ))}
              {risks.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Nenhum risco nesta planta</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
