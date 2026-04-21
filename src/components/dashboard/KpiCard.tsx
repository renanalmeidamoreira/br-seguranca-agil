import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBgClass?: string;
  // === NOVA FUNCIONALIDADE: Tooltip explicativo nos KPIs ===
  description?: string;
  formula?: string;
  example?: string;
}

export default function KpiCard({
  icon, label, value, iconBgClass = 'bg-primary/20 text-primary',
  description, formula, example,
}: KpiCardProps) {
  const hasInfo = description || formula || example;

  return (
    <div className="bg-card p-5 rounded-lg border border-border flex items-center relative">
      <div className={`p-3 rounded-full mr-4 text-xl ${iconBgClass}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
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
                {example && (
                  <p className="text-xs text-muted-foreground italic">Ex.: {example}</p>
                )}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-2xl font-bold truncate">{value}</p>
      </div>
    </div>
  );
}
