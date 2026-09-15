import { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { localDB, DB_KEYS, formatDate } from '@/lib/localDB';
import { markForSync } from '@/lib/syncService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays, Plus, Trash2, Users, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ---------- Types ----------
interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface ActivityType {
  id: string;
  name: string;
  color: string;
}

interface Activity {
  id: string;
  teamMemberId: string;
  activityTypeId: string;
  startDate: string;
  endDate: string;
  details: string;
}

interface Schedule {
  id: string;
  year: number;
  team: TeamMember[];
  activityTypes: ActivityType[];
  activities: Activity[];
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const DEFAULT_ACTIVITY_TYPES: Omit<ActivityType, 'id'>[] = [
  { name: 'Férias', color: '#3b82f6' },
  { name: 'Inspeção', color: '#22c55e' },
  { name: 'Treinamento', color: '#a855f7' },
  { name: 'Auditoria', color: '#f97316' },
  { name: 'Folga', color: '#6b7280' },
];

// ---------- Component ----------
export default function SchedulePage() {
  const { currentUser, showAlert, log } = useApp();
  const [schedules, setSchedules] = useState<Schedule[]>(() => localDB.load<Schedule>(DB_KEYS.schedules));
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const s = localDB.load<Schedule>(DB_KEYS.schedules);
    return s.length > 0 ? String(s.sort((a, b) => b.year - a.year)[0].year) : '';
  });

  // Modals
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState<{ memberId: string; activityId?: string } | null>(null);

  // Form states
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#22d3ee');
  const [activityForm, setActivityForm] = useState({
    activityTypeId: '', startDate: '', endDate: '', details: '',
  });

  const refresh = () => {
    const data = localDB.load<Schedule>(DB_KEYS.schedules);
    setSchedules(data);
  };

  const currentSchedule = useMemo(() =>
    schedules.find(s => String(s.year) === selectedYear),
    [schedules, selectedYear]);

  // Create new schedule
  const handleCreateSchedule = () => {
    const year = parseInt(newYear);
    if (schedules.some(s => s.year === year)) {
      showAlert('Cronograma para este ano já existe.', 'warning'); return;
    }
    const newSchedule: Schedule = {
      id: crypto.randomUUID(), year,
      team: [],
      activityTypes: DEFAULT_ACTIVITY_TYPES.map(t => ({ ...t, id: crypto.randomUUID() })),
      activities: [],
    };
    const updated = [...schedules, newSchedule];
    localDB.save(DB_KEYS.schedules, updated);
    markForSync(DB_KEYS.schedules, newSchedule.id);
    log(`Criou cronograma para ${year}`);
    showAlert(`Cronograma ${year} criado!`, 'success');
    setSelectedYear(String(year));
    setShowNewSchedule(false);
    refresh();
  };

  const handleDeleteSchedule = () => {
    if (!currentSchedule) return;
    const updated = schedules.filter(s => s.id !== currentSchedule.id);
    localDB.save(DB_KEYS.schedules, updated);
    showAlert('Cronograma excluído.', 'warning');
    setSelectedYear(updated.length > 0 ? String(updated[0].year) : '');
    refresh();
  };

  // Team management
  const addMember = () => {
    if (!newMemberName.trim() || !currentSchedule) return;
    currentSchedule.team.push({ id: crypto.randomUUID(), name: newMemberName.trim(), role: newMemberRole.trim() });
    localDB.save(DB_KEYS.schedules, schedules);
    setNewMemberName(''); setNewMemberRole(''); refresh();
  };

  const removeMember = (memberId: string) => {
    if (!currentSchedule) return;
    currentSchedule.team = currentSchedule.team.filter(m => m.id !== memberId);
    currentSchedule.activities = currentSchedule.activities.filter(a => a.teamMemberId !== memberId);
    localDB.save(DB_KEYS.schedules, schedules); refresh();
  };

  // Activity types
  const addActivityType = () => {
    if (!newTypeName.trim() || !currentSchedule) return;
    currentSchedule.activityTypes.push({ id: crypto.randomUUID(), name: newTypeName.trim(), color: newTypeColor });
    localDB.save(DB_KEYS.schedules, schedules);
    setNewTypeName(''); refresh();
  };

  const removeActivityType = (typeId: string) => {
    if (!currentSchedule) return;
    currentSchedule.activityTypes = currentSchedule.activityTypes.filter(t => t.id !== typeId);
    currentSchedule.activities = currentSchedule.activities.filter(a => a.activityTypeId !== typeId);
    localDB.save(DB_KEYS.schedules, schedules); refresh();
  };

  // Activity CRUD
  const openActivityForm = (memberId: string, activityId?: string) => {
    if (!currentSchedule) return;
    const existing = activityId ? currentSchedule.activities.find(a => a.id === activityId) : null;
    setActivityForm({
      activityTypeId: existing?.activityTypeId || currentSchedule.activityTypes[0]?.id || '',
      startDate: existing?.startDate || `${selectedYear}-01-01`,
      endDate: existing?.endDate || `${selectedYear}-01-01`,
      details: existing?.details || '',
    });
    setShowActivityForm({ memberId, activityId });
  };

  const saveActivity = () => {
    if (!currentSchedule || !showActivityForm) return;
    if (!activityForm.startDate || !activityForm.endDate) {
      showAlert('Datas são obrigatórias.', 'warning'); return;
    }
    if (new Date(activityForm.startDate) > new Date(activityForm.endDate)) {
      showAlert('Data início não pode ser após data fim.', 'warning'); return;
    }
    // Remove old if editing
    if (showActivityForm.activityId) {
      currentSchedule.activities = currentSchedule.activities.filter(a => a.id !== showActivityForm.activityId);
    }
    currentSchedule.activities.push({
      id: showActivityForm.activityId || crypto.randomUUID(),
      teamMemberId: showActivityForm.memberId,
      ...activityForm,
    });
    localDB.save(DB_KEYS.schedules, schedules);
    setShowActivityForm(null); refresh();
  };

  const deleteActivity = () => {
    if (!currentSchedule || !showActivityForm?.activityId) return;
    currentSchedule.activities = currentSchedule.activities.filter(a => a.id !== showActivityForm.activityId);
    localDB.save(DB_KEYS.schedules, schedules);
    setShowActivityForm(null); refresh();
  };

  // ---------- Gantt rendering ----------
  const getDayOfYear = (date: Date) => {
    const start = new Date(date.getFullYear(), 0, 1);
    return Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const renderGantt = () => {
    if (!currentSchedule) return null;
    const year = currentSchedule.year;
    const isLeap = new Date(year, 1, 29).getDate() === 29;
    const daysInYear = isLeap ? 366 : 365;

    return (
      <div className="overflow-x-auto border border-border rounded-lg bg-card">
        <div className="min-w-[1200px]">
          {/* Month headers */}
          <div className="flex" style={{ paddingLeft: 200 }}>
            {MONTHS.map((m, i) => {
              const daysInMonth = new Date(year, i + 1, 0).getDate();
              const widthPct = (daysInMonth / daysInYear) * 100;
              return (
                <div key={i} className="text-center text-xs font-bold py-2 border-r border-border bg-secondary"
                  style={{ width: `${widthPct}%` }}>
                  {m.slice(0, 3)}
                </div>
              );
            })}
          </div>

          {/* Team rows */}
          {currentSchedule.team.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Equipe não definida. Clique em "Gerenciar Equipe" para adicionar membros.
            </div>
          ) : currentSchedule.team.map(member => {
            const memberActivities = currentSchedule.activities
              .filter(a => a.teamMemberId === member.id)
              .sort((a, b) => a.startDate.localeCompare(b.startDate));

            // Lane assignment for overlaps
            const lanes: Date[] = [];
            memberActivities.forEach(act => {
              let placed = false;
              for (let i = 0; i < lanes.length; i++) {
                if (new Date(act.startDate + 'T00:00:00') > lanes[i]) {
                  lanes[i] = new Date(act.endDate + 'T00:00:00');
                  (act as any)._level = i;
                  placed = true; break;
                }
              }
              if (!placed) {
                lanes.push(new Date(act.endDate + 'T00:00:00'));
                (act as any)._level = lanes.length - 1;
              }
            });
            const rowHeight = Math.max(1, lanes.length) * 28 + 16;

            return (
              <div key={member.id} className="flex border-t border-border" style={{ minHeight: rowHeight }}>
                {/* Member name column */}
                <div className="w-[200px] min-w-[200px] p-2 bg-secondary border-r border-border flex flex-col justify-center sticky left-0 z-10">
                  <p className="font-semibold text-sm truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                </div>
                {/* Timeline area */}
                <div className="flex-1 relative cursor-pointer hover:bg-secondary/30"
                  onClick={() => openActivityForm(member.id)}
                  style={{ minHeight: rowHeight }}>
                  {memberActivities.map(act => {
                    const type = currentSchedule.activityTypes.find(t => t.id === act.activityTypeId);
                    if (!type) return null;
                    const startDay = getDayOfYear(new Date(act.startDate + 'T00:00:00'));
                    const endDay = getDayOfYear(new Date(act.endDate + 'T00:00:00'));
                    const leftPct = ((startDay - 1) / daysInYear) * 100;
                    const widthPct = ((endDay - startDay + 1) / daysInYear) * 100;
                    const topOffset = ((act as any)._level || 0) * 28 + 8;

                    return (
                      <div key={act.id}
                        className="absolute text-white text-[11px] px-2 rounded flex items-center truncate cursor-pointer hover:brightness-110 shadow-sm"
                        style={{
                          left: `${leftPct}%`, width: `${widthPct}%`, top: topOffset, height: 22,
                          backgroundColor: type.color,
                        }}
                        title={`${type.name} (${formatDate(act.startDate)} - ${formatDate(act.endDate)})${act.details ? `\n${act.details}` : ''}`}
                        onClick={e => { e.stopPropagation(); openActivityForm(member.id, act.id); }}>
                        {type.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <CalendarDays className="w-7 h-7 text-primary" /> Cronograma Anual de Atividades
      </h1>

      {/* Controls */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <label className="text-sm font-medium">Visualizar Ano:</label>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              className="h-10 max-w-full rounded-md border border-input bg-background px-3 text-sm">
              {schedules.length === 0 && <option value="">Nenhum cronograma</option>}
              {schedules.sort((a, b) => b.year - a.year).map(s => (
                <option key={s.year} value={s.year}>{s.year}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => currentSchedule && setShowTeamModal(true)} disabled={!currentSchedule}>
              <Users className="w-4 h-4 mr-1" /> Gerenciar Equipe
            </Button>
            <Button variant="outline" size="sm" onClick={() => currentSchedule && setShowActivitiesModal(true)} disabled={!currentSchedule}>
              <Palette className="w-4 h-4 mr-1" /> Gerenciar Atividades
            </Button>
            <Button size="sm" onClick={() => setShowNewSchedule(true)}>
              <Plus className="w-4 h-4 mr-1" /> Novo Cronograma
            </Button>
            {currentSchedule && (
              <Button variant="destructive" size="sm" onClick={handleDeleteSchedule}>
                <Trash2 className="w-4 h-4 mr-1" /> Excluir
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      {currentSchedule && currentSchedule.activityTypes.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {currentSchedule.activityTypes.map(t => (
            <div key={t.id} className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: t.color }} />
              <span>{t.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Gantt Chart */}
      {currentSchedule ? renderGantt() : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          Nenhum cronograma encontrado. Clique em "Novo Cronograma" para começar.
        </CardContent></Card>
      )}

      {/* ---------- MODALS ---------- */}

      {/* New Schedule */}
      <Dialog open={showNewSchedule} onOpenChange={setShowNewSchedule}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Cronograma Anual</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm text-muted-foreground">Ano</label>
              <Input type="number" value={newYear} onChange={e => setNewYear(e.target.value)} /></div>
            <Button onClick={handleCreateSchedule} className="w-full">Criar Cronograma</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Management */}
      <Dialog open={showTeamModal} onOpenChange={setShowTeamModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Gerenciar Equipe — {selectedYear}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Nome" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} />
              <Input placeholder="Cargo" value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)} />
            </div>
            <Button size="sm" onClick={addMember}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
            <div className="space-y-2">
              {currentSchedule?.team.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                  <div><p className="font-medium text-sm">{m.name}</p><p className="text-xs text-muted-foreground">{m.role}</p></div>
                  <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              ))}
              {(!currentSchedule?.team || currentSchedule.team.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro na equipe.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Types Management */}
      <Dialog open={showActivitiesModal} onOpenChange={setShowActivitiesModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Gerenciar Tipos de Atividade — {selectedYear}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Nome da atividade" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} className="flex-1" />
              <input type="color" value={newTypeColor} onChange={e => setNewTypeColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
              <Button size="sm" onClick={addActivityType}><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2">
              {currentSchedule?.activityTypes.map(t => (
                <div key={t.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: t.color }} />
                    <span className="text-sm">{t.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeActivityType(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Form Modal */}
      <Dialog open={!!showActivityForm} onOpenChange={() => setShowActivityForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {showActivityForm?.activityId ? 'Editar' : 'Nova'} Atividade
              {currentSchedule && showActivityForm && ` — ${currentSchedule.team.find(m => m.id === showActivityForm.memberId)?.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Tipo de Atividade</label>
              <select value={activityForm.activityTypeId} onChange={e => setActivityForm(f => ({ ...f, activityTypeId: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {currentSchedule?.activityTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Detalhes (Opcional)</label>
              <Input value={activityForm.details} onChange={e => setActivityForm(f => ({ ...f, details: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-muted-foreground">Data Início</label>
                <Input type="date" value={activityForm.startDate} onChange={e => setActivityForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div><label className="text-sm text-muted-foreground">Data Fim</label>
                <Input type="date" value={activityForm.endDate} onChange={e => setActivityForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div className="flex justify-between">
              {showActivityForm?.activityId && (
                <Button variant="destructive" onClick={deleteActivity}>Remover</Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => setShowActivityForm(null)}>Cancelar</Button>
                <Button onClick={saveActivity}>Salvar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
