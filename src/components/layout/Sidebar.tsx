import { useApp } from '@/contexts/AppContext';
import { USERS } from '@/lib/localDB';
import {
  BarChart3, FolderOpen, CheckSquare, Shield, Search,
  GitBranch, Send, UserX, History, CalendarDays
} from 'lucide-react';

const navItems = [
  { id: 'cronograma', label: 'Cronograma Anual', icon: CalendarDays },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'casos', label: 'Gestão de Casos', icon: FolderOpen },
  { id: 'checklist', label: 'Checklist', icon: CheckSquare },
  { id: 'risco', label: 'Avaliação de Risco', icon: Shield },
  { id: 'busca', label: 'Busca Integrada', icon: Search },
  { id: 'analise', label: 'Análise & Insights', icon: GitBranch },
  { id: 'drones', label: 'Missões de Drone', icon: Send },
  { id: 'confidencial', label: 'Operações Confidenciais', icon: UserX },
  { id: 'logs', label: 'Logs de Atividade', icon: History },
];

export default function Sidebar() {
  const { activePage, setActivePage, currentUser, currentUserIndex, switchUser } = useApp();

  return (
    <aside className="w-64 flex flex-col bg-card border-r border-border h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center text-2xl font-bold">
        SYN<span className="text-primary">A</span>PSE
      </div>

      {/* Navigation */}
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

      {/* User Area */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center mb-4">
          <div className="h-10 w-10 rounded-full flex items-center justify-center bg-secondary text-primary text-lg font-bold">
            {currentUser.name.charAt(0)}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground">{currentUser.role}</p>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Trocar Usuário</label>
          <select
            value={currentUserIndex}
            onChange={e => switchUser(Number(e.target.value))}
            className="w-full text-sm rounded-lg px-2 py-1 bg-secondary border-border border"
          >
            {USERS.map((user, i) => (
              <option key={i} value={i}>{user.name}</option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
}
