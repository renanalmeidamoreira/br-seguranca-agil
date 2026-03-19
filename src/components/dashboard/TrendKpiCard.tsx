// === NOVO: KPI com seta de tendência ===
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendKpiCardProps {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  trendLabel?: string;
}

export default function TrendKpiCard({ label, value, trend, trendLabel }: TrendKpiCardProps) {
  const trendConfig = {
    up: { icon: TrendingUp, color: 'text-success', bg: 'bg-success/20' },
    down: { icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/20' },
    neutral: { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted' },
  };

  const { icon: TrendIcon, color, bg } = trendConfig[trend];

  return (
    <div className="bg-card p-5 rounded-lg border border-border">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <div className="flex items-end gap-3">
        <p className="text-3xl font-bold">{value}</p>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>
          <TrendIcon className="w-3 h-3" />
          {trendLabel}
        </div>
      </div>
    </div>
  );
}
