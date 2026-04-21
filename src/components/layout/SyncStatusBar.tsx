// === SYNC SUPABASE === Painel de status de sincronização
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { syncAll, getSyncInfo, markAllLocalForSync } from '@/lib/syncService';
import { Wifi, WifiOff, RefreshCw, Cloud, Download, Upload, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/localDB';

export default function SyncStatusBar() {
  const { user, signOut } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncInfo, setSyncInfo] = useState(getSyncInfo());
  const [lastResult, setLastResult] = useState('');

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && user) {
      handleSync();
    }
  }, [isOnline, user]);

  // Periodic sync every 2 minutes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (navigator.onLine) handleSync();
    }, 120_000);
    return () => clearInterval(interval);
  }, [user]);

  // Refresh pending count periodically
  useEffect(() => {
    const interval = setInterval(() => setSyncInfo(getSyncInfo()), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = useCallback(async () => {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      const { pushed, pulled } = await syncAll(user.id);
      setLastResult(`↑${pushed} ↓${pulled}`);
      setSyncInfo(getSyncInfo());
    } catch (e) {
      console.error('Sync error:', e);
      setLastResult('Erro');
    }
    setSyncing(false);
  }, [user, syncing]);

  const handleFirstSync = useCallback(async () => {
    markAllLocalForSync();
    await handleSync();
  }, [handleSync]);

  const BACKUP_KEYS = ['synapse_offline_occurrences', 'synapse_offline_checklists', 'synapse_offline_risks', 'synapse_offline_schedules', 'synapse_offline_activityLogs'];

  const handleExportBackup = () => {
    const backup: Record<string, any> = {};
    BACKUP_KEYS.forEach(k => {
      try { backup[k] = JSON.parse(localStorage.getItem(k) || '[]'); } catch { backup[k] = []; }
    });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synapse-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Converte data br "26/06/2024" -> "2024-06-26". Mantém ISO se já estiver ISO.
  const toIsoDate = (s: string): string => {
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return s;
  };

  // Mapeia um caso do schema externo (backup_synapse_completo.json) para o CaseData interno
  const mapExternalCase = (c: any, idx: number): any => {
    const fin = c.financeiro || {};
    const trat = c.tratativas || {};
    const gut = c.gut || {};
    return {
      id: c.id || crypto.randomUUID(),
      displayId: c.id || `CASO-${new Date().getFullYear()}-${String(idx + 1).padStart(4, '0')}`,
      DATA: toIsoDate(c.data || ''),
      LOCAL: c.local || '',
      UNIDADE: c.unidade || '',
      SETOR: c.setor || '',
      'CLIENTE_DA_OCORRÊNCIA': c.cliente || '',
      'DESCRIÇÃO_DA_OCORRÊNCIA': c.descricao || '',
      'TIPO_DE_OCORRÊNCIA': c.tipo_ocorrencia || '',
      'TIPO_DE_OPERAÇÃO': c.tipo_operacao || '',
      GRAVIDADE: gut.gravidade ? String(gut.gravidade) : '',
      case_g: Number(gut.gravidade) || 0,
      case_u: Number(gut.urgencia) || 0,
      case_t: Number(gut.tendencia) || 0,
      ENVOLVIDOS: c.envolvidos_medidas
        ? [{ name: String(c.envolvidos_medidas), measure: '' }]
        : [],
      'RCA_DA_OCORRÊNCIA': trat.rca && trat.rca !== 'nan' ? trat.rca : '',
      SINTESE: c.sintese || '',
      'AÇÃO_TOMADA': trat.acao || '',
      STATUS: c.status || 'EM ABERTO',
      VALOR_PERDA: Number(fin.perda) || 0,
      VALOR_RECUPERADO: Number(fin.recuperado) || 0,
      VALOR_FRAUDE_MENSAL: Number(fin.fraude_mensal) || 0,
      PERDA_EVITADA_ANUAL: Number(fin.perda_evitada_anual) || 0,
      INICIO_TRATATIVAS: toIsoDate(trat.inicio || ''),
      ENCERRAMENTO: toIsoDate(trat.encerramento || ''),
      TEMPO_DE_TRATATIVA: trat.tempo || '',
    };
  };

  // === NOVA FUNCIONALIDADE: IMPORT BACKUP ===
  const [importResult, setImportResult] = useState('');

  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        let totalImported = 0;

        // === IMPORTAÇÃO E EXIBIÇÃO DOS CASOS DO JSON ===
        // Detecta schema externo: { cases: [...] } e converte para o formato interno
        if (Array.isArray(data.cases)) {
          const key = 'synapse_offline_occurrences';
          const existing = (() => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } })();
          const existingIds = new Set(existing.map((item: any) => item.id));
          const mapped = data.cases.map(mapExternalCase).filter((c: any) => !existingIds.has(c.id));
          const merged = [...existing, ...mapped];
          localStorage.setItem(key, JSON.stringify(merged));
          totalImported += mapped.length;
        }

        BACKUP_KEYS.forEach(key => {
          if (!data[key] || !Array.isArray(data[key])) return;
          const existing = (() => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } })();
          const existingIds = new Set(existing.map((item: any) => item.id));

          const newItems = data[key].filter((item: any) => !existingIds.has(item.id));
          newItems.forEach((item: any) => {
            if (item.displayId) {
              const parts = item.displayId.split('-');
              if (parts.length >= 2) {
                const prefix = parts[0];
                const year = new Date().getFullYear();
                const allItems = [...existing, ...newItems.filter((n: any) => n !== item)];
                const maxSeq = allItems.reduce((max: number, i: any) => {
                  if (!i.displayId) return max;
                  const p = i.displayId.split('-');
                  if (p[0] === prefix && p[1] === String(year)) {
                    return Math.max(max, parseInt(p[2] || '0', 10) || 0);
                  }
                  return max;
                }, 0);
                item.displayId = `${prefix}-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
              }
            }
          });

          const merged = [...existing, ...newItems];
          localStorage.setItem(key, JSON.stringify(merged));
          totalImported += newItems.length;
        });

        setImportResult(`✅ ${totalImported} registros importados`);
        setTimeout(() => setImportResult(''), 4000);
        window.location.reload();
      } catch (err) {
        console.error(err);
        setImportResult('❌ Erro ao importar arquivo');
        setTimeout(() => setImportResult(''), 4000);
      }
    };
    input.click();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 flex items-center justify-between text-xs z-50">
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-success" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-destructive" />
          )}
          <span className={isOnline ? 'text-success' : 'text-destructive'}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Last sync */}
        <div className="text-muted-foreground">
          Última sync: {syncInfo.lastSync ? formatDateTime(syncInfo.lastSync) : 'Nunca'}
        </div>

        {/* Pending */}
        {syncInfo.pendingCount > 0 && (
          <div className="text-warning">
            {syncInfo.pendingCount} pendente(s)
          </div>
        )}

        {/* Last result */}
        {(lastResult || importResult) && (
          <div className="text-muted-foreground">{importResult || lastResult}</div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFirstSync}
          disabled={!isOnline || syncing || !user}
          className="h-7 text-xs"
          title="Enviar todos os dados locais para a nuvem"
        >
          <Cloud className="w-3.5 h-3.5 mr-1" />
          Enviar Tudo
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          disabled={!isOnline || syncing || !user}
          className="h-7 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportBackup}
          className="h-7 text-xs"
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          Backup JSON
        </Button>

        {/* === NOVA FUNCIONALIDADE: IMPORT BACKUP === */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleImportBackup}
          className="h-7 text-xs"
        >
          <Upload className="w-3.5 h-3.5 mr-1" />
          Importar Backup
        </Button>

        {user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="h-7 text-xs text-muted-foreground"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Sair
          </Button>
        )}
      </div>
    </div>
  );
}
