import { useState, useMemo, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { localDB, DB_KEYS, formatDate, generateSequentialDisplayId } from '@/lib/localDB';
import { markForSync } from '@/lib/syncService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Plus, Trash2, Eye, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

// ---------- Types ----------
interface ChecklistData {
  id: string;
  displayId: string;
  // Examiner
  examiner_date: string;
  examiner_time: string;
  examiner_name: string;
  examiner_role: string;
  examiner_id: string;
  examiner_unit: string;
  // Transporter
  transporter_company: string;
  transporter_plate: string;
  transporter_vehicle_type: string;
  transporter_driver_name: string;
  transporter_cnh_expiry: string;
  transporter_approach_location: string;
  transporter_route: string;
  route_adequate: string;
  driver_terminated: boolean;
  // Vehicle inspection
  uniform_condition: string;
  epi_condition: string;
  vehicle_condition: string;
  tracking_active: string;
  has_logo: string;
  doors_sealed: string;
  odd_smells: string;
  incompatible_products: string;
  vehicle_inspection_notes: string;
  // Packaging
  packaging_conditions: string[];
  product_temperature: string;
  // Customer quality
  customer_name: string;
  customer_address: string;
  customer_comments: string;
  customer_rating: number;
  // Analysis
  hasAlteration: boolean;
  examiner_analysis: string;
  // Meta
  createdAt: string;
  createdBy: string;
}

const VEHICLE_TYPES = ['3/4', 'TOCO', 'TRUCK', 'CARRETA', 'BITREM', 'CAÇAMBA', 'CILO', 'TRAÇÃO'];
const CONDITION_OPTIONS = ['Bom', 'Aceitável', 'Ruim'];
const PACKAGING_CONDITIONS = ['Violadas', 'Amassadas', 'Rasgadas', 'Sujas', 'Fitas frágeis'];
const MONTHLY_TARGET = 15;

// ---------- Helpers ----------
function RadioGroup({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-4 mt-1">
      {['Sim', 'Não'].map(v => (
        <label key={v} className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)}
            className="accent-primary w-4 h-4" />
          <span className="text-sm">{v}</span>
        </label>
      ))}
    </div>
  );
}

function ConditionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
      {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          className={`text-2xl transition-colors ${s <= value ? 'text-yellow-400' : 'text-muted-foreground/40'}`}>
          ★
        </button>
      ))}
    </div>
  );
}

// ---------- Default form state ----------
function defaultForm(): Omit<ChecklistData, 'id' | 'displayId' | 'createdAt' | 'createdBy'> {
  const now = new Date();
  return {
    examiner_date: now.toISOString().slice(0, 10),
    examiner_time: now.toTimeString().slice(0, 5),
    examiner_name: '', examiner_role: '', examiner_id: '', examiner_unit: '',
    transporter_company: '', transporter_plate: '', transporter_vehicle_type: VEHICLE_TYPES[0],
    transporter_driver_name: '', transporter_cnh_expiry: '', transporter_approach_location: '',
    transporter_route: '', route_adequate: '', driver_terminated: false,
    uniform_condition: 'Bom', epi_condition: 'Bom', vehicle_condition: 'Bom',
    tracking_active: '', has_logo: '', doors_sealed: '', odd_smells: '', incompatible_products: '',
    vehicle_inspection_notes: '',
    packaging_conditions: [], product_temperature: 'Bom',
    customer_name: '', customer_address: '', customer_comments: '', customer_rating: 0,
    hasAlteration: false, examiner_analysis: '',
  };
}

