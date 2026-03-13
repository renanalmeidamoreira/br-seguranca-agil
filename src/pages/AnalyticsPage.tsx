import { useMemo } from 'react';
import { localDB, DB_KEYS, CaseData, formatCurrency } from '@/lib/localDB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';

export default function AnalyticsPage() {
  const cases = useMemo(() => localDB.load<CaseData>(DB_KEYS.occurrences), []);
  const checklists = useMemo(() => localDB.load<any>(DB_KEYS.checklists), []);
  const risks = useMemo(() => localDB.load<any>(DB_KEYS.risks), []);

  const totalPerdas = cases.reduce((s, c) => s + (parseFloat(String(c.VALOR_PERDA)) || 0), 0);
  const totalRecuperado = cases.reduce((s, c) => s + (parseFloat(String(c.VALOR_RECUPERADO)) || 0), 0);
  const totalEvitado = cases.reduce((s, c) => s + (parseFloat(String(c.PERDA_EVITADA_ANUAL)) || 0), 0);
  const taxaRecuperacao = totalPerdas > 0 ? ((totalRecuperado / totalPerdas) * 100).toFixed(1) : '0';

  // Cases by type
  const byType: Record<string, number> = {};
  cases.forEach(c => { byType[c.TIPO_DE_OCORRÊNCIA] = (byType[c.TIPO_DE_OCORRÊNCIA] || 0) + 1; });

  // Cases by status
  const byStatus: Record<string, number> = {};
  cases.forEach(c => { byStatus[c.STATUS] = (byStatus[c.STATUS] || 0) + 1; });

  // Cases by unit
  const byUnit: Record<string, number> = {};
  cases.forEach(c => { byUnit[c.UNIDADE] = (byUnit[c.UNIDADE] || 0) + 1; });

  // Monthly trend
  const byMonth: Record<string, number> = {};
  cases.forEach(c => {
    if (c.DATA) {
      const m = c.DATA.slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + 1;
    }
  });

  // Checklist conformity
  const allItems = checklists.flatMap((c: any) => c.items || []);
  const conformes = allItems.filter((i: any) => i.status === 'conforme').length;
  const taxaConformidade = allItems.length > 0 ? ((conformes / allItems.length) * 100).toFixed(1) : '0';

  // Risk score
  const avgGut = risks.length > 0
    ? (risks.reduce((s: number, r: any) => s + (r.gut || 0), 0) / risks.length).toFixed(1)
    : '0';

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
