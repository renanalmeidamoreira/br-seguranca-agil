import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/lib/localDB';
import KpiCard from '@/components/dashboard/KpiCard';
import TrendKpiCard from '@/components/dashboard/TrendKpiCard';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import HeatmapSection from '@/components/dashboard/HeatmapSection';
import { ClipboardList, Clock, CheckCircle, TrendingDown, TrendingUp, Shield } from 'lucide-react';
import { useMemo } from 'react';

export default function DashboardPage() {
  const { cases } = useApp();

  const openCases = cases.filter(c => c.STATUS !== 'FINALIZADO');
  const totalLoss = cases.reduce((sum, c) => sum + (parseFloat(String(c.VALOR_PERDA)) || 0), 0);
  const totalRecovered = cases.reduce((sum, c) => sum + (parseFloat(String(c.VALOR_RECUPERADO)) || 0), 0);
  const totalAvoided = cases.reduce((sum, c) => sum + (parseFloat(String(c.PERDA_EVITADA_ANUAL)) || 0), 0);

  // === NOVO: Performance Mensal e Eficiência ===
  const { monthlyPerformance, efficiency, perfTrend, effTrend, perfTrendLabel, effTrendLabel } = useMemo(() => {
    const now = new Date();
    const monthBuckets: Record<string, { total: number; finished: number }> = {};

    cases.forEach(c => {
      if (!c.DATA) return;
      const d = new Date(c.DATA + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthBuckets[key]) monthBuckets[key] = { total: 0, finished: 0 };
      monthBuckets[key].total++;
      if (c.STATUS === 'FINALIZADO') monthBuckets[key].finished++;
    });

    const sortedMonths = Object.keys(monthBuckets).sort();
    const totalMonths = sortedMonths.length || 1;
    const totalFinished = Object.values(monthBuckets).reduce((s, b) => s + b.finished, 0);
    const avgPerMonth = totalFinished / totalMonths;

    const effValues = sortedMonths.map(m => {
      const b = monthBuckets[m];
      return b.total > 0 ? (b.finished / b.total) * 100 : 0;
    });
    const avgEff = effValues.length > 0 ? effValues.reduce((a, b) => a + b, 0) / effValues.length : 0;

    // Trend: compare last 2 months
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    const curBucket = monthBuckets[currentMonth] || { total: 0, finished: 0 };
    const prevBucket = monthBuckets[prevMonth] || { total: 0, finished: 0 };

    const perfDiff = curBucket.finished - prevBucket.finished;
    const curEff = curBucket.total > 0 ? (curBucket.finished / curBucket.total) * 100 : 0;
    const prevEff = prevBucket.total > 0 ? (prevBucket.finished / prevBucket.total) * 100 : 0;
    const effDiff = curEff - prevEff;

    return {
      monthlyPerformance: avgPerMonth.toFixed(1),
      efficiency: avgEff.toFixed(1) + '%',
      perfTrend: perfDiff > 0 ? 'up' as const : perfDiff < 0 ? 'down' as const : 'neutral' as const,
      effTrend: effDiff > 0 ? 'up' as const : effDiff < 0 ? 'down' as const : 'neutral' as const,
      perfTrendLabel: perfDiff !== 0 ? `${perfDiff > 0 ? '+' : ''}${perfDiff} vs mês anterior` : 'Estável',
      effTrendLabel: effDiff !== 0 ? `${effDiff > 0 ? '+' : ''}${effDiff.toFixed(1)}% vs anterior` : 'Estável',
    };
  }, [cases]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-6">Dashboard Analítico de Segurança</h1>

      {/* Linha 1: 4 KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KpiCard
          icon={<ClipboardList className="w-6 h-6" />}
          label="Total de Casos"
          value={cases.length}
          iconBgClass="bg-primary/20 text-primary"
        />
        <KpiCard
          icon={<Clock className="w-6 h-6" />}
          label="Casos em Aberto"
          value={openCases.length}
          iconBgClass="bg-warning/20 text-warning"
        />
        <KpiCard
          icon={<CheckCircle className="w-6 h-6" />}
          label="Casos Finalizados"
          value={cases.length - openCases.length}
          iconBgClass="bg-success/20 text-success"
        />
        <KpiCard
          icon={<TrendingDown className="w-6 h-6" />}
          label="Total de Perdas"
          value={formatCurrency(totalLoss)}
          iconBgClass="bg-destructive/20 text-destructive"
        />
      </div>

      {/* Linha 2: Valores financeiros + KPIs de tendência */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KpiCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Total Recuperado"
          value={formatCurrency(totalRecovered)}
          iconBgClass="bg-success/20 text-success"
        />
        <KpiCard
          icon={<Shield className="w-6 h-6" />}
          label="Perda Evitada (Anual)"
          value={formatCurrency(totalAvoided)}
          iconBgClass="bg-info/20 text-info"
        />
        {/* === NOVO: Performance Mensal === */}
        <TrendKpiCard
          label="Performance Mensal"
          value={monthlyPerformance}
          trend={perfTrend}
          trendLabel={perfTrendLabel}
        />
        {/* === NOVO: Eficiência === */}
        <TrendKpiCard
          label="Eficiência"
          value={efficiency}
          trend={effTrend}
          trendLabel={effTrendLabel}
        />
      </div>

      <DashboardCharts cases={cases} />
    </div>
  );
}
