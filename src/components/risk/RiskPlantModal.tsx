import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { RiskAssessment } from '@/pages/RiskPage';
import { priorityColor } from '@/pages/RiskPage';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: string;
  risks: RiskAssessment[];
}

export default function RiskPlantModal({ open, onOpenChange, plant, risks }: Props) {
  const priorityCounts = useMemo(() => {
    const counts = { 'Crítico': 0, 'Alto': 0, 'Moderado': 0, 'Baixo': 0 };
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
        color: '#fff', font: { weight: 'bold' as const, size: 14 },
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
                <th className="text-left p-2">Fato</th>
                <th className="text-left p-2">Setor</th>
                <th className="text-left p-2">GUT</th>
                <th className="text-left p-2">Prioridade</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {risks.sort((a, b) => b.score - a.score).map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2 font-mono text-primary">{r.displayId}</td>
                  <td className="p-2 max-w-xs truncate">{r.fact}</td>
                  <td className="p-2">{r.sector}</td>
                  <td className="p-2 font-bold">{r.score}</td>
                  <td className="p-2"><Badge className={priorityColor(r.priority)}>{r.priority}</Badge></td>
                  <td className="p-2"><Badge variant="outline">{r.status}</Badge></td>
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
