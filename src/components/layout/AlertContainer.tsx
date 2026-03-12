import { useApp } from '@/contexts/AppContext';

const typeColors = {
  success: 'border-l-4 border-l-success',
  error: 'border-l-4 border-l-destructive',
  info: 'border-l-4 border-l-info',
  warning: 'border-l-4 border-l-warning',
};

export default function AlertContainer() {
  const { alerts } = useApp();

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[1000] flex flex-col gap-3">
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`max-w-[350px] bg-card text-foreground p-4 rounded-lg shadow-lg alert-slide-in ${typeColors[alert.type]}`}
        >
          {alert.message}
        </div>
      ))}
    </div>
  );
}
