// === MÓDULO DE RELATÓRIOS === modelos, tipos e exportação (Word/PDF) padrão ABNT
export interface ReportSection {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  content: string;
}

export interface ReportAttachment {
  id: string;
  kind: 'image' | 'file';
  fileName: string;
  caption: string;
  source: string;
  dataUrl: string;
}

export interface ReportSignature {
  id: string;
  label: string;
  name: string;
  role: string;
  org: string;
  date: string;
}

export interface ReportMetaField {
  id: string;
  label: string;
  value: string;
}

export interface ReportDoc {
  id: string;
  modelId: string;
  modelName: string;
  title: string;
  subtitle: string;
  headerLine: string;
  confidentiality: string;
  meta: ReportMetaField[];
  sections: ReportSection[];
  attachments: ReportAttachment[];
  signatures: ReportSignature[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportModel {
  id: string;
  name: string;
  description: string;
  custom?: boolean;
  build: () => Omit<ReportDoc, 'id' | 'createdAt' | 'updatedAt' | 'modelId' | 'modelName'>;
}

export const REPORTS_KEY = 'synapse_reports_v1';
export const CUSTOM_MODELS_KEY = 'synapse_report_models_v1';

const uid = () => crypto.randomUUID();
const s = (level: 1 | 2 | 3, title: string, content = ''): ReportSection => ({ id: uid(), level, title, content });
const m = (label: string, value = ''): ReportMetaField => ({ id: uid(), label, value });
const sig = (label: string): ReportSignature => ({
  id: uid(), label, name: '', role: '', org: 'Pif Paf Alimentos', date: '',
});

const todayBR = () => new Date().toLocaleDateString('pt-BR');

// ===== Modelo 1: Apuração de Ocorrência (idêntico ao padrão institucional) =====
const apuracao: ReportModel = {
  id: 'apuracao-ocorrencia',
  name: 'Apuração de Ocorrência',
  description: 'Modelo institucional completo: sumário executivo, depoimentos, achados, risco e medidas.',
  build: () => ({
    title: 'RELATÓRIO - APURAÇÃO DE OCORRÊNCIA',
    subtitle: '',
    headerLine: '',
    confidentiality: 'INTERNO',
    meta: [
      m('Nº do relato/protocolo'),
      m('Ocorrência'),
      m('Local da Ocorrência'),
      m('Data da Denúncia'),
      m('Data do Relatório', todayBR()),
      m('Responsável'),
      m('Envolvidos'),
    ],
    sections: [
      s(1, 'SUMÁRIO EXECUTIVO'),
      s(1, 'OBJETIVO DA APURAÇÃO'),
      s(1, 'METODOLOGIA DE APURAÇÃO'),
      s(1, 'RESUMO DOS DEPOIMENTOS'),
      s(2, 'Testemunha 1'),
      s(2, 'Testemunha 2'),
      s(1, 'ACHADOS, EVIDÊNCIAS E CONFRONTO DE VERSÕES'),
      s(1, 'ANÁLISE DOS FATOS'),
      s(2, 'Pontos corroborados'),
      s(2, 'Pontos divergentes / não esclarecidos'),
      s(1, 'CONCLUSÃO'),
      s(1, 'AVALIAÇÃO DE RISCO'),
      s(1, 'MEDIDAS ADOTADAS PELA EMPRESA'),
      s(1, 'CONSIDERAÇÕES FINAIS'),
      s(1, 'OBSERVAÇÕES FINAIS'),
    ],
    attachments: [],
    signatures: [{ ...sig('Elaborado por') }, { ...sig('Aprovado por') }],
  }),
};

// ===== Modelo 2: Auditoria de Processo =====
const auditoria: ReportModel = {
  id: 'auditoria-processo',
  name: 'Auditoria de Processo',
  description: 'Verificação de controles, vulnerabilidades e plano de ação.',
  build: () => ({
    title: 'RELATÓRIO DE AUDITORIA DE PROCESSO',
    subtitle: '',
    headerLine: '',
    confidentiality: 'INTERNO',
    meta: [m('Processo auditado'), m('Unidade'), m('Período'), m('Data do Relatório', todayBR()), m('Responsável')],
    sections: [
      s(1, 'OBJETIVO'),
      s(1, 'ESCOPO E METODOLOGIA'),
      s(1, 'CONTROLES VERIFICADOS'),
      s(1, 'ACHADOS E VULNERABILIDADES'),
      s(1, 'AVALIAÇÃO DE RISCO'),
      s(1, 'PLANO DE AÇÃO RECOMENDADO'),
      s(1, 'CONCLUSÃO'),
    ],
    attachments: [],
    signatures: [{ ...sig('Elaborado por') }, { ...sig('Aprovado por') }],
  }),
};

// ===== Modelo 3: Relatório de Inteligência =====
const inteligencia: ReportModel = {
  id: 'relatorio-inteligencia',
  name: 'Relatório de Inteligência',
  description: 'Consolidação de consultas, fontes e análise de vínculos.',
  build: () => ({
    title: 'RELATÓRIO DE INTELIGÊNCIA',
    subtitle: '',
    headerLine: '',
    confidentiality: 'RESTRITO',
    meta: [m('Alvo / Assunto'), m('Solicitante'), m('Data do Relatório', todayBR()), m('Responsável')],
    sections: [
      s(1, 'CONTEXTO DA DEMANDA'),
      s(1, 'FONTES CONSULTADAS'),
      s(1, 'DADOS APURADOS'),
      s(1, 'ANÁLISE DE VÍNCULOS'),
      s(1, 'CONCLUSÃO E RECOMENDAÇÕES'),
    ],
    attachments: [],
    signatures: [{ ...sig('Elaborado por') }],
  }),
};

// ===== Modelo 4: Livre =====
const livre: ReportModel = {
  id: 'modelo-livre',
  name: 'Documento Livre',
  description: 'Comece do zero e monte títulos e subtítulos livremente.',
  build: () => ({
    title: 'RELATÓRIO',
    subtitle: '',
    headerLine: '',
    confidentiality: 'INTERNO',
    meta: [m('Assunto'), m('Data do Relatório', todayBR()), m('Responsável')],
    sections: [s(1, 'INTRODUÇÃO'), s(1, 'DESENVOLVIMENTO'), s(1, 'CONCLUSÃO')],
    attachments: [],
    signatures: [{ ...sig('Elaborado por') }],
  }),
};

export const BASE_MODELS: ReportModel[] = [apuracao, auditoria, inteligencia, livre];

export interface CustomModel {
  id: string;
  name: string;
  description: string;
  confidentiality: string;
  titleDefault: string;
  metaLabels: string[];
  sectionTitles: { level: 1 | 2 | 3; title: string }[];
  signatureLabels: string[];
}

export function loadCustomModels(): CustomModel[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_MODELS_KEY) || '[]'); } catch { return []; }
}
export function saveCustomModels(list: CustomModel[]) {
  try { localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(list)); } catch { /* noop */ }
}

