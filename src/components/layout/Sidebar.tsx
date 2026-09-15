import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useApp } from '@/contexts/AppContext';
import {
  BarChart3, FolderOpen, CheckSquare, Shield, Search,
  GitBranch, History, CalendarDays, MessageCircle,
  User, UserCog, HardHat, Briefcase, Eye, Lock, Wrench, Truck, HeartPulse,
  PanelLeftClose, PanelLeftOpen,
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
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);

  // Em telas estreitas a barra inicia recolhida para o conteúdo caber na tela
  useEffect(() => {
    setCollapsed(isMobile);
  }, [isMobile]);

  const UserIcon = ICON_MAP[currentUser.icon] || User;
  const accentColor = ACCENT_COLOR_MAP[(currentUser as any).accentColor || 'cyan'] || ACCENT_COLOR_MAP.cyan;

  return (
    <aside
      className={`relative flex flex-col shrink-0 bg-card border-r border-border h-screen transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56 lg:w-64'
      }`}
    >
      {/* Toggle flutuante */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expandir barra lateral' : 'Ocultar barra lateral'}
        className="absolute -right-3 top-20 z-40 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary shadow-md"
      >
        {collapsed
          ? <PanelLeftOpen className="w-3.5 h-3.5" />
          : <PanelLeftClose className="w-3.5 h-3.5" />}
      </button>

      <div className="h-16 flex items-center justify-center text-2xl font-bold overflow-hidden">
        {collapsed
          ? <span className="text-primary">A</span>
          : <>SYN<span className="text-primary">A</span>PSE</>}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto synapse-scrollbar">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'px-4'} py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-3">
        <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center bg-secondary shrink-0"
            style={{ color: accentColor }}
          >
            <UserIcon className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground truncate">{currentUser.role}</p>
            </div>
          )}
        </div>

        {!collapsed && <InstallPWA />}
      </div>
    </aside>
  );
}
