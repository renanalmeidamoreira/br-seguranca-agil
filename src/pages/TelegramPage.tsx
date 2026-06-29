// === SYNAPSE: Inteligência Telegram + Instagram ===
// Modo principal (LINK): abre Telegram/Instagram Web ou Desktop direto no grupo,
// com o comando de consulta já copiado para o clipboard — basta colar (Ctrl+V) e
// enviar usando seu perfil pessoal nos grupos (Buscas 7, etc.).
//
// Modo alternativo (BOT API): mantido para evolução futura — envia comandos via
// Edge Function `telegram-query` para um bot/grupo onde o SYNAPSE seja admin.

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Send, Settings2, CheckCircle2, AlertTriangle, MessageCircle, ExternalLink,
  Trash2, Copy, Instagram, Bot, LinkIcon,
} from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-dialog';

const STORAGE_KEY = 'synapse_telegram_config_v2';
const HISTORY_KEY = 'synapse_telegram_history_v1';

interface ChannelPreset {
  id: string;
  label: string;
  platform: 'telegram' | 'instagram';
  target: string; // @username, t.me link, ou ig username
}

interface TelegramConfig {
  // legado bot api
  chatId: string;
  botUsername: string;
  // novo: presets de grupos
  presets: ChannelPreset[];
  defaultPresetId: string;
}

const DEFAULT_CONFIG: TelegramConfig = {
  chatId: '',
  botUsername: '',
  defaultPresetId: 'buscas7',
  presets: [
    { id: 'buscas7',       label: 'Buscas 7 (Telegram)',     platform: 'telegram',  target: 'buscas7' },
    { id: 'blackconsulta', label: 'Black Consultas (Telegram)', platform: 'telegram', target: 'BlackConsultasBot' },
    { id: 'ig_inbox',      label: 'Instagram Direct',         platform: 'instagram', target: '' },
  ],
};

type QueryType = 'cpf' | 'cnpj' | 'email' | 'nome' | 'telefone' | 'placa' | 'custom';

interface HistoryItem {
  id: string;
  mode: 'link' | 'bot';
  type: QueryType;
  value: string;
  command: string;
  target: string;
  status: 'ok' | 'error';
  detail?: string;
  at: string;
}

const TYPE_LABELS: Record<QueryType, string> = {
  cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', nome: 'Nome',
  telefone: 'Telefone', placa: 'Placa', custom: 'Comando livre',
};

const TYPE_TEMPLATE: Record<QueryType, (v: string) => string> = {
  cpf: v => `/cpf ${v.replace(/\D/g, '')}`,
  cnpj: v => `/cnpj ${v.replace(/\D/g, '')}`,
  email: v => `/email ${v.trim()}`,
  nome: v => `/nome ${v.trim()}`,
  telefone: v => `/tel ${v.replace(/\D/g, '')}`,
  placa: v => `/placa ${v.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`,
  custom: v => v,
};

function loadConfig(): TelegramConfig {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...raw, presets: raw.presets?.length ? raw.presets : DEFAULT_CONFIG.presets };
  } catch { return DEFAULT_CONFIG; }
}
function saveConfig(c: TelegramConfig) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }
function loadHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(h: HistoryItem[]) { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 100))); }

