import { useApp } from '@/contexts/AppContext';
import { useGlobalFilters } from '@/contexts/GlobalFiltersContext';
import { formatCurrency } from '@/lib/localDB';
import KpiCard from '@/components/dashboard/KpiCard';
import TrendKpiCard from '@/components/dashboard/TrendKpiCard';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import HeatmapSection from '@/components/dashboard/HeatmapSection';
import GlobalFiltersBar from '@/components/dashboard/GlobalFiltersBar';
import { ClipboardList, Clock, CheckCircle, TrendingDown, TrendingUp, Shield } from 'lucide-react';
import { useMemo } from 'react';

export default function DashboardPage() {
  const { cases } = useApp();
  // === NOVA FUNCIONALIDADE: Filtros globais aplicados em todo o dashboard ===
  const { applyFilters } = useGlobalFilters();
  const filteredCases = useMemo(() => applyFilters(cases), [applyFilters, cases]);

  const openCases = filteredCases.filter(c => c.STATUS !== 'FINALIZADO');
  const totalLoss = filteredCases.reduce((sum, c) => sum + (parseFloat(String(c.VALOR_PERDA)) || 0), 0);
  const totalRecovered = filteredCases.reduce((sum, c) => sum + (parseFloat(String(c.VALOR_RECUPERADO)) || 0), 0);
  const totalAvoided = filteredCases.reduce((sum, c) => sum + (parseFloat(String(c.PERDA_EVITADA_ANUAL)) || 0), 0);

  // === Performance Mensal e Eficiência ===
  const { monthlyPerformance, efficiency, perfTrend, effTrend, perfTrendLabel, effTrendLabel } = useMemo(() => {
    const now = new Date();
    const monthBuckets: Record<string, { total: number; finished: number }> = {};

    filteredCases.forEach(c => {
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
  }, [filteredCases]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-6">Dashboard Analítico de Segurança</h1>

      {/* === NOVA FUNCIONALIDADE: Barra de filtros globais === */}
      <GlobalFiltersBar cases={cases} />

      {/* Linha 1: 4 KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KpiCard
          icon={<ClipboardList className="w-6 h-6" />}
          label="Total de Casos"
          value={filteredCases.length}
          iconBgClass="bg-primary/20 text-primary"
          description="Quantidade total de ocorrências registradas considerando os filtros ativos."
          formula="Σ casos filtrados"
          example="Se houver 150 casos no período, este indicador mostra 150."
        />
        <KpiCard
          icon={<Clock className="w-6 h-6" />}
          label="Casos em Aberto"
          value={openCases.length}
          iconBgClass="bg-warning/20 text-warning"
          description="Casos cujo status é diferente de FINALIZADO."
          formula="count(STATUS ≠ 'FINALIZADO')"
          example="12 em andamento + 3 em pausa = 15 em aberto."
        />
        <KpiCard
          icon={<CheckCircle className="w-6 h-6" />}
          label="Casos Finalizados"
          value={filteredCases.length - openCases.length}
          iconBgClass="bg-success/20 text-success"
          description="Casos com status FINALIZADO no período filtrado."
          formula="count(STATUS = 'FINALIZADO')"
          example="138 finalizados de 150 totais."
        />
        <KpiCard
          icon={<TrendingDown className="w-6 h-6" />}
          label="Total de Perdas"
          value={formatCurrency(totalLoss)}
          iconBgClass="bg-destructive/20 text-destructive"
          description="Soma do valor financeiro perdido em todos os casos filtrados."
          formula="Σ VALOR_PERDA"
          example="R$ 25.000 + R$ 10.000 = R$ 35.000."
        />
      </div>

      {/* Linha 2: Valores financeiros + KPIs de tendência */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KpiCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Total Recuperado"
          value={formatCurrency(totalRecovered)}
          iconBgClass="bg-success/20 text-success"
          description="Valor total que foi recuperado a partir das ocorrências."
          formula="Σ VALOR_RECUPERADO"
          example="Se 60% das perdas foram recuperadas em R$ 35.000, o valor é R$ 21.000."
        />
        <KpiCard
          icon={<Shield className="w-6 h-6" />}
          label="Perda Evitada (Anual)"
          value={formatCurrency(totalAvoided)}
          iconBgClass="bg-info/20 text-info"
          description="Estimativa anual de perdas evitadas pelas ações de segurança."
          formula="Σ PERDA_EVITADA_ANUAL"
          example="Ações em 3 casos evitaram R$ 120.000/ano."
        />
        <TrendKpiCard
          label="Performance Mensal"
          value={monthlyPerformance}
          trend={perfTrend}
          trendLabel={perfTrendLabel}
          description="Média de casos finalizados por mês no período filtrado."
          formula="total finalizados ÷ nº de meses"
          example="60 finalizados em 6 meses = 10,0 / mês."
        />
        <TrendKpiCard
          label="Eficiência"
          value={efficiency}
          trend={effTrend}
          trendLabel={effTrendLabel}
          description="Percentual médio mensal de casos finalizados sobre o total."
          formula="(finalizados ÷ total) × 100"
          example="138 de 150 = 92,0%."
        />
      </div>

      <DashboardCharts cases={filteredCases} />

      {/* === MAPA DE CALOR === */}
      <HeatmapSection cases={filteredCases} />
    </div>
  );
}
