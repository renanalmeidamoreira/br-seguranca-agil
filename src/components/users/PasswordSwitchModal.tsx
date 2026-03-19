// === NOVO: Modal de senha para troca de usuário ===
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  userName: string;
  onConfirm: (password: string) => boolean;
  onClose: () => void;
}

export default function PasswordSwitchModal({ open, userName, onConfirm, onClose }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onConfirm(password);
    if (ok) {
      setPassword('');
      setError(false);
    } else {
      setError(true);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Autenticação necessária</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Digite a senha para acessar o perfil de <strong>{userName}</strong>
          </p>
          <div>
            <Label>Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false); }}
              placeholder="Digite a senha"
              className="mt-1"
              autoFocus
            />
            {error && <p className="text-destructive text-xs mt-1">Senha incorreta</p>}
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Confirmar</Button>
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
