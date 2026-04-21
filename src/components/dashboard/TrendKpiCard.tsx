// === NOVO: KPI com seta de tendência ===
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TrendKpiCardProps {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  // === NOVA FUNCIONALIDADE: Tooltip explicativo nos KPIs ===
  description?: string;
  formula?: string;
  example?: string;
}

export default function TrendKpiCard({
  label, value, trend, trendLabel,
  description, formula, example,
}: TrendKpiCardProps) {
  const trendConfig = {
    up: { icon: TrendingUp, color: 'text-success', bg: 'bg-success/20' },
    down: { icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/20' },
    neutral: { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted' },
  };

  const { icon: TrendIcon, color, bg } = trendConfig[trend];
  const hasInfo = description || formula || example;

  return (
    <div className="bg-card p-5 rounded-lg border border-border">
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        {hasInfo && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground/70 hover:text-primary transition-colors">
                <Info className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs space-y-1.5">
              {description && <p className="text-xs">{description}</p>}
              {formula && (
                <p className="text-xs">
                  <span className="font-semibold">Fórmula:</span> <code className="text-primary">{formula}</code>
                </p>
              )}
              {example && <p className="text-xs text-muted-foreground italic">Ex.: {example}</p>}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
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
