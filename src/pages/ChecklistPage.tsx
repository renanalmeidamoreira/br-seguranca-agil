import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { localDB, DB_KEYS, formatDate, formatDateTime, generateSequentialDisplayId } from '@/lib/localDB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Plus, Trash2, Eye, ChevronDown, ChevronUp, ClipboardCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ChecklistItem {
  description: string;
  status: 'conforme' | 'nao_conforme' | 'nao_aplicavel' | 'pendente';
  observation: string;
}

interface Checklist {
  id: string;
  displayId: string;
  title: string;
  local: string;
  inspector: string;
  date: string;
  createdAt: string;
  status: 'aberto' | 'concluido';
  items: ChecklistItem[];
}

const STATUS_COLORS: Record<string, string> = {
  conforme: 'bg-success/20 text-success',
  nao_conforme: 'bg-destructive/20 text-destructive',
  nao_aplicavel: 'bg-muted text-muted-foreground',
  pendente: 'bg-warning/20 text-warning',
};

const STATUS_LABELS: Record<string, string> = {
  conforme: 'Conforme',
  nao_conforme: 'Não Conforme',
  nao_aplicavel: 'N/A',
  pendente: 'Pendente',
};

const DEFAULT_ITEMS: string[] = [
  'Câmeras de CFTV operacionais',
  'Iluminação perimetral adequada',
  'Cercas e barreiras íntegras',
  'Controle de acesso funcionando',
  'Alarmes testados e ativos',
  'Extintores dentro da validade',
  'Saídas de emergência desobstruídas',
  'Sinalização de segurança visível',
  'EPIs disponíveis e em bom estado',
  'Registro de visitantes atualizado',
  'Ronda patrimonial em dia',
  'Comunicação rádio operacional',
];

