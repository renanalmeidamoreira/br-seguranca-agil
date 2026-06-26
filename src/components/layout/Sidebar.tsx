import { useApp } from '@/contexts/AppContext';
import {
  BarChart3, FolderOpen, CheckSquare, Shield, Search,
  GitBranch, History, CalendarDays, MessageCircle,
  User, UserCog, HardHat, Briefcase, Eye, Lock, Wrench, Truck, HeartPulse,
} from 'lucide-react';
import InstallPWA from '@/components/pwa/InstallPWA';
import type { LucideIcon } from 'lucide-react';

const navItems = [
  { id: 'cronograma', label: 'Cronograma Anual', icon: CalendarDays },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'casos', label: 'Gestão de Casos', icon: FolderOpen },
  { id: 'checklist', label: 'Checklist', icon: CheckSquare },
  { id: 'risco', label: 'Avaliação de Risco', icon: Shield },
  { id: 'busca', label: 'Busca Integrada', icon: Search },
  { id: 'telegram', label: 'Inteligência Telegram', icon: MessageCircle },
  { id: 'analise', label: 'Análise & Insights', icon: GitBranch },
  { id: 'logs', label: 'Logs de Atividade', icon: History },
];

const ICON_MAP: Record<string, LucideIcon> = {
  'user': User, 'user-cog': UserCog, 'shield': Shield, 'hard-hat': HardHat,
  'briefcase': Briefcase, 'eye': Eye, 'lock': Lock, 'wrench': Wrench,
  'truck': Truck, 'heart-pulse': HeartPulse,
};

const ACCENT_COLOR_MAP: Record<string, string> = {
  cyan: 'hsl(187, 72%, 53%)', green: 'hsl(160, 84%, 39%)',
  orange: 'hsl(25, 95%, 53%)', blue: 'hsl(217, 91%, 60%)',
  red: 'hsl(0, 84%, 60%)', purple: 'hsl(271, 91%, 65%)',
};

export default function Sidebar() {
  const { activePage, setActivePage, currentUser } = useApp();
  const UserIcon = ICON_MAP[currentUser.icon] || User;
  const accentColor = ACCENT_COLOR_MAP[(currentUser as any).accentColor || 'cyan'] || ACCENT_COLOR_MAP.cyan;

  return (
    <aside className="w-64 flex flex-col bg-card border-r border-border h-screen">
      <div className="h-16 flex items-center justify-center text-2xl font-bold">
        SYN<span className="text-primary">A</span>PSE
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto synapse-scrollbar">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center px-4 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center bg-secondary"
            style={{ color: accentColor }}
          >
            <UserIcon className="w-5 h-5" />
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground truncate">{currentUser.role}</p>
          </div>
        </div>

        <InstallPWA />
      </div>
    </aside>
  );
}
