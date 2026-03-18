// === SYNC SUPABASE === Serviço de sincronização offline-first
import { supabase } from '@/integrations/supabase/client';
import { localDB, DB_KEYS } from './localDB';

type SyncTable = 'occurrences' | 'checklists' | 'risks' | 'schedules' | 'activity_logs';

const LOCAL_TO_CLOUD: Record<string, SyncTable> = {
  [DB_KEYS.occurrences]: 'occurrences',
  [DB_KEYS.checklists]: 'checklists',
  [DB_KEYS.risks]: 'risks',
  [DB_KEYS.schedules]: 'schedules',
  [DB_KEYS.activityLogs]: 'activity_logs',
};

const SYNC_META_KEY = 'synapse_sync_meta';

interface SyncMeta {
  lastSync: string | null;
  pendingCount: number;
}

function getSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    return raw ? JSON.parse(raw) : { lastSync: null, pendingCount: 0 };
  } catch { return { lastSync: null, pendingCount: 0 }; }
}

function setSyncMeta(meta: Partial<SyncMeta>) {
  const current = getSyncMeta();
  localStorage.setItem(SYNC_META_KEY, JSON.stringify({ ...current, ...meta }));
}

// === SYNC SUPABASE === Marca itens locais como pendentes de sync
const PENDING_KEY = 'synapse_pending_sync';

function getPendingIds(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function addPending(localKey: string, id: string) {
  const pending = getPendingIds();
  if (!pending[localKey]) pending[localKey] = [];
  if (!pending[localKey].includes(id)) pending[localKey].push(id);
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  updatePendingCount();
}

function removePending(localKey: string, id: string) {
  const pending = getPendingIds();
  if (pending[localKey]) {
    pending[localKey] = pending[localKey].filter(i => i !== id);
    if (pending[localKey].length === 0) delete pending[localKey];
  }
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  updatePendingCount();
}

function updatePendingCount() {
  const pending = getPendingIds();
  const count = Object.values(pending).reduce((sum, ids) => sum + ids.length, 0);
  setSyncMeta({ pendingCount: count });
}

// === SYNC SUPABASE === Registrar mudança local para sync posterior
export function markForSync(localKey: string, id: string) {
  addPending(localKey, id);
}

// === SYNC SUPABASE === Push de dados locais → Supabase
async function pushToCloud(userId: string): Promise<number> {
  const pending = getPendingIds();
  let pushed = 0;

  for (const [localKey, ids] of Object.entries(pending)) {
    const tableName = LOCAL_TO_CLOUD[localKey];
    if (!tableName || ids.length === 0) continue;

    const allLocal = localDB.load<any>(localKey);

    for (const id of ids) {
      const item = allLocal.find((i: any) => i.id === id);
      if (!item) { removePending(localKey, id); continue; }

      const { id: itemId, displayId, ...rest } = item;
      const row = {
        id: itemId,
        user_id: userId,
        display_id: displayId || '',
        data: rest,
        updated_at: item.updatedAt || item.createdAt || new Date().toISOString(),
      };

      const { error } = await (supabase.from(tableName) as any).upsert(row, { onConflict: 'id' });
      if (!error) {
        removePending(localKey, id);
        pushed++;
      } else {
        console.error(`Sync push error [${tableName}]:`, error);
      }
    }
  }
  return pushed;
}

// === SYNC SUPABASE === Pull de dados do Supabase → local
async function pullFromCloud(userId: string): Promise<number> {
  let pulled = 0;
  const lastSync = getSyncMeta().lastSync;

  for (const [localKey, tableName] of Object.entries(LOCAL_TO_CLOUD)) {
    let query = (supabase.from(tableName) as any).select('*').eq('user_id', userId);
    if (lastSync) {
      query = query.gt('updated_at', lastSync);
    }

    const { data, error } = await query;
    if (error) { console.error(`Sync pull error [${tableName}]:`, error); continue; }
    if (!data || data.length === 0) continue;

    const localData = localDB.load<any>(localKey);

    for (const row of data) {
      const existingIndex = localData.findIndex((i: any) => i.id === row.id);
      const reconstructed = {
        id: row.id,
        displayId: row.display_id,
        ...row.data,
      };

      if (existingIndex > -1) {
        // Conflito: última alteração vence
        const localUpdated = new Date(localData[existingIndex].updatedAt || localData[existingIndex].createdAt || 0).getTime();
        const cloudUpdated = new Date(row.updated_at).getTime();
        if (cloudUpdated >= localUpdated) {
          localData[existingIndex] = reconstructed;
          pulled++;
        }
      } else {
        localData.push(reconstructed);
        pulled++;
      }
    }
    localDB.save(localKey, localData);
  }
  return pulled;
}

// === SYNC SUPABASE === Sincronização completa (push + pull)
export type SyncStatus = 'idle' | 'syncing' | 'online' | 'offline' | 'error';

export async function syncAll(userId: string): Promise<{ pushed: number; pulled: number }> {
  const pushed = await pushToCloud(userId);
  const pulled = await pullFromCloud(userId);
  setSyncMeta({ lastSync: new Date().toISOString() });
  return { pushed, pulled };
}

export function getSyncInfo(): SyncMeta {
  updatePendingCount();
  return getSyncMeta();
}

// === SYNC SUPABASE === Marca TODOS os itens locais existentes como pendentes (para primeira sync)
export function markAllLocalForSync() {
  for (const localKey of Object.values(DB_KEYS)) {
    if (!LOCAL_TO_CLOUD[localKey]) continue;
    const items = localDB.load<any>(localKey);
    items.forEach((item: any) => {
      if (item.id) addPending(localKey, item.id);
    });
  }
}