export default function ChecklistPage() {
  const { currentUser, log, showAlert } = useApp();
  const [checklists, setChecklists] = useState<Checklist[]>(() => localDB.load<Checklist>(DB_KEYS.checklists));
  const [showForm, setShowForm] = useState(false);
  const [viewChecklist, setViewChecklist] = useState<Checklist | null>(null);
  const [editChecklist, setEditChecklist] = useState<Checklist | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [local, setLocal] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>(
    DEFAULT_ITEMS.map(d => ({ description: d, status: 'pendente', observation: '' }))
  );

  const refresh = () => setChecklists(localDB.load<Checklist>(DB_KEYS.checklists));

  const handleCreate = () => {
    if (!title.trim() || !local.trim()) {
      showAlert('Preencha título e local.', 'warning');
      return;
    }
    const all = localDB.load<Checklist>(DB_KEYS.checklists);
    const newChecklist: Checklist = {
      id: crypto.randomUUID(),
      displayId: generateSequentialDisplayId('CHK', all),
      title: title.trim(),
      local: local.trim(),
      inspector: currentUser.name,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      status: 'aberto',
      items,
    };
    localDB.add(DB_KEYS.checklists, newChecklist);
    log(`Criou checklist: ${newChecklist.displayId}`);
    showAlert('Checklist criado com sucesso!', 'success');
    resetForm();
    refresh();
  };

  const resetForm = () => {
    setTitle('');
    setLocal('');
    setItems(DEFAULT_ITEMS.map(d => ({ description: d, status: 'pendente', observation: '' })));
    setShowForm(false);
  };

  const handleFinalize = (checklist: Checklist) => {
    const updated = { ...checklist, status: 'concluido' as const };
    localDB.update(DB_KEYS.checklists, updated);
    log(`Finalizou checklist: ${checklist.displayId}`);
    showAlert('Checklist finalizado!', 'success');
    refresh();
    setEditChecklist(null);
  };

  const handleDeleteChecklist = (id: string) => {
    localDB.delete(DB_KEYS.checklists, id);
    showAlert('Checklist excluído.', 'warning');
    refresh();
  };

  const updateItemStatus = (index: number, status: ChecklistItem['status']) => {
    if (!editChecklist) return;
    const newItems = [...editChecklist.items];
    newItems[index] = { ...newItems[index], status };
    const updated = { ...editChecklist, items: newItems };
    setEditChecklist(updated);
    localDB.update(DB_KEYS.checklists, updated);
  };

  const updateItemObs = (index: number, observation: string) => {
    if (!editChecklist) return;
    const newItems = [...editChecklist.items];
    newItems[index] = { ...newItems[index], observation };
    const updated = { ...editChecklist, items: newItems };
    setEditChecklist(updated);
    localDB.update(DB_KEYS.checklists, updated);
  };

  const stats = useMemo(() => {
    const total = checklists.length;
    const abertos = checklists.filter(c => c.status === 'aberto').length;
    const concluidos = checklists.filter(c => c.status === 'concluido').length;
    const allItems = checklists.flatMap(c => c.items);
    const naoConformes = allItems.filter(i => i.status === 'nao_conforme').length;
    return { total, abertos, concluidos, naoConformes };
  }, [checklists]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-7 h-7 text-primary" />
          Checklist de Inspeção
        </h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" /> Nova Inspeção
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-primary' },
          { label: 'Em Aberto', value: stats.abertos, color: 'text-warning' },
          { label: 'Concluídos', value: stats.concluidos, color: 'text-success' },
          { label: 'Não Conformes', value: stats.naoConformes, color: 'text-destructive' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Nova Inspeção</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Título</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Inspeção Mensal CD-01" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Local</label>
                <Input value={local} onChange={e => setLocal(e.target.value)} placeholder="Ex: Centro de Distribuição SP" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Itens de verificação ({items.length})</p>
              <div className="space-y-2 max-h-60 overflow-y-auto synapse-scrollbar">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-secondary/50 rounded p-2">
                    <Input
                      value={item.description}
                      onChange={e => {
                        const n = [...items];
                        n[i] = { ...n[i], description: e.target.value };
                        setItems(n);
                      }}
                      className="flex-1 text-sm"
                    />
                    <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setItems([...items, { description: '', status: 'pendente', observation: '' }])}>
                <Plus className="w-3 h-3 mr-1" /> Adicionar Item
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Salvar Checklist</Button>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <div className="space-y-3">
        {checklists.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum checklist registrado. Clique em "Nova Inspeção" para começar.</CardContent></Card>
        ) : (
          checklists.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(cl => {
            const conformes = cl.items.filter(i => i.status === 'conforme').length;
            const total = cl.items.length;
            const pct = total ? Math.round((conformes / total) * 100) : 0;
            return (
              <Card key={cl.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-primary">{cl.displayId}</span>
                        <Badge className={cl.status === 'concluido' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}>
                          {cl.status === 'concluido' ? 'Concluído' : 'Em Aberto'}
                        </Badge>
                      </div>
                      <p className="font-semibold">{cl.title}</p>
                      <p className="text-sm text-muted-foreground">{cl.local} • {cl.inspector} • {formatDate(cl.date)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{pct}%</p>
                        <p className="text-xs text-muted-foreground">Conforme</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewChecklist(cl)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditChecklist(cl)}><CheckSquare className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteChecklist(cl.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* View Modal */}
      <Dialog open={!!viewChecklist} onOpenChange={() => setViewChecklist(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewChecklist?.displayId} - {viewChecklist?.title}</DialogTitle></DialogHeader>
          {viewChecklist && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{viewChecklist.local} • {viewChecklist.inspector} • {formatDate(viewChecklist.date)}</p>
              {viewChecklist.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-secondary/50 rounded">
                  <span className="text-sm">{item.description}</span>
                  <Badge className={STATUS_COLORS[item.status]}>{STATUS_LABELS[item.status]}</Badge>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editChecklist} onOpenChange={() => setEditChecklist(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Preencher: {editChecklist?.displayId}</DialogTitle></DialogHeader>
          {editChecklist && (
            <div className="space-y-3">
              {editChecklist.items.map((item, i) => (
                <div key={i} className="p-3 bg-secondary/30 rounded space-y-2">
                  <p className="text-sm font-medium">{item.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    {(['conforme', 'nao_conforme', 'nao_aplicavel'] as const).map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={item.status === s ? 'default' : 'outline'}
                        className={item.status === s ? STATUS_COLORS[s] : ''}
                        onClick={() => updateItemStatus(i, s)}
                      >
                        {STATUS_LABELS[s]}
                      </Button>
                    ))}
                  </div>
                  {item.status === 'nao_conforme' && (
                    <Input
                      placeholder="Observação sobre a não conformidade..."
                      value={item.observation}
                      onChange={e => updateItemObs(i, e.target.value)}
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => handleFinalize(editChecklist)} className="bg-success hover:bg-success/80">Finalizar Inspeção</Button>
                <Button variant="outline" onClick={() => setEditChecklist(null)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