// ---------- Component ----------
export default function ChecklistPage() {
  const { currentUser, log, showAlert } = useApp();
  const [checklists, setChecklists] = useState<ChecklistData[]>(() => localDB.load<ChecklistData>(DB_KEYS.checklists));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [viewChecklist, setViewChecklist] = useState<ChecklistData | null>(null);

  const refresh = () => setChecklists(localDB.load<ChecklistData>(DB_KEYS.checklists));

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleCreate = () => {
    if (!form.examiner_name.trim() || !form.examiner_date) {
      showAlert('Preencha nome do examinador e data.', 'warning'); return;
    }
    if (form.hasAlteration && !form.examiner_analysis.trim()) {
      showAlert('Análise do examinador é obrigatória quando há alteração.', 'warning'); return;
    }
    const all = localDB.load<ChecklistData>(DB_KEYS.checklists);
    const newCL: ChecklistData = {
      ...form, id: crypto.randomUUID(),
      displayId: generateSequentialDisplayId('CHK', all),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
    };
    localDB.add(DB_KEYS.checklists, newCL);
    log(`Registrou checklist: ${newCL.displayId}`);
    showAlert('Checklist salvo com sucesso!', 'success');
    setForm(defaultForm()); setShowForm(false); refresh();
  };

  const handleDelete = (id: string) => { localDB.delete(DB_KEYS.checklists, id); refresh(); showAlert('Checklist excluído.', 'warning'); };

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = checklists.filter(c => {
      const d = new Date(c.examiner_date + 'T00:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const altered = checklists.filter(c => c.hasAlteration);
    const terminated = checklists.filter(c => c.driver_terminated);
    return {
      total: checklists.length,
      thisMonth: thisMonth.length,
      altered: altered.length,
      terminated: terminated.length,
      progressPct: Math.min(100, (thisMonth.length / MONTHLY_TARGET) * 100),
    };
  }, [checklists]);

  // ---------- Fieldset component ----------
  const Fieldset = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-secondary/30 p-4 rounded-lg border border-border space-y-4">
      <h3 className="text-base font-semibold text-primary">{title}</h3>
      {children}
    </div>
  );

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-sm text-muted-foreground mb-1">{children}</label>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-7 h-7 text-primary" /> Checklist da Distribuição
        </h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-2" /> Registrar Novo Checklist</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-primary mb-2">Monitor de Execução Mensal (Meta: {MONTHLY_TARGET})</p>
            <Progress value={stats.progressPct} className="h-6" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Realizados: {stats.thisMonth}</span>
              <span>Faltam: {Math.max(0, MONTHLY_TARGET - stats.thisMonth)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{stats.altered}</p>
            <p className="text-xs text-muted-foreground">Motoristas com Alterações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.terminated}</p>
            <p className="text-xs text-muted-foreground">Motoristas Desligados</p>
          </CardContent>
        </Card>
      </div>

      {/* ---------- FORM ---------- */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Registro de Checklist</CardTitle></CardHeader>
          <CardContent className="space-y-6">

            {/* 1. Examiner */}
            <Fieldset title="IDENTIFICAÇÃO DO EXAMINADOR">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>1. Data</Label><Input type="date" value={form.examiner_date} onChange={e => set('examiner_date', e.target.value)} /></div>
                <div><Label>2. Hora</Label><Input type="time" value={form.examiner_time} onChange={e => set('examiner_time', e.target.value)} /></div>
                <div><Label>3. Nome</Label><Input value={form.examiner_name} onChange={e => set('examiner_name', e.target.value)} placeholder="Insira seu nome" /></div>
                <div><Label>4. Cargo</Label><Input value={form.examiner_role} onChange={e => set('examiner_role', e.target.value)} placeholder="Insira seu cargo" /></div>
                <div><Label>5. Matrícula</Label><Input value={form.examiner_id} onChange={e => set('examiner_id', e.target.value)} placeholder="Insira sua matrícula" /></div>
                <div><Label>6. Unidade</Label><Input value={form.examiner_unit} onChange={e => set('examiner_unit', e.target.value)} placeholder="Insira sua unidade" /></div>
              </div>
            </Fieldset>

            {/* 2. Transporter */}
            <Fieldset title="IDENTIFICAÇÃO DO TRANSPORTADOR">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>7. Transportadora</Label><Input value={form.transporter_company} onChange={e => set('transporter_company', e.target.value)} /></div>
                <div><Label>8. Placa</Label><Input value={form.transporter_plate} onChange={e => set('transporter_plate', e.target.value)} /></div>
                <div><Label>9. Tipo de Veículo</Label>
                  <select value={form.transporter_vehicle_type} onChange={e => set('transporter_vehicle_type', e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><Label>10. Motorista</Label><Input value={form.transporter_driver_name} onChange={e => set('transporter_driver_name', e.target.value)} /></div>
                <div><Label>11. Validade CNH</Label><Input type="date" value={form.transporter_cnh_expiry} onChange={e => set('transporter_cnh_expiry', e.target.value)} /></div>
                <div><Label>12. Local de Abordagem</Label><Input value={form.transporter_approach_location} onChange={e => set('transporter_approach_location', e.target.value)} /></div>
                <div className="md:col-span-2"><Label>13. Rota de Entrega</Label><Input value={form.transporter_route} onChange={e => set('transporter_route', e.target.value)} /></div>
                <div><Label>14. Rota Adequada</Label><RadioGroup name="route_adequate" value={form.route_adequate} onChange={v => set('route_adequate', v)} /></div>
              </div>
              <label className="flex items-center gap-3 bg-destructive/10 p-3 rounded-lg border border-destructive/30 cursor-pointer mt-2">
                <input type="checkbox" checked={form.driver_terminated} onChange={e => set('driver_terminated', e.target.checked)}
                  className="h-5 w-5 accent-destructive rounded" />
                <span className="font-semibold text-destructive">Marcar como Desligado da Cooperativa</span>
              </label>
            </Fieldset>

            {/* 3. Vehicle Inspection */}
            <Fieldset title="INSPEÇÃO GERAL DO VEÍCULO">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>15. Condições dos uniformes</Label><ConditionSelect value={form.uniform_condition} onChange={v => set('uniform_condition', v)} /></div>
                <div><Label>Condição dos EPIs</Label><ConditionSelect value={form.epi_condition} onChange={v => set('epi_condition', v)} /></div>
                <div><Label>Condição do veículo</Label><ConditionSelect value={form.vehicle_condition} onChange={v => set('vehicle_condition', v)} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>16. Rastreamento ativo?</Label><RadioGroup name="tracking" value={form.tracking_active} onChange={v => set('tracking_active', v)} /></div>
                <div><Label>Veículo com logo?</Label><RadioGroup name="logo" value={form.has_logo} onChange={v => set('has_logo', v)} /></div>
                <div><Label>Portas lacradas?</Label><RadioGroup name="doors" value={form.doors_sealed} onChange={v => set('doors_sealed', v)} /></div>
                <div><Label>Odores estranhos?</Label><RadioGroup name="smells" value={form.odd_smells} onChange={v => set('odd_smells', v)} /></div>
                <div className="md:col-span-2"><Label>Produtos/materiais incompatíveis?</Label><RadioGroup name="incomp" value={form.incompatible_products} onChange={v => set('incompatible_products', v)} /></div>
              </div>
              <div><Label>17. Observações da Inspeção do Veículo</Label>
                <textarea value={form.vehicle_inspection_notes} onChange={e => set('vehicle_inspection_notes', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                  placeholder="Insira aqui a observação caso haja alteração" />
              </div>
            </Fieldset>

            {/* 4. Packaging */}
            <Fieldset title="INSPEÇÃO EMBALAGEM">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>18. Condição geral da embalagem</Label>
                  <div className="space-y-2 mt-1">
                    {PACKAGING_CONDITIONS.map(pc => (
                      <label key={pc} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.packaging_conditions.includes(pc)}
                          onChange={e => {
                            const next = e.target.checked
                              ? [...form.packaging_conditions, pc]
                              : form.packaging_conditions.filter(x => x !== pc);
                            set('packaging_conditions', next);
                          }}
                          className="accent-primary rounded h-4 w-4" />
                        <span className="text-sm">{pc}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div><Label>19. Temperatura dos produtos</Label><ConditionSelect value={form.product_temperature} onChange={v => set('product_temperature', v)} /></div>
              </div>
            </Fieldset>

            {/* 5. Customer Quality */}
            <Fieldset title="INSPEÇÃO QUALIDADE DO CLIENTE">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>20. Cliente</Label><Input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="Nome do cliente" /></div>
                <div><Label>21. Endereço</Label><Input value={form.customer_address} onChange={e => set('customer_address', e.target.value)} placeholder="Endereço do cliente" /></div>
                <div className="md:col-span-2"><Label>22. Comentário do cliente</Label>
                  <textarea value={form.customer_comments} onChange={e => set('customer_comments', e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]" />
                </div>
                <div className="md:col-span-2">
                  <Label>23. Avaliação do cliente</Label>
                  <StarRating value={form.customer_rating} onChange={v => set('customer_rating', v)} />
                </div>
              </div>
            </Fieldset>

            {/* 6. Analysis */}
            <Fieldset title="ANÁLISE E EVIDÊNCIAS">
              <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-r-lg">
                <p className="font-bold text-destructive">Atenção</p>
                <p className="text-sm text-destructive/80">Caso a inspeção apresente não conformidade, o processo deverá ser paralisado e autorizado pela área responsável.</p>
              </div>
              <div>
                <Label>24. Resultado da Inspeção</Label>
                <div className="flex items-center gap-6 bg-secondary/50 p-3 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="alteration" checked={!form.hasAlteration} onChange={() => set('hasAlteration', false)} className="h-5 w-5 accent-success" />
                    <span className="text-lg font-semibold text-success">Sem Alteração</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="alteration" checked={form.hasAlteration} onChange={() => set('hasAlteration', true)} className="h-5 w-5 accent-destructive" />
                    <span className="text-lg font-semibold text-destructive">Com Alteração</span>
                  </label>
                </div>
              </div>
              <div>
                <Label>25. Análise do examinador {form.hasAlteration && '(Obrigatório)'}</Label>
                <textarea value={form.examiner_analysis} onChange={e => set('examiner_analysis', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  required={form.hasAlteration} />
              </div>
            </Fieldset>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setForm(defaultForm()); }}>Limpar</Button>
              <Button onClick={handleCreate}>Salvar Checklist</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------- LIST ---------- */}
      <div>
        <h2 className="text-xl font-bold text-primary mb-4">Histórico de Checklists</h2>
        <div className="space-y-3">
          {checklists.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum checklist registrado.</CardContent></Card>
          ) : checklists.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(cl => (
            <Card key={cl.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-primary">{cl.displayId}</span>
                    <Badge className={cl.hasAlteration ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'}>
                      {cl.hasAlteration ? 'Com Alteração' : 'Sem Alteração'}
                    </Badge>
                    {cl.driver_terminated && <Badge className="bg-destructive/20 text-destructive">Desligado</Badge>}
                  </div>
                  <p className="font-semibold">{cl.transporter_driver_name || 'Sem motorista'} — {cl.transporter_plate || 'Sem placa'}</p>
                  <p className="text-sm text-muted-foreground">
                    {cl.examiner_name} • {formatDate(cl.examiner_date)} • {cl.transporter_company}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setViewChecklist(cl)}><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cl.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ---------- VIEW MODAL ---------- */}
      <Dialog open={!!viewChecklist} onOpenChange={() => setViewChecklist(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewChecklist?.displayId} — Detalhes do Checklist</DialogTitle></DialogHeader>
          {viewChecklist && (
            <div className="space-y-4 text-sm">
              <Fieldset title="Examinador">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <p><span className="text-muted-foreground">Data:</span> {formatDate(viewChecklist.examiner_date)}</p>
                  <p><span className="text-muted-foreground">Hora:</span> {viewChecklist.examiner_time}</p>
                  <p><span className="text-muted-foreground">Nome:</span> {viewChecklist.examiner_name}</p>
                  <p><span className="text-muted-foreground">Cargo:</span> {viewChecklist.examiner_role}</p>
                  <p><span className="text-muted-foreground">Matrícula:</span> {viewChecklist.examiner_id}</p>
                  <p><span className="text-muted-foreground">Unidade:</span> {viewChecklist.examiner_unit}</p>
                </div>
              </Fieldset>
              <Fieldset title="Transportador">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <p><span className="text-muted-foreground">Transportadora:</span> {viewChecklist.transporter_company}</p>
                  <p><span className="text-muted-foreground">Placa:</span> {viewChecklist.transporter_plate}</p>
                  <p><span className="text-muted-foreground">Veículo:</span> {viewChecklist.transporter_vehicle_type}</p>
                  <p><span className="text-muted-foreground">Motorista:</span> {viewChecklist.transporter_driver_name}</p>
                  <p><span className="text-muted-foreground">CNH:</span> {formatDate(viewChecklist.transporter_cnh_expiry)}</p>
                  <p><span className="text-muted-foreground">Rota adequada:</span> {viewChecklist.route_adequate || 'N/A'}</p>
                </div>
                {viewChecklist.driver_terminated && (
                  <Badge className="bg-destructive/20 text-destructive mt-2">MOTORISTA DESLIGADO</Badge>
                )}
              </Fieldset>
              <Fieldset title="Inspeção do Veículo">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <p><span className="text-muted-foreground">Uniformes:</span> {viewChecklist.uniform_condition}</p>
                  <p><span className="text-muted-foreground">EPIs:</span> {viewChecklist.epi_condition}</p>
                  <p><span className="text-muted-foreground">Veículo:</span> {viewChecklist.vehicle_condition}</p>
                  <p><span className="text-muted-foreground">Rastreamento:</span> {viewChecklist.tracking_active || 'N/A'}</p>
                  <p><span className="text-muted-foreground">Lacre:</span> {viewChecklist.doors_sealed || 'N/A'}</p>
                  <p><span className="text-muted-foreground">Odores:</span> {viewChecklist.odd_smells || 'N/A'}</p>
                </div>
                {viewChecklist.vehicle_inspection_notes && <p className="mt-2"><span className="text-muted-foreground">Observações:</span> {viewChecklist.vehicle_inspection_notes}</p>}
              </Fieldset>
              <Fieldset title="Embalagem">
                <p><span className="text-muted-foreground">Condições:</span> {viewChecklist.packaging_conditions?.length ? viewChecklist.packaging_conditions.join(', ') : 'Nenhuma'}</p>
                <p><span className="text-muted-foreground">Temperatura:</span> {viewChecklist.product_temperature}</p>
              </Fieldset>
              {viewChecklist.customer_name && (
                <Fieldset title="Cliente">
                  <p><span className="text-muted-foreground">Cliente:</span> {viewChecklist.customer_name}</p>
                  <p><span className="text-muted-foreground">Endereço:</span> {viewChecklist.customer_address}</p>
                  {viewChecklist.customer_comments && <p><span className="text-muted-foreground">Comentário:</span> {viewChecklist.customer_comments}</p>}
                  {viewChecklist.customer_rating > 0 && (
                    <p><span className="text-muted-foreground">Avaliação:</span> {'★'.repeat(viewChecklist.customer_rating)}{'☆'.repeat(5 - viewChecklist.customer_rating)}</p>
                  )}
                </Fieldset>
              )}
              <Fieldset title="Resultado">
                <Badge className={viewChecklist.hasAlteration ? 'bg-destructive/20 text-destructive text-base' : 'bg-success/20 text-success text-base'}>
                  {viewChecklist.hasAlteration ? 'COM ALTERAÇÃO' : 'SEM ALTERAÇÃO'}
                </Badge>
                {viewChecklist.examiner_analysis && <p className="mt-2"><span className="text-muted-foreground">Análise:</span> {viewChecklist.examiner_analysis}</p>}
              </Fieldset>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
