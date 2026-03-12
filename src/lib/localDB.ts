const DB_PREFIX = 'synapse_offline_';

export const DB_KEYS = {
  occurrences: `${DB_PREFIX}occurrences`,
  checklists: `${DB_PREFIX}checklists`,
  risks: `${DB_PREFIX}risks`,
  droneMissions: `${DB_PREFIX}droneMissions`,
  events: `${DB_PREFIX}events`,
  operations: `${DB_PREFIX}confidentialOperations`,
  activityLogs: `${DB_PREFIX}activityLogs`,
  schedules: `${DB_PREFIX}schedules`,
} as const;

export type DBKey = typeof DB_KEYS[keyof typeof DB_KEYS];

export const localDB = {
  load: <T = any>(key: string): T[] => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error loading data for key ${key}:`, e);
      return [];
    }
  },
  save: <T = any>(key: string, data: T[]): void => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving data for key ${key}:`, e);
    }
  },
  add: <T extends { id?: string }>(key: string, item: T): T => {
    const data = localDB.load<T>(key);
    if (!item.id) item.id = crypto.randomUUID();
    data.push(item);
    localDB.save(key, data);
    return item;
  },
  update: <T extends { id: string }>(key: string, updatedItem: T): void => {
    const data = localDB.load<T>(key);
    const index = data.findIndex((item: any) => item.id === updatedItem.id);
    if (index > -1) {
      data[index] = updatedItem;
      localDB.save(key, data);
    }
  },
  delete: (key: string, id: string): void => {
    let data = localDB.load(key);
    data = data.filter((item: any) => item.id !== id);
    localDB.save(key, data);
  },
};

// Utility functions
export const formatCurrency = (value: number | string | undefined): string => {
  const number = parseFloat(String(value)) || 0;
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
};

export const formatDateTime = (dateTimeString?: string): string => {
  if (!dateTimeString) return 'N/A';
  const date = new Date(dateTimeString);
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export function generateSequentialDisplayId(prefix: string, dataArray: any[]): string {
  const year = new Date().getFullYear();
  const prefixWithYear = `${prefix}-${year}`;
  const itemsFromThisYear = dataArray.filter(
    (item: any) => item.displayId && item.displayId.startsWith(prefixWithYear)
  );
  let maxSequence = 0;
  if (itemsFromThisYear.length > 0) {
    const sequences = itemsFromThisYear.map((item: any) => {
      const parts = item.displayId.split('-');
      return parts.length === 3 ? parseInt(parts[2], 10) : 0;
    });
    const validSeq = sequences.filter((num: number) => !isNaN(num));
    maxSequence = validSeq.length ? Math.max(...validSeq) : 0;
  }
  const newSequence = maxSequence + 1;
  return `${prefixWithYear}-${String(newSequence).padStart(4, '0')}`;
}

export function logActivity(userName: string, action: string) {
  localDB.add(DB_KEYS.activityLogs, {
    timestamp: new Date().toISOString(),
    user: userName,
    action,
  } as any);
}

export interface CaseData {
  id: string;
  displayId: string;
  DATA: string;
  LOCAL: string;
  UNIDADE: string;
  SETOR: string;
  CLIENTE_DA_OCORRÊNCIA: string;
  DESCRIÇÃO_DA_OCORRÊNCIA: string;
  TIPO_DE_OCORRÊNCIA: string;
  TIPO_DE_OPERAÇÃO: string;
  GRAVIDADE: string;
  case_g: number;
  case_u: number;
  case_t: number;
  ENVOLVIDOS: { name: string; measure: string }[];
  RCA_DA_OCORRÊNCIA: string;
  SINTESE: string;
  AÇÃO_TOMADA: string;
  STATUS: string;
  VALOR_PERDA: number | string;
  VALOR_RECUPERADO: number | string;
  VALOR_FRAUDE_MENSAL: number | string;
  PERDA_EVITADA_ANUAL: number | string;
  INICIO_TRATATIVAS: string;
  ENCERRAMENTO: string;
  TEMPO_DE_TRATATIVA: string;
  evidenceImageIds?: string[];
}

export interface UserProfile {
  name: string;
  role: string;
  icon: string;
}

export const USERS: UserProfile[] = [
  { name: 'Renan Moreira', role: 'Especialista em Segurança', icon: 'shield' },
  { name: 'Thiago Santos', role: 'Analista de Logística', icon: 'user' },
  { name: 'Jorge Ribeiro', role: 'Consultor de Segurança', icon: 'truck' },
  { name: 'Alysson Costa', role: 'Gerente de Segurança', icon: 'briefcase' },
];
