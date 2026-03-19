import { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Pie, Doughnut, Bar, Line } from 'react-chartjs-2';
import type { CaseData } from '@/lib/localDB';

ChartJS.register(
  ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend, Title, ChartDataLabels
);

const textColor = '#d1d5db';
const gridColor = 'rgba(255, 255, 255, 0.1)';

function countBy(arr: any[], key: string): Record<string, number> {
  return arr.reduce((acc, item) => {
    const group = item[key] || 'Não especificado';
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export default function DashboardCharts({ cases }: { cases: CaseData[] }) {
  const severityData = useMemo(() => countBy(cases, 'GRAVIDADE'), [cases]);
  const statusData = useMemo(() => countBy(cases, 'STATUS'), [cases]);
  const typeData = useMemo(() => countBy(cases, 'TIPO_DE_OCORRÊNCIA'), [cases]);
  const actionData = useMemo(() => countBy(cases, 'AÇÃO_TOMADA'), [cases]);

  const timelineData = useMemo(() => {
    const monthlyData: Record<string, Record<string, number>> = {};
    const severities = ['MUITO GRAVE', 'GRAVE', 'MODERADO', 'SEM GRAVIDADE'];
    severities.forEach(s => (monthlyData[s] = {}));

    cases.forEach(item => {
      if (!item.DATA) return;
      const date = new Date(item.DATA + 'T00:00:00');
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const severity = item.GRAVIDADE;
      if (monthlyData[severity]) {
        monthlyData[severity][monthKey] = (monthlyData[severity][monthKey] || 0) + 1;
      }
    });

    const allMonths = [...new Set(Object.values(monthlyData).flatMap(d => Object.keys(d)))].sort();
    const colors: Record<string, string> = {
      'MUITO GRAVE': '#ef4444',
      'GRAVE': '#f97316',
      'MODERADO': '#eab308',
      'SEM GRAVIDADE': '#34d399',
    };

    return {
      labels: allMonths,
      datasets: severities.map(s => ({
        label: s,
        data: allMonths.map(m => monthlyData[s][m] || 0),
        borderColor: colors[s],
        backgroundColor: colors[s] + '33',
        tension: 0.3,
        fill: false,
      })),
    };
  }, [cases]);

  const pieDoughnutOpts: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { color: textColor } },
      datalabels: {
        color: '#fff',
        formatter: (value: number, ctx: any) => {
          const sum = ctx.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
          const pct = ((value * 100) / sum).toFixed(1) + '%';
          return `${value}\n(${pct})`;
        },
        font: { weight: 'bold' as const },
      },
    },
  };

  const barOpts: any = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { ticks: { color: textColor }, grid: { color: gridColor } },
      y: { ticks: { color: textColor }, grid: { color: gridColor } },
    },
    plugins: {
      legend: { display: false },
      datalabels: { anchor: 'end', align: 'end', color: textColor, font: { weight: 'bold' as const } },
    },
  };

  const lineOpts: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { ticks: { color: textColor }, grid: { color: gridColor } },
      y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true },
    },
    plugins: {
      legend: { position: 'top' as const, labels: { color: textColor } },
      datalabels: { display: false },
    },
  };

  // === CORREÇÃO 1: Dados de Casos por Unidade ===
  const unitData = useMemo(() => countBy(cases, 'UNIDADE'), [cases]);
  const sortedUnits = useMemo(() =>
    Object.entries(unitData).sort((a, b) => b[1] - a[1]),
    [unitData]
  );

  return (
    <div className="space-y-6">
      {/* === CORREÇÃO 1: Três cartões lado a lado === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg h-96">
          <h2 className="text-lg font-semibold text-primary mb-4">Casos por Gravidade</h2>
          <div className="h-[calc(100%-2rem)]">
            <Pie
              data={{
                labels: Object.keys(severityData),
                datasets: [{
                  data: Object.values(severityData),
                  backgroundColor: ['#ef4444', '#f97316', '#eab308', '#34d399'],
                  borderColor: '#1f2937',
                }],
              }}
              options={pieDoughnutOpts}
            />
          </div>
        </div>
        <div className="bg-card p-6 rounded-lg h-96">
          <h2 className="text-lg font-semibold text-primary mb-4">Casos por Status</h2>
          <div className="h-[calc(100%-2rem)]">
            <Doughnut
              data={{
                labels: Object.keys(statusData),
                datasets: [{
                  data: Object.values(statusData),
                  backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#6b7280'],
                  borderColor: '#1f2937',
                }],
              }}
              options={pieDoughnutOpts}
            />
          </div>
        </div>
        {/* === CORREÇÃO 1: Casos por Unidade (lista) === */}
        <div className="bg-card p-6 rounded-lg h-96 overflow-y-auto synapse-scrollbar">
          <h2 className="text-lg font-semibold text-primary mb-4">Casos por Unidade</h2>
          {sortedUnits.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum dado disponível</p>
          ) : (
            <div className="space-y-2">
              {sortedUnits.map(([unit, count]) => (
                <div key={unit} className="flex items-center justify-between">
                  <span className="text-sm text-foreground truncate mr-2">{unit}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min((count / (sortedUnits[0]?.[1] || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-primary w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg" style={{ height: 650 }}>
        <h2 className="text-lg font-semibold text-primary mb-4">Ocorrências por Tipo</h2>
        <div className="h-[calc(100%-2rem)]">
          <Bar
            data={{
              labels: Object.keys(typeData),
              datasets: [{ label: 'Contagem', data: Object.values(typeData), backgroundColor: '#22d3ee' }],
            }}
            options={barOpts}
          />
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg" style={{ height: 650 }}>
        <h2 className="text-lg font-semibold text-primary mb-4">Ações Tomadas</h2>
        <div className="h-[calc(100%-2rem)]">
          <Bar
            data={{
              labels: Object.keys(actionData),
              datasets: [{ label: 'Contagem', data: Object.values(actionData), backgroundColor: '#818cf8' }],
            }}
            options={barOpts}
          />
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg" style={{ height: 600 }}>
        <h2 className="text-lg font-semibold text-primary mb-4">Tendência Mensal por Gravidade</h2>
        <div className="h-[calc(100%-2rem)]">
          <Line data={timelineData} options={lineOpts} />
        </div>
      </div>
    </div>
  );
}
