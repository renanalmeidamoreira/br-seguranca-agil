// === MÓDULO DE RELATÓRIOS === criação, edição, anexos ABNT, pré-visualização e exportação
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ConfirmDeleteDialog from '@/components/ui/confirm-delete-dialog';
import {
  FileText, Plus, Trash2, Save, FileDown, Printer, Paperclip,
  ChevronUp, ChevronDown, LayoutTemplate, ArrowLeft, Eye, PencilLine,
} from 'lucide-react';
import logoAsset from '@/assets/pifpaf-logo.png.asset.json';
import {
  BASE_MODELS, ReportDoc, ReportModel, createDoc, loadReports, saveReports,
  loadCustomModels, saveCustomModels, customToModel, CustomModel,
  newSection, newMeta, newSignature, buildReportHtml, exportWord, exportPdf,
} from '@/lib/reportModels';

type View = 'list' | 'models' | 'editor';

export default function ReportsPage() {
  const { activePage, log, showAlert } = useApp();
  const [docs, setDocs] = useState<ReportDoc[]>(() => loadReports());
  const [customModels, setCustomModels] = useState<CustomModel[]>(() => loadCustomModels());
  const [view, setView] = useState<View>(activePage === 'modelos' ? 'models' : 'list');
  const [editing, setEditing] = useState<ReportDoc | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setView(activePage === 'modelos' ? 'models' : 'list');
  }, [activePage]);

  const allModels: ReportModel[] = useMemo(
    () => [...BASE_MODELS, ...customModels.map(customToModel)],
    [customModels],
  );

  const persist = (list: ReportDoc[]) => { setDocs(list); saveReports(list); };

  const startNew = (model: ReportModel) => {
    const doc = createDoc(model);
    setEditing(doc);
    setView('editor');
  };

  const saveDoc = () => {
    if (!editing) return;
    const updated = { ...editing, updatedAt: new Date().toISOString() };
    const exists = docs.some(d => d.id === updated.id);
    persist(exists ? docs.map(d => (d.id === updated.id ? updated : d)) : [updated, ...docs]);
    setEditing(updated);
    log(`Salvou relatório: ${updated.title}`);
    showAlert('Relatório salvo.', 'success');
  };

  const removeDoc = (id: string) => {
    persist(docs.filter(d => d.id !== id));
    showAlert('Relatório excluído.', 'warning');
  };

  // ===== Anexos =====
  const addAttachments = (files: FileList | null) => {
    if (!editing || !files?.length) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        setEditing(prev => prev ? {
          ...prev,
          attachments: [...prev.attachments, {
            id: crypto.randomUUID(),
            kind: file.type.startsWith('image/') ? 'image' : 'file',
            fileName: file.name,
            caption: file.name.replace(/\.[^.]+$/, ''),
            source: 'Segurança Corporativa',
            dataUrl,
          }],
        } : prev);
      };
      reader.readAsDataURL(file);
    });
  };

  const logoUrl = logoAsset.url;

  const previewHtml = useMemo(
    () => (editing ? buildReportHtml(editing, logoUrl) : ''),
    [editing, logoUrl],
  );

  // ===== Criação de novo modelo a partir do relatório atual =====
  const saveAsModel = () => {
    if (!editing) return;
    const name = window.prompt('Nome do novo modelo:', `${editing.modelName} (personalizado)`);
    if (!name) return;
    const cm: CustomModel = {
      id: `custom-${crypto.randomUUID()}`,
      name,
      description: 'Modelo criado a partir de um relatório existente.',
      confidentiality: editing.confidentiality,
      titleDefault: editing.title,
      metaLabels: editing.meta.map(f => f.label),
      sectionTitles: editing.sections.map(s => ({ level: s.level, title: s.title })),
      signatureLabels: editing.signatures.map(s => s.label),
    };
    const next = [...customModels, cm];
    setCustomModels(next);
    saveCustomModels(next);
    showAlert('Modelo criado e disponível no grupo Documentos.', 'success');
  };

  const removeModel = (id: string) => {
    const next = customModels.filter(c => c.id !== id);
    setCustomModels(next);
    saveCustomModels(next);
  };

  // ================= LISTA =================
  if (view === 'list' || view === 'models') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {view === 'models' ? 'Modelos de Relatório' : 'Relatórios'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {view === 'models'
                ? 'Escolha um modelo para iniciar um novo documento.'
                : 'Documentos criados, editáveis e exportáveis em Word ou PDF.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={view === 'list' ? 'default' : 'secondary'} onClick={() => setView('list')}>
              <FileText className="w-4 h-4 mr-2" /> Meus relatórios
            </Button>
            <Button variant={view === 'models' ? 'default' : 'secondary'} onClick={() => setView('models')}>
              <LayoutTemplate className="w-4 h-4 mr-2" /> Modelos
            </Button>
          </div>
        </div>

        {view === 'models' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {allModels.map(model => (
              <div key={model.id} className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="p-2 rounded-md bg-secondary text-primary"><FileText className="w-5 h-5" /></span>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{model.name}</p>
                    <p className="text-xs text-muted-foreground">{model.description}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-auto">
                  <Button size="sm" className="flex-1" onClick={() => startNew(model)}>
                    <Plus className="w-4 h-4 mr-1" /> Usar modelo
                  </Button>
                  {model.custom && (
                    <Button size="sm" variant="ghost" onClick={() => removeModel(model.id)} title="Excluir modelo">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-10 text-center space-y-3">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum relatório criado ainda.</p>
            <Button onClick={() => setView('models')}>
              <Plus className="w-4 h-4 mr-2" /> Criar a partir de um modelo
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {docs.map(d => (
              <div key={d.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div>
                  <p className="font-semibold text-sm">{d.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.subtitle || d.modelName}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Atualizado em {new Date(d.updatedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => { setEditing(d); setView('editor'); }}>
                    <PencilLine className="w-4 h-4 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => exportWord(d, logoUrl)}>
                    <FileDown className="w-4 h-4 mr-1" /> Word
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => exportPdf(d, logoUrl)}>
                    <Printer className="w-4 h-4 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(d.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <ConfirmDeleteDialog
          open={!!deleteId}
          onOpenChange={o => { if (!o) setDeleteId(null); }}
          onConfirm={() => { if (deleteId) removeDoc(deleteId); setDeleteId(null); }}
          title="Excluir relatório"
          description="Esta ação não pode ser desfeita."
        />
      </div>
    );
  }

  // ================= EDITOR =================
  if (!editing) return null;
  const doc = editing;
  const upd = (patch: Partial<ReportDoc>) => setEditing({ ...doc, ...patch });

  const moveSection = (index: number, dir: -1 | 1) => {
    const next = [...doc.sections];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    upd({ sections: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => setView('list')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-lg font-bold truncate">{doc.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={saveDoc}><Save className="w-4 h-4 mr-1" /> Salvar</Button>
          <Button size="sm" variant="secondary" onClick={saveAsModel}>
            <LayoutTemplate className="w-4 h-4 mr-1" /> Salvar como modelo
          </Button>
          <Button size="sm" variant="secondary" onClick={() => exportWord(doc, logoUrl)}>
            <FileDown className="w-4 h-4 mr-1" /> Word
          </Button>
          <Button size="sm" variant="secondary" onClick={() => exportPdf(doc, logoUrl)}>
            <Printer className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowPreview(p => !p)}>
            <Eye className="w-4 h-4 mr-1" /> {showPreview ? 'Ocultar' : 'Ver'} prévia
          </Button>
        </div>
      </div>

      <div className={`grid gap-4 ${showPreview ? 'xl:grid-cols-2' : ''}`}>
        {/* ---------- FORMULÁRIO ---------- */}
        <div className="space-y-4 min-w-0">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div>
              <Label>Título do relatório</Label>
              <Input className="mt-1" value={doc.title} onChange={e => upd({ title: e.target.value })} />
            </div>
            <div>
              <Label>Subtítulo</Label>
              <Input className="mt-1" value={doc.subtitle} onChange={e => upd({ subtitle: e.target.value })}
                placeholder="Ex: Agressão física mútua entre colaboradoras | Vestiário - Unidade Fabril VRB" />
            </div>
            <div>
              <Label>Linha de identificação (unidade, cidade e data)</Label>
              <Input className="mt-1" value={doc.headerLine} onChange={e => upd({ headerLine: e.target.value })}
                placeholder="Ex: Unidade Frigorífica Polo VRB - Visconde do Rio Branco, MG | 10 de Setembro de 2026" />
            </div>
            <div>
              <Label>Sigilo</Label>
              <Input className="mt-1" value={doc.confidentiality} onChange={e => upd({ confidentiality: e.target.value })} />
            </div>
          </div>

          {/* Metadados */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Dados do cabeçalho</h2>
              <Button size="sm" variant="secondary" onClick={() => upd({ meta: [...doc.meta, newMeta('Novo campo')] })}>
                <Plus className="w-4 h-4 mr-1" /> Campo
              </Button>
            </div>
            {doc.meta.map(f => (
              <div key={f.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
                <Input value={f.label} onChange={e => upd({ meta: doc.meta.map(x => x.id === f.id ? { ...x, label: e.target.value } : x) })} />
                <Input value={f.value} onChange={e => upd({ meta: doc.meta.map(x => x.id === f.id ? { ...x, value: e.target.value } : x) })} />
                <Button size="sm" variant="ghost" onClick={() => upd({ meta: doc.meta.filter(x => x.id !== f.id) })}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Seções */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-sm">Títulos, subtítulos e conteúdo</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => upd({ sections: [...doc.sections, newSection(1, 'NOVO TÍTULO')] })}>
                  <Plus className="w-4 h-4 mr-1" /> Título
                </Button>
                <Button size="sm" variant="secondary" onClick={() => upd({ sections: [...doc.sections, newSection(2, 'Novo subtítulo')] })}>
                  <Plus className="w-4 h-4 mr-1" /> Subtítulo
                </Button>
              </div>
            </div>

            {doc.sections.map((sec, i) => (
              <div key={sec.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={sec.level}
                    onChange={e => upd({ sections: doc.sections.map(x => x.id === sec.id ? { ...x, level: Number(e.target.value) as 1 | 2 | 3 } : x) })}
                    className="text-xs rounded-md bg-secondary border border-border px-2 py-1.5"
                  >
                    <option value={1}>Título</option>
                    <option value={2}>Subtítulo</option>
                    <option value={3}>Sub-subtítulo</option>
                  </select>
                  <Input
                    className="flex-1 min-w-[160px]"
                    value={sec.title}
                    onChange={e => upd({ sections: doc.sections.map(x => x.id === sec.id ? { ...x, title: e.target.value } : x) })}
                  />
                  <Button size="sm" variant="ghost" onClick={() => moveSection(i, -1)} title="Subir"><ChevronUp className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => moveSection(i, 1)} title="Descer"><ChevronDown className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => upd({ sections: doc.sections.filter(x => x.id !== sec.id) })}><Trash2 className="w-4 h-4" /></Button>
                </div>
                <Textarea
                  rows={5}
                  placeholder="Digite a análise. Cada linha em branco cria um novo parágrafo justificado."
                  value={sec.content}
                  onChange={e => upd({ sections: doc.sections.map(x => x.id === sec.id ? { ...x, content: e.target.value } : x) })}
                />
              </div>
            ))}
          </div>

          {/* Anexos */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Anexos (enquadramento ABNT)</h2>
              <>
                <input ref={fileRef} type="file" multiple className="hidden" onChange={e => addAttachments(e.target.files)} />
                <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="w-4 h-4 mr-1" /> Incluir anexo
                </Button>
              </>
            </div>
            {doc.attachments.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Imagens e arquivos entram numerados como ANEXO A, B, C… com legenda e fonte conforme ABNT.
              </p>
            )}
            {doc.attachments.map((a, i) => (
              <div key={a.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-3">
                  {a.kind === 'image'
                    ? <img src={a.dataUrl} alt={a.caption} className="w-16 h-16 object-cover rounded-md border border-border" />
                    : <span className="w-16 h-16 rounded-md bg-secondary flex items-center justify-center"><FileText className="w-6 h-6" /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">ANEXO {String.fromCharCode(65 + i)} — {a.fileName}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => upd({ attachments: doc.attachments.filter(x => x.id !== a.id) })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input placeholder="Legenda" value={a.caption}
                    onChange={e => upd({ attachments: doc.attachments.map(x => x.id === a.id ? { ...x, caption: e.target.value } : x) })} />
                  <Input placeholder="Fonte" value={a.source}
                    onChange={e => upd({ attachments: doc.attachments.map(x => x.id === a.id ? { ...x, source: e.target.value } : x) })} />
                </div>
              </div>
            ))}
          </div>

          {/* Assinaturas */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Responsáveis</h2>
              <Button size="sm" variant="secondary" onClick={() => upd({ signatures: [...doc.signatures, newSignature('Revisado por')] })}>
                <Plus className="w-4 h-4 mr-1" /> Responsável
              </Button>
            </div>
            {doc.signatures.map(sg => (
              <div key={sg.id} className="rounded-lg border border-border p-3 grid gap-2 sm:grid-cols-2">
                <Input placeholder="Rótulo (Elaborado por)" value={sg.label}
                  onChange={e => upd({ signatures: doc.signatures.map(x => x.id === sg.id ? { ...x, label: e.target.value } : x) })} />
                <Input placeholder="Nome" value={sg.name}
                  onChange={e => upd({ signatures: doc.signatures.map(x => x.id === sg.id ? { ...x, name: e.target.value } : x) })} />
                <Input placeholder="Cargo" value={sg.role}
                  onChange={e => upd({ signatures: doc.signatures.map(x => x.id === sg.id ? { ...x, role: e.target.value } : x) })} />
                <Input placeholder="Empresa / Unidade" value={sg.org}
                  onChange={e => upd({ signatures: doc.signatures.map(x => x.id === sg.id ? { ...x, org: e.target.value } : x) })} />
                <Input placeholder="Data" value={sg.date}
                  onChange={e => upd({ signatures: doc.signatures.map(x => x.id === sg.id ? { ...x, date: e.target.value } : x) })} />
                <Button size="sm" variant="ghost" onClick={() => upd({ signatures: doc.signatures.filter(x => x.id !== sg.id) })}>
                  <Trash2 className="w-4 h-4 mr-1" /> Remover
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- PRÉVIA ---------- */}
        {showPreview && (
          <div className="min-w-0">
            <div className="sticky top-0 space-y-2">
              <p className="text-xs text-muted-foreground">
                Prévia da folha A4 (margens 3/2 cm, Arial 12, entrelinha 1,5) — igual ao arquivo exportado.
              </p>
              <div className="rounded-lg border border-border overflow-hidden bg-white">
                <iframe
                  title="Prévia do relatório"
                  srcDoc={previewHtml}
                  className="w-full"
                  style={{ height: '75vh', border: 0, background: '#fff' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
