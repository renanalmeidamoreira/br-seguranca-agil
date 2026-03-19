// === NOVO: Modal de gerenciamento de perfil de usuário ===
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User, UserCog, Shield, HardHat, Briefcase,
  Eye, Lock, Wrench, Truck, HeartPulse
} from 'lucide-react';

const AVATAR_ICONS = [
  { id: 'user', Icon: User, label: 'Usuário' },
  { id: 'user-cog', Icon: UserCog, label: 'Técnico' },
  { id: 'shield', Icon: Shield, label: 'Segurança' },
  { id: 'hard-hat', Icon: HardHat, label: 'Engenheiro' },
  { id: 'briefcase', Icon: Briefcase, label: 'Executivo' },
  { id: 'eye', Icon: Eye, label: 'Observador' },
  { id: 'lock', Icon: Lock, label: 'Proteção' },
  { id: 'wrench', Icon: Wrench, label: 'Manutenção' },
  { id: 'truck', Icon: Truck, label: 'Logística' },
  { id: 'heart-pulse', Icon: HeartPulse, label: 'Saúde' },
];

const ACCENT_COLORS = [
  { id: 'cyan', value: 'hsl(187, 72%, 53%)' },
  { id: 'green', value: 'hsl(160, 84%, 39%)' },
  { id: 'orange', value: 'hsl(25, 95%, 53%)' },
  { id: 'blue', value: 'hsl(217, 91%, 60%)' },
  { id: 'red', value: 'hsl(0, 84%, 60%)' },
  { id: 'purple', value: 'hsl(271, 91%, 65%)' },
];

export interface UserProfileData {
  name: string;
  role: string;
  icon: string;
  accentColor: string;
  password?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  users: UserProfileData[];
  onSave: (users: UserProfileData[]) => void;
  editIndex: number | null;
}

export default function UserProfileModal({ open, onClose, users, onSave, editIndex }: Props) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [icon, setIcon] = useState('user');
  const [accentColor, setAccentColor] = useState('cyan');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (editIndex !== null && users[editIndex]) {
      const u = users[editIndex];
      setName(u.name);
      setRole(u.role);
      setIcon(u.icon || 'user');
      setAccentColor(u.accentColor || 'cyan');
      setPassword(u.password || '');
    } else {
      setName('');
      setRole('');
      setIcon('user');
      setAccentColor('cyan');
      setPassword('');
    }
  }, [editIndex, users, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    const updated = [...users];
    const profile: UserProfileData = {
      name: name.trim(),
      role: role.trim(),
      icon,
      accentColor,
      password: password.trim() || undefined,
    };
    if (editIndex !== null) {
      updated[editIndex] = profile;
    } else {
      updated.push(profile);
    }
    onSave(updated);
    onClose();
  };

  const handleDelete = () => {
    if (editIndex === null || users.length <= 1) return;
    const updated = users.filter((_, i) => i !== editIndex);
    onSave(updated);
    onClose();
  };

  const selectedColor = ACCENT_COLORS.find(c => c.id === accentColor)?.value || ACCENT_COLORS[0].value;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editIndex !== null ? 'Editar Perfil' : 'Novo Usuário'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome completo *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do usuário" className="mt-1" />
          </div>
          <div>
            <Label>Cargo / Função</Label>
            <Input value={role} onChange={e => setRole(e.target.value)} placeholder="Ex: Analista de Segurança" className="mt-1" />
          </div>
          <div>
            <Label>Senha (opcional)</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Deixe vazio para acesso livre" className="mt-1" />
          </div>
          <div>
            <Label className="mb-2 block">Ícone / Avatar</Label>
            <div className="grid grid-cols-5 gap-2">
              {AVATAR_ICONS.map(({ id, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIcon(id)}
                  className={`p-3 rounded-lg border-2 flex items-center justify-center transition-all ${
                    icon === id
                      ? 'border-primary bg-primary/20'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" style={{ color: icon === id ? selectedColor : undefined }} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Cor de destaque</Label>
            <div className="flex gap-2">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAccentColor(c.id)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    accentColor === c.id ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1">Salvar</Button>
            {editIndex !== null && users.length > 1 && (
              <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
