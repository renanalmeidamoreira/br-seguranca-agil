import { useApp } from '@/contexts/AppContext';
import { USERS, localDB } from '@/lib/localDB';
import {
  BarChart3, FolderOpen, CheckSquare, Shield, Search,
  GitBranch, History, CalendarDays, Settings,
  User, UserCog, HardHat, Briefcase, Eye, Lock, Wrench, Truck, HeartPulse
} from 'lucide-react';
import { useState } from 'react';
import UserProfileModal, { type UserProfileData } from '@/components/users/UserProfileModal';
import PasswordSwitchModal from '@/components/users/PasswordSwitchModal';
import InstallPWA from '@/components/pwa/InstallPWA';
import type { LucideIcon } from 'lucide-react';

const navItems = [
  { id: 'cronograma', label: 'Cronograma Anual', icon: CalendarDays },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'casos', label: 'Gestão de Casos', icon: FolderOpen },
  { id: 'checklist', label: 'Checklist', icon: CheckSquare },
  { id: 'risco', label: 'Avaliação de Risco', icon: Shield },
  { id: 'busca', label: 'Busca Integrada', icon: Search },
  { id: 'analise', label: 'Análise & Insights', icon: GitBranch },
  { id: 'logs', label: 'Logs de Atividade', icon: History },
];

const ICON_MAP: Record<string, LucideIcon> = {
  'user': User,
  'user-cog': UserCog,
  'shield': Shield,
  'hard-hat': HardHat,
  'briefcase': Briefcase,
  'eye': Eye,
  'lock': Lock,
  'wrench': Wrench,
  'truck': Truck,
  'heart-pulse': HeartPulse,
};

const ACCENT_COLOR_MAP: Record<string, string> = {
  cyan: 'hsl(187, 72%, 53%)',
  green: 'hsl(160, 84%, 39%)',
  orange: 'hsl(25, 95%, 53%)',
  blue: 'hsl(217, 91%, 60%)',
  red: 'hsl(0, 84%, 60%)',
  purple: 'hsl(271, 91%, 65%)',
};

export default function Sidebar() {
  const { activePage, setActivePage, currentUser, currentUserIndex, switchUser } = useApp();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  // === NOVO: Estado para modal de senha ===
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingSwitchIndex, setPendingSwitchIndex] = useState<number | null>(null);

  const users: UserProfileData[] = USERS.map(u => ({
    ...u,
    accentColor: (u as any).accentColor || 'cyan',
    password: (u as any).password,
  }));

  const handleSaveUsers = (updated: UserProfileData[]) => {
    USERS.length = 0;
    updated.forEach(u => USERS.push({ name: u.name, role: u.role, icon: u.icon, ...(u as any) }));
    localDB.save('synapse_offline_userProfiles', updated);
    if (currentUserIndex >= USERS.length) switchUser(0);
  };

  // === NOVO: Troca de usuário com verificação de senha ===
  const handleUserSwitch = (newIndex: number) => {
    if (newIndex === currentUserIndex) return;
    const targetUser = users[newIndex];
    if (targetUser?.password) {
      setPendingSwitchIndex(newIndex);
      setPasswordModalOpen(true);
    } else {
      switchUser(newIndex);
    }
  };

  const handlePasswordConfirm = (password: string): boolean => {
    if (pendingSwitchIndex === null) return false;
    const targetUser = users[pendingSwitchIndex];
    if (targetUser?.password === password) {
      switchUser(pendingSwitchIndex);
      setPasswordModalOpen(false);
      setPendingSwitchIndex(null);
      return true;
    }
    return false;
  };

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

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Trocar Usuário</label>
          <select
            value={currentUserIndex}
            onChange={e => handleUserSwitch(Number(e.target.value))}
            className="w-full text-sm rounded-lg px-2 py-1 bg-secondary border-border border"
          >
            {USERS.map((user, i) => (
              <option key={i} value={i}>{user.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => { setEditIndex(currentUserIndex); setProfileModalOpen(true); }}
          className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-md hover:bg-secondary/50"
        >
          <Settings className="w-3 h-3" />
          Gerenciar Perfil
        </button>

        <InstallPWA />

        <UserProfileModal
          open={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          users={users}
          onSave={handleSaveUsers}
          editIndex={editIndex}
        />

        {/* === NOVO: Modal de senha para troca === */}
        <PasswordSwitchModal
          open={passwordModalOpen}
          userName={pendingSwitchIndex !== null ? users[pendingSwitchIndex]?.name || '' : ''}
          onConfirm={handlePasswordConfirm}
          onClose={() => { setPasswordModalOpen(false); setPendingSwitchIndex(null); }}
        />
      </div>
    </aside>
  );
}
