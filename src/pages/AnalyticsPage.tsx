import { useMemo } from 'react';
import { localDB, DB_KEYS, CaseData, formatCurrency } from '@/lib/localDB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import {
  Chart as ChartJS, ArcElement, RadialLinearScale, PointElement, LineElement,
  Tooltip, Legend, Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut, Radar } from 'react-chartjs-2';

ChartJS.register(ArcElement, RadialLinearScale, PointElement, LineElement, Tooltip, Legend, Filler, ChartDataLabels);

const textColor = '#d1d5db';

export default function AnalyticsPage() {
  const cases = useMemo(() => localDB.load<CaseData>(DB_KEYS.occurrences), []);
  const checklists = useMemo(() => localDB.load<any>(DB_KEYS.checklists), []);
  const risks = useMemo(() => localDB.load<any>(DB_KEYS.risks), []);

  const totalPerdas = cases.reduce((s, c) => s + (parseFloat(String(c.VALOR_PERDA)) || 0), 0);
  const totalRecuperado = cases.reduce((s, c) => s + (parseFloat(String(c.VALOR_RECUPERADO)) || 0), 0);
  const totalEvitado = cases.reduce((s, c) => s + (parseFloat(String(c.PERDA_EVITADA_ANUAL)) || 0), 0);
  const taxaRecuperacao = totalPerdas > 0 ? ((totalRecuperado / totalPerdas) * 100).toFixed(1) : '0';

  const byType: Record<string, number> = {};
  cases.forEach(c => { byType[c.TIPO_DE_OCORRÊNCIA] = (byType[c.TIPO_DE_OCORRÊNCIA] || 0) + 1; });

  const byStatus: Record<string, number> = {};
  cases.forEach(c => { byStatus[c.STATUS] = (byStatus[c.STATUS] || 0) + 1; });

  const byUnit: Record<string, number> = {};
  cases.forEach(c => { byUnit[c.UNIDADE] = (byUnit[c.UNIDADE] || 0) + 1; });

  const byMonth: Record<string, number> = {};
  cases.forEach(c => {
    if (c.DATA) { const m = c.DATA.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + 1; }
  });

  const allItems = checklists.flatMap((c: any) => c.items || []);
  const conformes = allItems.filter((i: any) => i.status === 'conforme').length;
  const taxaConformidade = allItems.length > 0 ? ((conformes / allItems.length) * 100).toFixed(1) : '0';

  const avgGut = risks.length > 0
    ? (risks.reduce((s: number, r: any) => s + (r.gut || 0), 0) / risks.length).toFixed(1) : '0';

  // Top 5 fraud types for radar
  const top5Types = useMemo(() => {
    const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { labels: sorted.map(([k]) => k || 'N/A'), values: sorted.map(([, v]) => v) };
  }, [byType]);

  // Priority doughnut by plant
  const plantPriority = useMemo(() => {
    const plants: Record<string, number> = {};
    risks.forEach((r: any) => { plants[r.local || 'Sem Local'] = (plants[r.local || 'Sem Local'] || 0) + 1; });
    const sorted = Object.entries(plants).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { labels: sorted.map(([k]) => k), values: sorted.map(([, v]) => v) };
  }, [risks]);

  const radarData = {
    labels: top5Types.labels,
    datasets: [{
      label: 'Ocorrências',
      data: top5Types.values,
      backgroundColor: 'rgba(34, 211, 238, 0.2)',
      borderColor: '#22d3ee',
      pointBackgroundColor: '#22d3ee',
      pointBorderColor: '#fff',
    }],
  };

  const radarOpts: any = {
    responsive: true, maintainAspectRatio: false,
    scales: { r: { angleLines: { color: 'rgba(255,255,255,0.1)' }, grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: textColor, font: { size: 11 } }, ticks: { display: false } } },
    plugins: { legend: { display: false }, datalabels: { color: '#22d3ee', font: { weight: 'bold' as const }, formatter: (v: number) => v } },
  };

  const doughnutData = {
    labels: plantPriority.labels,
    datasets: [{ data: plantPriority.values, backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#34d399', '#8b5cf6'], borderColor: '#1f2937' }],
  };

  const doughnutOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'right' as const, labels: { color: textColor } }, datalabels: { color: '#fff', font: { weight: 'bold' as const }, formatter: (v: number) => v > 0 ? v : '' } },
  };

  const StatCard = ({ icon: Icon, label, value, sub, color }: any) => (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`w-8 h-8 ${color}`} />
        <div>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );

  const RankTable = ({ title, data }: { title: string; data: Record<string, number> }) => (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => (
          <div key={k} className="flex justify-between py-1 border-b border-border last:border-0">
            <span className="text-sm truncate">{k || 'N/A'}</span>
            <span className="text-sm font-bold text-primary">{v}</span>
          </div>
        ))}
        {Object.keys(data).length === 0 && <p className="text-sm text-muted-foreground">Sem dados</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <GitBranch className="w-7 h-7 text-primary" /> Análise & Insights
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total Perdas" value={formatCurrency(totalPerdas)} color="text-destructive" />
        <StatCard icon={TrendingUp} label="Recuperado" value={formatCurrency(totalRecuperado)} sub={`${taxaRecuperacao}% de recuperação`} color="text-success" />
        <StatCard icon={TrendingDown} label="Perdas Evitadas/Ano" value={formatCurrency(totalEvitado)} color="text-primary" />
        <StatCard icon={AlertTriangle} label="GUT Médio Riscos" value={avgGut} sub={`${taxaConformidade}% conformidade`} color="text-warning" />
      </div>

      {/* New Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Top 5 Tipos de Ocorrência (Radar)</CardTitle></CardHeader>
          <CardContent className="h-72">
            {top5Types.labels.length > 0 ? <Radar data={radarData} options={radarOpts} /> : <p className="text-sm text-muted-foreground">Sem dados suficientes</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Riscos por Planta / Local</CardTitle></CardHeader>
          <CardContent className="h-72">
            {plantPriority.labels.length > 0 ? <Doughnut data={doughnutData} options={doughnutOpts} /> : <p className="text-sm text-muted-foreground">Sem dados suficientes</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RankTable title="Casos por Tipo de Ocorrência" data={byType} />
        <RankTable title="Casos por Status" data={byStatus} />
        <RankTable title="Casos por Unidade" data={byUnit} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankTable title="Tendência Mensal (Casos)" data={byMonth} />
        <Card>
          <CardHeader><CardTitle className="text-sm">Resumo Operacional</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between"><span className="text-sm">Total de Casos</span><span className="font-bold text-primary">{cases.length}</span></div>
            <div className="flex justify-between"><span className="text-sm">Checklists Realizados</span><span className="font-bold text-primary">{checklists.length}</span></div>
            <div className="flex justify-between"><span className="text-sm">Riscos Mapeados</span><span className="font-bold text-primary">{risks.length}</span></div>
            <div className="flex justify-between"><span className="text-sm">Itens de Inspeção</span><span className="font-bold text-primary">{allItems.length}</span></div>
            <div className="flex justify-between"><span className="text-sm">Não Conformidades</span><span className="font-bold text-destructive">{allItems.filter((i: any) => i.status === 'nao_conforme').length}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
