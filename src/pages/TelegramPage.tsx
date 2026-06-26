// === SYNAPSE: Inteligência Telegram ===
// Painel que envia comandos de consulta (CPF / Email / Nome / Telefone / Placa)
// para um chat/bot configurado no Telegram via Edge Function `telegram-query`.
// As respostas aparecem no próprio Telegram (limitação da Bot API) — esta tela
// registra o histórico local de consultas para auditoria interna.

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Send, Settings2, CheckCircle2, AlertTriangle, MessageCircle, ExternalLink, Trash2,
} from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-dialog';

const STORAGE_KEY = 'synapse_telegram_config_v1';
const HISTORY_KEY = 'synapse_telegram_history_v1';

interface TelegramConfig {
  chatId: string;
  botUsername: string;
}

type QueryType = 'cpf' | 'cnpj' | 'email' | 'nome' | 'telefone' | 'placa' | 'custom';

interface HistoryItem {
  id: string;
  type: QueryType;
  value: string;
  command: string;
  chatId: string;
  status: 'ok' | 'error';
  detail?: string;
  at: string;
}

const TYPE_LABELS: Record<QueryType, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  nome: 'Nome',
  telefone: 'Telefone',
  placa: 'Placa',
  custom: 'Comando livre',
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
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return { chatId: '', botUsername: '' }; }
}
function saveConfig(c: TelegramConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}
function loadHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function saveHistory(h: HistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 100)));
}

export default function TelegramPage() {
  const { showAlert, log } = useApp();
  const [config, setConfig] = useState<TelegramConfig>({ chatId: '', botUsername: '' });
  const [type, setType] = useState<QueryType>('cpf');
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const [botInfo, setBotInfo] = useState<{ username?: string; first_name?: string } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setConfig(loadConfig());
    setHistory(loadHistory());
  }, []);

  const handleSaveConfig = () => {
    saveConfig(config);
    showAlert('Configuração salva.', 'success');
  };

  const handleTestBot = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('telegram-query', {
        body: { action: 'getMe' },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || 'Falha');
      setBotInfo(data.result);
      showAlert(`Bot conectado: @${data.result?.username}`, 'success');
    } catch (e) {
      showAlert(`Falha ao testar bot: ${(e as Error).message}`, 'error');
    }
  };

  const handleSend = async () => {
    if (!config.chatId) {
      showAlert('Configure o Chat ID antes de enviar.', 'warning');
      return;
    }
    if (!value.trim()) {
      showAlert('Informe o valor da consulta.', 'warning');
      return;
    }
    const command = TYPE_TEMPLATE[type](value);
    setSending(true);
    let status: 'ok' | 'error' = 'ok';
    let detail = '';
    try {
      const { data, error } = await supabase.functions.invoke('telegram-query', {
        body: { action: 'sendMessage', chat_id: config.chatId, text: command },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || 'Falha no envio');
      showAlert('Consulta enviada ao Telegram. Verifique a resposta no chat.', 'success');
      log(`Consulta Telegram enviada: ${TYPE_LABELS[type]} (${command.slice(0, 30)})`);
    } catch (e) {
      status = 'error';
      detail = (e as Error).message;
      showAlert(`Erro: ${detail}`, 'error');
    } finally {
      setSending(false);
      const item: HistoryItem = {
        id: crypto.randomUUID(),
        type, value, command, chatId: config.chatId,
        status, detail, at: new Date().toISOString(),
      };
      const updated = [item, ...history].slice(0, 100);
      setHistory(updated);
      saveHistory(updated);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
    setConfirmClear(false);
    showAlert('Histórico limpo.', 'info');
  };

  const openInTelegram = () => {
    if (config.botUsername) {
      window.open(`https://t.me/${config.botUsername.replace(/^@/, '')}`, '_blank');
    } else if (config.chatId.startsWith('-100')) {
      window.open(`https://t.me/c/${config.chatId.replace('-100', '')}`, '_blank');
    } else {
      showAlert('Defina um bot ou chat para abrir.', 'warning');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-7 h-7 text-primary" /> Inteligência Telegram
        </h1>
        <Button variant="outline" size="sm" onClick={openInTelegram}>
          <ExternalLink className="w-4 h-4 mr-1" /> Abrir no Telegram
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Envia comandos padronizados (ex.: <code>/cpf 12345678900</code>) ao bot/grupo configurado.
        As respostas dos bots de consulta aparecem dentro do próprio Telegram —
        limitação da Bot API impede leitura automática de mensagens de outros bots.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* === CONFIG === */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Configuração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Chat ID (grupo/canal/usuário)</Label>
              <Input
                value={config.chatId}
                onChange={e => setConfig({ ...config, chatId: e.target.value })}
                placeholder="-1001234567890 ou @canal"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Para grupos, use o ID negativo (-100…). Adicione o bot do SYNAPSE ao grupo como admin.
              </p>
            </div>
            <div>
              <Label className="text-xs">Bot consulta (opcional, para deep-link)</Label>
              <Input
                value={config.botUsername}
                onChange={e => setConfig({ ...config, botUsername: e.target.value })}
                placeholder="@BlackConsultaasBot"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveConfig} size="sm" className="flex-1">Salvar</Button>
              <Button onClick={handleTestBot} size="sm" variant="outline" className="flex-1">
                Testar bot
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

        {/* === ENVIO === */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4" /> Nova consulta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
                <Label className="text-xs">
                  {type === 'custom' ? 'Comando completo (ex.: /cpf 12345)' : 'Valor'}
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
                  onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-secondary/50 rounded p-2 font-mono">
              {value ? TYPE_TEMPLATE[type](value) : '(digite um valor para visualizar o comando)'}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSend} disabled={sending}>
                <Send className="w-4 h-4 mr-2" />
                {sending ? 'Enviando…' : 'Enviar para Telegram'}
              </Button>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground border-t border-border pt-2">
              <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
              Uso restrito a investigações corporativas autorizadas. Consultas são
              registradas no log de atividade para fins de auditoria (LGPD art. 37).
            </div>
          </CardContent>
        </Card>
      </div>

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
              Nenhuma consulta enviada ainda.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto synapse-scrollbar">
              {history.map(h => (
                <div key={h.id} className="flex items-center gap-3 p-2 rounded border border-border bg-secondary/30">
                  <Badge variant="outline" className="shrink-0">{TYPE_LABELS[h.type]}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate">{h.command}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(h.at).toLocaleString('pt-BR')} • chat {h.chatId}
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
        description="Esta ação remove todo o histórico local de consultas Telegram. As mensagens já enviadas ao chat não são removidas."
      />
    </div>
  );
}