function buildTelegramUrl(target: string): { web: string; app: string } {
  // aceita @user, user, ou link t.me/...
  let handle = target.trim().replace(/^@/, '');
  const m = handle.match(/t\.me\/(?:joinchat\/)?([^/?#]+)/i);
  if (m) handle = m[1];
  return {
    web: `https://t.me/${handle}`,
    app: `tg://resolve?domain=${handle}`,
  };
}
function buildInstagramUrl(target: string): { web: string; app: string } {
  const handle = target.trim().replace(/^@/, '');
  if (!handle) {
    return { web: 'https://www.instagram.com/direct/inbox/', app: 'instagram://direct-inbox' };
  }
  return {
    web: `https://ig.me/m/${handle}`,
    app: `instagram://user?username=${handle}`,
  };
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }
}

export default function TelegramPage() {
  const { showAlert, log } = useApp();
  const [config, setConfig] = useState<TelegramConfig>(DEFAULT_CONFIG);
  const [type, setType] = useState<QueryType>('cpf');
  const [value, setValue] = useState('');
  const [presetId, setPresetId] = useState<string>('buscas7');
  const [sending, setSending] = useState(false);
  const [botInfo, setBotInfo] = useState<{ username?: string; first_name?: string } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const c = loadConfig();
    setConfig(c);
    setPresetId(c.defaultPresetId || c.presets[0]?.id);
    setHistory(loadHistory());
  }, []);

  const currentPreset = config.presets.find(p => p.id === presetId) || config.presets[0];
  const command = value ? TYPE_TEMPLATE[type](value) : '';

  const handleSaveConfig = () => {
    saveConfig(config);
    showAlert('Configuração salva.', 'success');
  };

  const pushHistory = (item: HistoryItem) => {
    const updated = [item, ...history].slice(0, 100);
    setHistory(updated); saveHistory(updated);
  };

  // ====== MODO LINK (recomendado) ======
  const handleSendLink = async () => {
    if (!value.trim()) { showAlert('Informe o valor da consulta.', 'warning'); return; }
    if (!currentPreset) { showAlert('Selecione um grupo de consulta.', 'warning'); return; }

    const copied = await copyToClipboard(command);
    const urls = currentPreset.platform === 'telegram'
      ? buildTelegramUrl(currentPreset.target)
      : buildInstagramUrl(currentPreset.target);

    window.open(urls.web, '_blank', 'noopener');

    showAlert(
      copied
        ? `Comando copiado. Cole (Ctrl+V) no chat "${currentPreset.label}" e envie.`
        : `Abrindo "${currentPreset.label}". Copie manualmente o comando.`,
      copied ? 'success' : 'warning',
    );
    log(`Consulta ${currentPreset.platform} (link) preparada: ${TYPE_LABELS[type]} → ${currentPreset.label}`);
    pushHistory({
      id: crypto.randomUUID(), mode: 'link', type, value, command,
      target: currentPreset.label, status: copied ? 'ok' : 'error',
      detail: copied ? 'Copiado para clipboard' : 'Falha ao copiar',
      at: new Date().toISOString(),
    });
  };

  const handleCopyOnly = async () => {
    if (!command) { showAlert('Informe o valor da consulta.', 'warning'); return; }
    const ok = await copyToClipboard(command);
    showAlert(ok ? 'Comando copiado.' : 'Falha ao copiar.', ok ? 'success' : 'error');
  };

  const openPreset = (p: ChannelPreset) => {
    const urls = p.platform === 'telegram' ? buildTelegramUrl(p.target) : buildInstagramUrl(p.target);
    window.open(urls.web, '_blank', 'noopener');
  };

  // ====== MODO BOT API (legado / futuro) ======
  const handleTestBot = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('telegram-query', { body: { action: 'getMe' } });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || 'Falha');
      setBotInfo(data.result);
      showAlert(`Bot conectado: @${data.result?.username}`, 'success');
    } catch (e) { showAlert(`Falha ao testar bot: ${(e as Error).message}`, 'error'); }
  };

  const handleSendBot = async () => {
    if (!config.chatId) { showAlert('Configure o Chat ID antes de enviar.', 'warning'); return; }
    if (!value.trim()) { showAlert('Informe o valor da consulta.', 'warning'); return; }
    setSending(true);
    let status: 'ok' | 'error' = 'ok'; let detail = '';
    try {
      const { data, error } = await supabase.functions.invoke('telegram-query', {
        body: { action: 'sendMessage', chat_id: config.chatId, text: command },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || 'Falha no envio');
      showAlert('Consulta enviada ao Telegram via bot.', 'success');
      log(`Consulta Telegram (bot) enviada: ${TYPE_LABELS[type]}`);
    } catch (e) {
      status = 'error'; detail = (e as Error).message;
      showAlert(`Erro: ${detail}`, 'error');
    } finally {
      setSending(false);
      pushHistory({
        id: crypto.randomUUID(), mode: 'bot', type, value, command,
        target: `chat ${config.chatId}`, status, detail, at: new Date().toISOString(),
      });
    }
  };

  const clearHistory = () => {
    setHistory([]); saveHistory([]); setConfirmClear(false);
    showAlert('Histórico limpo.', 'info');
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-7 h-7 text-primary" /> Inteligência Telegram & Instagram
        </h1>
        <div className="flex gap-2">
          {config.presets.map(p => (
            <Button key={p.id} variant="outline" size="sm" onClick={() => openPreset(p)}>
              {p.platform === 'instagram'
                ? <Instagram className="w-4 h-4 mr-1" />
                : <MessageCircle className="w-4 h-4 mr-1" />}
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Monte o comando (<code>/cpf VALOR</code>, <code>/placa ABC1D23</code>…), escolha o grupo
        e clique <b>Abrir & copiar</b>. O SYNAPSE copia o comando para o clipboard e abre o chat —
        basta colar (<kbd>Ctrl+V</kbd>) e enviar com seu perfil pessoal.
      </p>

      <Tabs defaultValue="link" className="w-full">
        <TabsList>
          <TabsTrigger value="link"><LinkIcon className="w-4 h-4 mr-1" />Modo Link (recomendado)</TabsTrigger>
          <TabsTrigger value="bot"><Bot className="w-4 h-4 mr-1" />Modo Bot API (futuro)</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="w-4 h-4 mr-1" />Configuração</TabsTrigger>
        </TabsList>

        {/* ===== MODO LINK ===== */}
        <TabsContent value="link" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="w-4 h-4" /> Nova consulta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_220px] gap-3">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={type} onValueChange={v => setType(v as QueryType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">
                    {type === 'custom' ? 'Comando completo' : 'Valor'}
                  </Label>
                  <Input
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder={
                      type === 'cpf' ? '12345678900' :
                      type === 'email' ? 'pessoa@exemplo.com' :
                      type === 'placa' ? 'ABC1D23' :
                      type === 'custom' ? '/cmd argumento' : ''
                    }
                    onKeyDown={e => { if (e.key === 'Enter') handleSendLink(); }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Grupo/Canal</Label>
                  <Select value={presetId} onValueChange={setPresetId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {config.presets.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.platform === 'instagram' ? '📷 ' : '✈️ '}{p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-secondary/50 rounded p-2 font-mono break-all">
                {command || '(digite um valor para visualizar o comando)'}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={handleCopyOnly}>
                  <Copy className="w-4 h-4 mr-2" /> Copiar comando
                </Button>
                <Button onClick={handleSendLink}>
                  {currentPreset?.platform === 'instagram'
                    ? <Instagram className="w-4 h-4 mr-2" />
                    : <Send className="w-4 h-4 mr-2" />}
                  Abrir & copiar para {currentPreset?.label || 'grupo'}
                </Button>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-muted-foreground border-t border-border pt-2">
                <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                Limitações de plataforma: Telegram e Instagram não permitem preencher o campo de
                texto de chats de terceiros automaticamente. Por isso o SYNAPSE copia o comando
                para o clipboard e abre o chat — você só cola e envia. Consultas são registradas
                no log de atividade (LGPD art. 37).
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== MODO BOT (mantido p/ futuro) ===== */}
        <TabsContent value="bot" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="w-4 h-4" /> Envio via Bot API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Reservado para evolução: requer um bot próprio (admin do grupo) ligado pelo conector.
                Use o modo Link para os grupos públicos de consulta.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={type} onValueChange={v => setType(v as QueryType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Valor</Label>
                  <Input value={value} onChange={e => setValue(e.target.value)} />
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-secondary/50 rounded p-2 font-mono">
                {command || '(sem comando)'}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={handleTestBot}>Testar bot</Button>
                <Button onClick={handleSendBot} disabled={sending}>
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? 'Enviando…' : 'Enviar via bot'}
                </Button>
              </div>
              {botInfo && (
                <div className="flex items-center gap-2 text-xs text-success">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  @{botInfo.username} ({botInfo.first_name})
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== CONFIG ===== */}
        <TabsContent value="config" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Grupos & Canais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {config.presets.map((p, idx) => (
                  <div key={p.id} className="grid grid-cols-1 sm:grid-cols-[120px_1fr_1fr_auto] gap-2 items-center">
                    <Select
                      value={p.platform}
                      onValueChange={v => {
                        const presets = [...config.presets];
                        presets[idx] = { ...p, platform: v as 'telegram' | 'instagram' };
                        setConfig({ ...config, presets });
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="telegram">Telegram</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={p.label}
                      placeholder="Rótulo"
                      onChange={e => {
                        const presets = [...config.presets];
                        presets[idx] = { ...p, label: e.target.value };
                        setConfig({ ...config, presets });
                      }}
                    />
                    <Input
                      value={p.target}
                      placeholder={p.platform === 'telegram' ? '@grupo ou t.me/...' : '@usuario (vazio = inbox)'}
                      onChange={e => {
                        const presets = [...config.presets];
                        presets[idx] = { ...p, target: e.target.value };
                        setConfig({ ...config, presets });
                      }}
                    />
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => setConfig({ ...config, presets: config.presets.filter(x => x.id !== p.id) })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline" size="sm"
                  onClick={() => setConfig({
                    ...config,
                    presets: [...config.presets, {
                      id: crypto.randomUUID(), label: 'Novo grupo',
                      platform: 'telegram', target: '',
                    }],
                  })}
                >
                  + Adicionar grupo
                </Button>
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs font-medium">Bot API (opcional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Chat ID (-100…)"
                    value={config.chatId}
                    onChange={e => setConfig({ ...config, chatId: e.target.value })}
                  />
                  <Input
                    placeholder="@BotUsername"
                    value={config.botUsername}
                    onChange={e => setConfig({ ...config, botUsername: e.target.value })}
                  />
                </div>
              </div>

              <Button onClick={handleSaveConfig}>Salvar configuração</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* === HISTÓRICO === */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Histórico de consultas ({history.length})</CardTitle>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
              <Trash2 className="w-4 h-4 mr-1" /> Limpar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma consulta registrada ainda.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto synapse-scrollbar">
              {history.map(h => (
                <div key={h.id} className="flex items-center gap-3 p-2 rounded border border-border bg-secondary/30">
                  <Badge variant="outline" className="shrink-0">{TYPE_LABELS[h.type]}</Badge>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {h.mode === 'link' ? 'LINK' : 'BOT'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate">{h.command}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(h.at).toLocaleString('pt-BR')} • {h.target}
                      {h.detail && ` • ${h.detail}`}
                    </p>
                  </div>
                  {h.status === 'ok'
                    ? <CheckCircle2 className="w-4 h-4 text-success" />
                    : <AlertTriangle className="w-4 h-4 text-destructive" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        onConfirm={clearHistory}
        itemLabel="o histórico"
        description="Remove o histórico local. Mensagens já enviadas ao chat permanecem."
      />
    </div>
  );
}
