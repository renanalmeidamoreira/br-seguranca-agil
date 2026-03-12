import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { CaseData, generateSequentialDisplayId, formatCurrency } from '@/lib/localDB';
import { X, Plus, Trash2 } from 'lucide-react';

function calculateSeverity(g: number, u: number, t: number) {
  const score = g * u * t;
  if (score >= 80) return 'MUITO GRAVE';
  if (score >= 40) return 'GRAVE';
  if (score >= 20) return 'MODERADO';
  return 'SEM GRAVIDADE';
}

function getSeverityColor(sev: string) {
  switch (sev) {
    case 'MUITO GRAVE': return 'text-destructive';
    case 'GRAVE': return 'text-orange-400';
    case 'MODERADO': return 'text-warning';
    default: return 'text-info';
  }
}

interface Props {
  editingCase: CaseData | null;
  onClose: () => void;
}

export default function CaseForm({ editingCase, onClose }: Props) {
  const { cases, addCase, updateCase } = useApp();

  const [form, setForm] = useState({
    DATA: new Date().toISOString().slice(0, 10),
    LOCAL: '',
    UNIDADE: '',
    SETOR: '',
    CLIENTE_DA_OCORRÊNCIA: '',
    DESCRIÇÃO_DA_OCORRÊNCIA: '',
    TIPO_DE_OCORRÊNCIA: '',
    TIPO_DE_OPERAÇÃO: '',
    case_g: 1,
    case_u: 1,
    case_t: 1,
    RCA_DA_OCORRÊNCIA: '',
    SINTESE: '',
    AÇÃO_TOMADA: '',
    STATUS: 'EM ANDAMENTO',
    VALOR_PERDA: '',
    VALOR_RECUPERADO: '',
    VALOR_FRAUDE_MENSAL: '',
    INICIO_TRATATIVAS: '',
    ENCERRAMENTO: '',
  });

  const [involved, setInvolved] = useState<{ name: string; measure: string }[]>([]);

  useEffect(() => {
    if (editingCase) {
      setForm({
        DATA: editingCase.DATA || '',
        LOCAL: editingCase.LOCAL || '',
        UNIDADE: editingCase.UNIDADE || '',
        SETOR: editingCase.SETOR || '',
        CLIENTE_DA_OCORRÊNCIA: editingCase.CLIENTE_DA_OCORRÊNCIA || '',
        DESCRIÇÃO_DA_OCORRÊNCIA: editingCase.DESCRIÇÃO_DA_OCORRÊNCIA || '',
        TIPO_DE_OCORRÊNCIA: editingCase.TIPO_DE_OCORRÊNCIA || '',
        TIPO_DE_OPERAÇÃO: editingCase.TIPO_DE_OPERAÇÃO || '',
        case_g: editingCase.case_g || 1,
        case_u: editingCase.case_u || 1,
        case_t: editingCase.case_t || 1,
        RCA_DA_OCORRÊNCIA: editingCase.RCA_DA_OCORRÊNCIA || '',
        SINTESE: editingCase.SINTESE || '',
        AÇÃO_TOMADA: editingCase.AÇÃO_TOMADA || '',
        STATUS: editingCase.STATUS || 'EM ANDAMENTO',
        VALOR_PERDA: String(editingCase.VALOR_PERDA || ''),
        VALOR_RECUPERADO: String(editingCase.VALOR_RECUPERADO || ''),
        VALOR_FRAUDE_MENSAL: String(editingCase.VALOR_FRAUDE_MENSAL || ''),
        INICIO_TRATATIVAS: editingCase.INICIO_TRATATIVAS ? editingCase.INICIO_TRATATIVAS.slice(0, 16) : '',
        ENCERRAMENTO: editingCase.ENCERRAMENTO ? editingCase.ENCERRAMENTO.slice(0, 16) : '',
      });
      setInvolved(editingCase.ENVOLVIDOS ? [...editingCase.ENVOLVIDOS] : []);
    }
  }, [editingCase]);

  const severity = calculateSeverity(form.case_g, form.case_u, form.case_t);
  const score = form.case_g * form.case_u * form.case_t;
  const perdaEvitadaAnual = (parseFloat(form.VALOR_FRAUDE_MENSAL) || 0) * 12;

  const calculateDuration = () => {
    if (!form.INICIO_TRATATIVAS || !form.ENCERRAMENTO) return '';
    const start = new Date(form.INICIO_TRATATIVAS);
    const end = new Date(form.ENCERRAMENTO);
    if (end < start) return 'Data inválida';
    const diffMs = end.getTime() - start.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  };

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.DATA || !form.LOCAL || !form.DESCRIÇÃO_DA_OCORRÊNCIA || !form.TIPO_DE_OCORRÊNCIA) {
      alert('Preencha os campos obrigatórios: Data, Local, Descrição e Tipo.');
      return;
    }

    const caseData: CaseData = {
      id: editingCase?.id || crypto.randomUUID(),
      displayId: editingCase?.displayId || generateSequentialDisplayId('CS', cases),
      ...form,
      case_g: Number(form.case_g),
      case_u: Number(form.case_u),
      case_t: Number(form.case_t),
      GRAVIDADE: severity,
      ENVOLVIDOS: involved,
      VALOR_PERDA: parseFloat(form.VALOR_PERDA) || 0,
      VALOR_RECUPERADO: parseFloat(form.VALOR_RECUPERADO) || 0,
      VALOR_FRAUDE_MENSAL: parseFloat(form.VALOR_FRAUDE_MENSAL) || 0,
      PERDA_EVITADA_ANUAL: perdaEvitadaAnual,
      TEMPO_DE_TRATATIVA: calculateDuration(),
    };

    if (editingCase) {
      updateCase(caseData);
    } else {
      addCase(caseData);
    }
    onClose();
  };

  const inputClass = "w-full rounded-lg px-3 py-2 bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary";
  const labelClass = "block text-sm font-medium mb-1";

  return (
    <form onSubmit={handleSubmit} className="bg-card p-6 rounded-lg mb-6 border border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-primary">
          {editingCase ? 'Editar Caso' : 'Cadastro de Novo Caso'}
        </h2>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Situação da Ocorrência */}
      <fieldset className="bg-secondary/30 p-4 rounded-lg mb-6">
        <legend className="text-lg font-semibold text-warning mb-4 px-2">Situação da Ocorrência</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>DATA *</label>
            <input type="date" value={form.DATA} onChange={e => handleChange('DATA', e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>LOCAL *</label>
            <input type="text" value={form.LOCAL} onChange={e => handleChange('LOCAL', e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>UNIDADE</label>
            <input type="text" value={form.UNIDADE} onChange={e => handleChange('UNIDADE', e.target.value)} className={inputClass} />
          </div>
        </div>
      </fieldset>

      {/* Matriz GUT */}
      <fieldset className="bg-secondary/30 p-4 rounded-lg mb-6">
        <legend className="text-lg font-semibold text-warning mb-4 px-2">Matriz de Risco (GUT)</legend>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          {[
            { id: 'case_g', label: 'Gravidade (G)', options: ['1 - Sem gravidade', '2 - Pouco grave', '3 - Grave', '4 - Muito grave', '5 - Extremamente grave'] },
            { id: 'case_u', label: 'Urgência (U)', options: ['1 - Pode esperar', '2 - Pouco urgente', '3 - Urgente', '4 - Muito urgente', '5 - Ação imediata'] },
            { id: 'case_t', label: 'Tendência (T)', options: ['1 - Não irá piorar', '2 - Piora a longo prazo', '3 - Piora a médio prazo', '4 - Piora a curto prazo', '5 - Piora rapidamente'] },
          ].map(field => (
            <div key={field.id}>
              <label className={labelClass}>{field.label}</label>
              <select
                value={(form as any)[field.id]}
                onChange={e => handleChange(field.id, Number(e.target.value))}
                className={inputClass}
              >
                {field.options.map((opt, i) => (
                  <option key={i} value={i + 1}>{opt}</option>
                ))}
              </select>
            </div>
          ))}
          <div className="md:col-span-2 bg-background/50 p-4 rounded-lg text-center">
            <label className="block text-sm font-medium text-muted-foreground">Gravidade Calculada</label>
            <p className={`text-2xl font-bold ${getSeverityColor(severity)}`}>{severity}</p>
            <p className="text-xs text-muted-foreground">Pontuação: {score}</p>
          </div>
        </div>
      </fieldset>

      {/* Descrição e Envolvimento */}
      <fieldset className="bg-secondary/30 p-4 rounded-lg mb-6">
        <legend className="text-lg font-semibold text-warning mb-4 px-2">Descrição e Envolvimento</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>SETOR</label>
            <input type="text" value={form.SETOR} onChange={e => handleChange('SETOR', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>CLIENTE DA OCORRÊNCIA</label>
            <input type="text" value={form.CLIENTE_DA_OCORRÊNCIA} onChange={e => handleChange('CLIENTE_DA_OCORRÊNCIA', e.target.value)} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>DESCRIÇÃO DA OCORRÊNCIA *</label>
            <textarea value={form.DESCRIÇÃO_DA_OCORRÊNCIA} onChange={e => handleChange('DESCRIÇÃO_DA_OCORRÊNCIA', e.target.value)} rows={3} className={inputClass} required />
          </div>

          {/* Envolvidos */}
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">ENVOLVIDOS E MEDIDAS</label>
              <button type="button" onClick={() => setInvolved(prev => [...prev, { name: '', measure: '' }])} className="bg-info text-info-foreground text-xs font-bold py-1 px-3 rounded-full flex items-center">
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </button>
            </div>
            {involved.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum envolvido adicionado.</p>
            ) : (
              <div className="space-y-2">
                {involved.map((person, idx) => (
                  <div key={idx} className="grid grid-cols-10 gap-2 items-center bg-secondary/30 p-2 rounded">
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Nome"
                        value={person.name}
                        onChange={e => {
                          const copy = [...involved];
                          copy[idx].name = e.target.value;
                          setInvolved(copy);
                        }}
                        className={`${inputClass} text-sm`}
                      />
                    </div>
                    <div className="col-span-5">
                      <input
                        type="text"
                        placeholder="Medida aplicada"
                        value={person.measure}
                        onChange={e => {
                          const copy = [...involved];
                          copy[idx].measure = e.target.value;
                          setInvolved(copy);
                        }}
                        className={`${inputClass} text-sm`}
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <button type="button" onClick={() => setInvolved(prev => prev.filter((_, i) => i !== idx))} className="text-destructive hover:opacity-80">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </fieldset>

      {/* Classificação */}
      <fieldset className="bg-secondary/30 p-4 rounded-lg mb-6">
        <legend className="text-lg font-semibold text-warning mb-4 px-2">Classificação e Tipo</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>TIPO DE OCORRÊNCIA *</label>
            <input type="text" value={form.TIPO_DE_OCORRÊNCIA} onChange={e => handleChange('TIPO_DE_OCORRÊNCIA', e.target.value)} className={inputClass} required placeholder="Ex: FURTO, FRAUDE, DESVIO..." />
          </div>
          <div>
            <label className={labelClass}>TIPO DE OPERAÇÃO</label>
            <input type="text" value={form.TIPO_DE_OPERAÇÃO} onChange={e => handleChange('TIPO_DE_OPERAÇÃO', e.target.value)} className={inputClass} />
          </div>
        </div>
      </fieldset>

      {/* Financeiro */}
      <fieldset className="bg-secondary/30 p-4 rounded-lg mb-6">
        <legend className="text-lg font-semibold text-warning mb-4 px-2">Impacto Financeiro</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>VALOR DA PERDA (R$)</label>
            <input type="number" step="0.01" value={form.VALOR_PERDA} onChange={e => handleChange('VALOR_PERDA', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>VALOR RECUPERADO (R$)</label>
            <input type="number" step="0.01" value={form.VALOR_RECUPERADO} onChange={e => handleChange('VALOR_RECUPERADO', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>VALOR FRAUDE MENSAL (R$)</label>
            <input type="number" step="0.01" value={form.VALOR_FRAUDE_MENSAL} onChange={e => handleChange('VALOR_FRAUDE_MENSAL', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Perda Evitada Anual: <span className="text-info font-bold">{formatCurrency(perdaEvitadaAnual)}</span>
        </div>
      </fieldset>

      {/* Tratativa */}
      <fieldset className="bg-secondary/30 p-4 rounded-lg mb-6">
        <legend className="text-lg font-semibold text-warning mb-4 px-2">Tratativas e Conclusão</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>INÍCIO DAS TRATATIVAS</label>
            <input type="datetime-local" value={form.INICIO_TRATATIVAS} onChange={e => handleChange('INICIO_TRATATIVAS', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>ENCERRAMENTO</label>
            <input type="datetime-local" value={form.ENCERRAMENTO} onChange={e => handleChange('ENCERRAMENTO', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>TEMPO DE TRATATIVA</label>
            <input type="text" value={calculateDuration()} readOnly className={`${inputClass} opacity-70`} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={labelClass}>RCA DA OCORRÊNCIA</label>
            <textarea value={form.RCA_DA_OCORRÊNCIA} onChange={e => handleChange('RCA_DA_OCORRÊNCIA', e.target.value)} rows={3} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>SÍNTESE</label>
            <textarea value={form.SINTESE} onChange={e => handleChange('SINTESE', e.target.value)} rows={3} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={labelClass}>AÇÃO TOMADA</label>
            <input type="text" value={form.AÇÃO_TOMADA} onChange={e => handleChange('AÇÃO_TOMADA', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>STATUS</label>
            <select value={form.STATUS} onChange={e => handleChange('STATUS', e.target.value)} className={inputClass}>
              <option>EM ANDAMENTO</option>
              <option>FINALIZADO</option>
              <option>EM PAUSA</option>
            </select>
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end gap-4">
        <button type="button" onClick={onClose} className="bg-secondary text-foreground font-bold py-2 px-6 rounded-lg hover:opacity-90">
          Cancelar
        </button>
        <button type="submit" className="bg-success text-success-foreground font-bold py-2 px-6 rounded-lg hover:opacity-90">
          {editingCase ? 'Atualizar Caso' : 'Salvar Caso'}
        </button>
      </div>
    </form>
  );
}
