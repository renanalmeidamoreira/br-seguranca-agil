import { useState, useMemo } from 'react';
import { localDB, DB_KEYS, formatDateTime } from '@/lib/localDB';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Trash2, Download, FileSpreadsheet } from 'lucide-react';
// === NOVA FUNCIONALIDADE: Exportação para Excel ===
import { exportRowsToExcel } from '@/lib/exportExcel';
// === NOVA FUNCIONALIDADE: Confirmação para limpar logs ===
import { ConfirmDeleteDialog } from '@/components/ui/confirm-dialog';

interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>(() => localDB.load<ActivityLog>(DB_KEYS.activityLogs));
  const [filter, setFilter] = useState('');
  // === NOVA FUNCIONALIDADE: Estado do modal de confirmação ===
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = () => setLogs(localDB.load<ActivityLog>(DB_KEYS.activityLogs));

  const filtered = useMemo(() => {
    if (!filter) return logs;
    const q = filter.toLowerCase();
    return logs.filter(l => `${l.user} ${l.action}`.toLowerCase().includes(q));
  }, [logs, filter]);

  const clearLogs = () => {
    localDB.save(DB_KEYS.activityLogs, []);
    refresh();
  };

  const exportLogs = () => {
    const csv = ['Timestamp,Usuário,Ação', ...filtered.map(l => `${l.timestamp},"${l.user}","${l.action}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'logs_atividade.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const users = [...new Set(logs.map(l => l.user))];
  const today = new Date().toISOString().split('T')[0];
  const todayCount = logs.filter(l => l.timestamp.startsWith(today)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-7 h-7 text-primary" /> Logs de Atividade
        </h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportLogs}><Download className="w-4 h-4 mr-1" /> Exportar CSV</Button>
          {/* === NOVA FUNCIONALIDADE: Exportar Excel (respeita filtro) === */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const rows = filtered.map(l => ({
                'Data/Hora': l.timestamp,
                Usuário: l.user,
                Ação: l.action,
              }));
              exportRowsToExcel(rows, 'synapse_logs', 'Logs');
            }}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
          </Button>
          {/* === NOVA FUNCIONALIDADE: Confirmação antes de limpar logs === */}
          <Button variant="destructive" size="sm" onClick={() => setConfirmClear(true)}>
            <Trash2 className="w-4 h-4 mr-1" /> Limpar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-3xl font-bold text-primary">{logs.length}</p>
          <p className="text-xs text-muted-foreground">Total de Registros</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-3xl font-bold text-warning">{todayCount}</p>
          <p className="text-xs text-muted-foreground">Ações Hoje</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-3xl font-bold text-success">{users.length}</p>
          <p className="text-xs text-muted-foreground">Usuários Ativos</p>
        </CardContent></Card>
      </div>

      <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar por usuário ou ação..." />

      <div className="space-y-1 max-h-[60vh] overflow-y-auto synapse-scrollbar">
        {filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((log, i) => (
          <div key={log.id || i} className="flex items-center gap-3 p-2 rounded hover:bg-secondary/30 text-sm border-b border-border/50">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(log.timestamp)}</span>
            <Badge variant="outline" className="shrink-0">{log.user}</Badge>
            <span className="truncate">{log.action}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</p>
        )}
      </div>

      {/* === NOVA FUNCIONALIDADE: Modal de confirmação de exclusão de logs === */}
      <ConfirmDeleteDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        itemLabel={`todos os ${logs.length} registros de log`}
        description="Tem certeza que deseja excluir TODOS os logs de atividade? Esta ação não pode ser desfeita."
        onConfirm={() => { clearLogs(); setConfirmClear(false); }}
      />
    </div>
  );
}