export function customToModel(cm: CustomModel): ReportModel {
  return {
    id: cm.id,
    name: cm.name,
    description: cm.description,
    custom: true,
    build: () => ({
      title: cm.titleDefault || 'RELATÓRIO',
      subtitle: '',
      headerLine: '',
      confidentiality: cm.confidentiality || 'INTERNO',
      meta: cm.metaLabels.map(l => m(l)),
      sections: cm.sectionTitles.map(st => s(st.level, st.title)),
      attachments: [],
      signatures: cm.signatureLabels.map(l => sig(l)),
    }),
  };
}

export function createDoc(model: ReportModel): ReportDoc {
  const base = model.build();
  const now = new Date().toISOString();
  return { id: uid(), modelId: model.id, modelName: model.name, ...base, createdAt: now, updatedAt: now };
}

export function loadReports(): ReportDoc[] {
  try { return JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]'); } catch { return []; }
}
export function saveReports(list: ReportDoc[]) {
  try { localStorage.setItem(REPORTS_KEY, JSON.stringify(list)); } catch { /* noop */ }
}

export const newSection = s;
export const newMeta = m;
export const newSignature = sig;

// ===== Geração do HTML final (padrão ABNT: A4, margens 3/2 cm, Arial 12, 1,5) =====
function esc(text: string) {
  return (text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function paragraphs(text: string) {
  return esc(text)
    .split(/\n{1,}/)
    .filter(l => l.trim())
    .map(l => `<p class="body">${l}</p>`)
    .join('');
}

const ABNT_CSS = `
  @page { size: A4; margin: 3cm 2cm 2cm 3cm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #000; line-height: 1.5; }
  .capa { text-align: center; margin-bottom: 24pt; }
  .capa img { max-height: 70px; }
  h1.doc-title { font-size: 14pt; text-transform: uppercase; text-align: center; margin: 12pt 0 4pt; }
  .subtitle { text-align: center; font-size: 12pt; font-weight: bold; margin: 0 0 2pt; }
  .headerline { text-align: center; font-size: 10pt; color: #333; margin: 0 0 12pt; }
  .sigilo { text-align: right; font-size: 10pt; font-weight: bold; letter-spacing: .05em; }
  table.meta { width: 100%; border-collapse: collapse; margin: 12pt 0 18pt; font-size: 11pt; }
  table.meta td { border: 1px solid #999; padding: 4pt 6pt; vertical-align: top; }
  table.meta td.k { width: 32%; font-weight: bold; background: #f2f2f2; }
  h2.s1 { font-size: 12pt; text-transform: uppercase; margin: 18pt 0 6pt; }
  h3.s2 { font-size: 12pt; margin: 12pt 0 6pt; }
  h4.s3 { font-size: 12pt; font-style: italic; font-weight: normal; margin: 10pt 0 6pt; }
  p.body { text-align: justify; text-indent: 1.25cm; margin: 0 0 6pt; }
  .anexo { page-break-inside: avoid; margin: 18pt 0; text-align: center; }
  .anexo .cap { font-size: 10pt; margin-bottom: 6pt; text-align: center; }
  .anexo .fonte { font-size: 10pt; margin-top: 4pt; text-align: center; }
  .anexo img { max-width: 100%; max-height: 16cm; }
  .assinaturas { margin-top: 36pt; }
  .assinaturas .bloco { margin-bottom: 28pt; }
  .assinaturas .linha { border-top: 1px solid #000; width: 8cm; margin-top: 28pt; }
  .quebra { page-break-before: always; }
`;

export function buildReportHtml(doc: ReportDoc, logoUrl?: string): string {
  const metaRows = doc.meta
    .filter(f => f.label.trim() || f.value.trim())
    .map(f => `<tr><td class="k">${esc(f.label)}</td><td>${esc(f.value)}</td></tr>`)
    .join('');

  const body = doc.sections.map(sec => {
    const tag = sec.level === 1 ? `<h2 class="s1">${esc(sec.title)}</h2>`
      : sec.level === 2 ? `<h3 class="s2">${esc(sec.title)}</h3>`
      : `<h4 class="s3">${esc(sec.title)}</h4>`;
    return tag + paragraphs(sec.content);
  }).join('');

  const anexos = doc.attachments.length
    ? `<div class="quebra"><h2 class="s1">ANEXOS</h2>` + doc.attachments.map((a, i) => {
        const letra = String.fromCharCode(65 + i);
        const cap = `ANEXO ${letra} — ${esc(a.caption || a.fileName)}`;
        const fonte = `Fonte: ${esc(a.source || 'Segurança Corporativa')} (${new Date().getFullYear()}).`;
        const corpo = a.kind === 'image'
          ? `<img src="${a.dataUrl}" alt="${cap}" />`
          : `<p class="body" style="text-indent:0">Arquivo anexo: ${esc(a.fileName)}</p>`;
        return `<div class="anexo"><div class="cap">${cap}</div>${corpo}<div class="fonte">${fonte}</div></div>`;
      }).join('') + `</div>`
    : '';

  const assinaturas = doc.signatures.length
    ? `<div class="assinaturas">` + doc.signatures.map(sg => `
        <div class="bloco">
          <div class="linha"></div>
          <p class="body" style="text-indent:0;margin:2pt 0">${esc(sg.label)}: ${esc(sg.name)}</p>
          <p class="body" style="text-indent:0;margin:0">${esc(sg.role)}</p>
          <p class="body" style="text-indent:0;margin:0">${esc(sg.org)}</p>
          <p class="body" style="text-indent:0;margin:0">Data: ${esc(sg.date)}</p>
        </div>`).join('') + `</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>${esc(doc.title)}</title><style>${ABNT_CSS}</style></head>
<body>
  <div class="sigilo">Sigilo: ${esc(doc.confidentiality)}</div>
  ${logoUrl ? `<div class="capa"><img src="${logoUrl}" alt="Pif Paf Alimentos" /></div>` : ''}
  <h1 class="doc-title">${esc(doc.title)}</h1>
  ${doc.subtitle ? `<p class="subtitle">${esc(doc.subtitle)}</p>` : ''}
  ${doc.headerLine ? `<p class="headerline">${esc(doc.headerLine)}</p>` : ''}
  ${metaRows ? `<table class="meta">${metaRows}</table>` : ''}
  ${body}
  ${anexos}
  ${assinaturas}
</body></html>`;
}

export function exportWord(doc: ReportDoc, logoUrl?: string) {
  const html = buildReportHtml(doc, logoUrl);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title.replace(/[^\w\-À-ÿ ]/g, '').trim() || 'relatorio'}.doc`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportPdf(doc: ReportDoc, logoUrl?: string) {
  const html = buildReportHtml(doc, logoUrl);
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
  return true;
}
