import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/lib/localDB';
import KpiCard from '@/components/dashboard/KpiCard';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import { ClipboardList, Clock, CheckCircle, TrendingDown, TrendingUp, Shield } from 'lucide-react';

export default function DashboardPage() {
  const { cases } = useApp();

  const openCases = cases.filter(c => c.STATUS !== 'FINALIZADO');
  const totalLoss = cases.reduce((sum, c) => sum + (parseFloat(String(c.VALOR_PERDA)) || 0), 0);
  const totalRecovered = cases.reduce((sum, c) => sum + (parseFloat(String(c.VALOR_RECUPERADO)) || 0), 0);
  const totalAvoided = cases.reduce((sum, c) => sum + (parseFloat(String(c.PERDA_EVITADA_ANUAL)) || 0), 0);

  const unitsWithCases = cases.reduce((acc, c) => {
    if (c.UNIDADE) acc[c.UNIDADE] = (acc[c.UNIDADE] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedUnits = Object.entries(unitsWithCases).sort(([, a], [, b]) => b - a);

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-6">Dashboard Analítico de Segurança</h1>

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

        {/* Units Card */}
        <div className="bg-card p-5 rounded-lg border border-border col-span-1 sm:col-span-2">
          <h3 className="font-semibold text-lg mb-2 text-primary">Casos por Unidade</h3>
          <ul className="space-y-1 text-xs max-h-24 overflow-y-auto synapse-scrollbar">
            {sortedUnits.length > 0 ? sortedUnits.map(([name, count]) => (
              <li key={name}>{name} <span className="text-primary font-bold">({count})</span></li>
            )) : <li className="text-muted-foreground">Nenhum caso.</li>}
          </ul>
        </div>
      </div>

      <DashboardCharts cases={cases} />
    </div>
  );
}
