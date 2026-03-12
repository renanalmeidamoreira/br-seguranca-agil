import React from 'react';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBgClass?: string;
}

export default function KpiCard({ icon, label, value, iconBgClass = 'bg-primary/20 text-primary' }: KpiCardProps) {
  return (
    <div className="bg-card p-5 rounded-lg border border-border flex items-center">
      <div className={`p-3 rounded-full mr-4 text-xl ${iconBgClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
