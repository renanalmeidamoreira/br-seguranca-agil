// === Configurações do perfil do usuário (avatar, nome, cargo, cor, foto) ===
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User, UserCog, Shield, HardHat, Briefcase,
  Eye, Lock, Wrench, Truck, HeartPulse, Upload, Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserProfileSettings } from '@/contexts/AppContext';

export const AVATAR_ICONS: { id: string; Icon: LucideIcon; label: string }[] = [
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

export const ACCENT_COLORS = [
  { id: 'cyan', value: 'hsl(187, 72%, 53%)' },
  { id: 'green', value: 'hsl(160, 84%, 39%)' },
  { id: 'orange', value: 'hsl(25, 95%, 53%)' },
  { id: 'blue', value: 'hsl(217, 91%, 60%)' },
  { id: 'red', value: 'hsl(0, 84%, 60%)' },
  { id: 'purple', value: 'hsl(271, 91%, 65%)' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  profile: UserProfileSettings;
  onSave: (profile: UserProfileSettings) => void;
}

export default function ProfileSettingsModal({ open, onClose, profile, onSave }: Props) {
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [unit, setUnit] = useState(profile.unit || '');
  const [icon, setIcon] = useState(profile.icon || 'shield');
  const [accentColor, setAccentColor] = useState(profile.accentColor || 'cyan');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile.avatarUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(profile.name);
    setRole(profile.role);
    setUnit(profile.unit || '');
    setIcon(profile.icon || 'shield');
    setAccentColor(profile.accentColor || 'cyan');
    setAvatarUrl(profile.avatarUrl);
  }, [open, profile]);

  const handleFile = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const selectedColor = ACCENT_COLORS.find(c => c.id === accentColor)?.value || ACCENT_COLORS[0].value;
  const ActiveIcon = AVATAR_ICONS.find(a => a.id === icon)?.Icon || Shield;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      role: role.trim(),
      unit: unit.trim() || undefined,
      icon,
      accentColor,
      avatarUrl,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto synapse-scrollbar">
        <DialogHeader>
          <DialogTitle>Configurações do Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="h-16 w-16 rounded-full overflow-hidden bg-secondary flex items-center justify-center shrink-0 border-2"
              style={{ color: selectedColor, borderColor: selectedColor }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt={`Foto de perfil de ${name || 'usuário'}`} className="w-full h-full object-cover" />
                : <ActiveIcon className="w-8 h-8" />}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFile(e.target.files?.[0])}
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Enviar foto
              </Button>
              {avatarUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarUrl(undefined)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Remover
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label>Nome completo *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do usuário" className="mt-1" />
          </div>
          <div>
            <Label>Cargo / Função</Label>
            <Input value={role} onChange={e => setRole(e.target.value)} placeholder="Ex: Assistente de Segurança Corporativa" className="mt-1" />
          </div>
          <div>
            <Label>Unidade</Label>
            <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Ex: Unidade Fabril VRB" className="mt-1" />
          </div>

          <div>
            <Label className="mb-2 block">Ícone / Avatar</Label>
            <div className="grid grid-cols-5 gap-2">
              {AVATAR_ICONS.map(({ id, Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  title={label}
                  onClick={() => setIcon(id)}
                  className={`p-3 rounded-lg border-2 flex items-center justify-center transition-all ${
                    icon === id ? 'border-primary bg-primary/20' : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" style={{ color: icon === id ? selectedColor : undefined }} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Cor de destaque</Label>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  aria-label={`Cor ${c.id}`}
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
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
