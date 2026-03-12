import { CaseData, formatDate, formatDateTime, formatCurrency } from '@/lib/localDB';
import { X } from 'lucide-react';

function getSeverityClass(severity: string) {
  switch (severity) {
    case 'MUITO GRAVE': return 'text-destructive font-bold';
    case 'GRAVE': return 'text-orange-400 font-bold';
    case 'MODERADO': return 'text-warning font-bold';
    case 'SEM GRAVIDADE': return 'text-info font-bold';
    default: return 'font-bold';
  }
}

function getStatusBadge(status: string) {
  const base = 'text-xs font-bold px-2 py-0.5 rounded-full';
  switch (status) {
    case 'FINALIZADO': return `${base} bg-success text-success-foreground`;
    case 'EM ANDAMENTO': return `${base} bg-warning text-warning-foreground`;
    case 'EM PAUSA': return `${base} bg-muted text-muted-foreground`;
    default: return `${base} bg-secondary`;
  }
}

export default function CaseDetailsModal({ caseData, onClose }: { caseData: CaseData; onClose: () => void }) {
  const score = (caseData.case_g || 1) * (caseData.case_u || 1) * (caseData.case_t || 1);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-primary/30 p-6 rounded-lg max-w-4xl w-full relative shadow-2xl max-h-[90vh] overflow-y-auto synapse-scrollbar" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-card py-2 border-b border-border">
          <h2 className="text-2xl font-bold text-primary">Caso {caseData.displayId}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-secondary/30 p-4 rounded-lg">
              <h4 className="font-bold text-primary mb-2">📅 DATA E LOCAL</h4>
              <p><strong>Data:</strong> {formatDate(caseData.DATA)}</p>
              <p><strong>Local:</strong> {caseData.LOCAL || 'N/A'}</p>
              <p><strong>Unidade:</strong> {caseData.UNIDADE || 'N/A'}</p>
            </div>
            <div className="bg-secondary/30 p-4 rounded-lg">
              <h4 className="font-bold text-primary mb-2">📊 CLASSIFICAÇÃO</h4>
              <p><strong>Tipo:</strong> {caseData.TIPO_DE_OCORRÊNCIA || 'N/A'}</p>
              <p><strong>Operação:</strong> {caseData.TIPO_DE_OPERAÇÃO || 'N/A'}</p>
              <p><strong>Setor:</strong> {caseData.SETOR || 'N/A'}</p>
            </div>
            <div className="bg-secondary/30 p-4 rounded-lg">
              <h4 className="font-bold text-primary mb-2">✅ STATUS</h4>
              <p><strong>Status:</strong> <span className={getStatusBadge(caseData.STATUS)}>{caseData.STATUS}</span></p>
              <p><strong>Início:</strong> {formatDateTime(caseData.INICIO_TRATATIVAS)}</p>
              <p><strong>Encerramento:</strong> {formatDateTime(caseData.ENCERRAMENTO)}</p>
              <p><strong>Tempo:</strong> {caseData.TEMPO_DE_TRATATIVA || 'N/A'}</p>
            </div>
          </div>

          <div className="bg-secondary/30 p-4 rounded-lg">
            <h4 className="font-bold text-primary mb-2">📄 DESCRIÇÃO E ANÁLISE</h4>
            <p className="mb-2"><strong>Descrição:</strong><br />{caseData.DESCRIÇÃO_DA_OCORRÊNCIA || 'N/A'}</p>
            <div className="mb-2">
              <strong>Envolvidos:</strong>
              {Array.isArray(caseData.ENVOLVIDOS) && caseData.ENVOLVIDOS.length > 0 ? (
                <ul className="mt-1 space-y-2">
                  {caseData.ENVOLVIDOS.map((p, i) => (
                    <li key={i} className="border-l-2 border-primary pl-3">
                      <strong>{p.name || 'Nome não informado'}</strong>
                      <br />
                      <span className="text-sm text-muted-foreground">Medida: {p.measure || 'Nenhuma'}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-muted-foreground">Nenhum envolvido.</p>}
            </div>
            <p><strong>RCA:</strong><br />{caseData.RCA_DA_OCORRÊNCIA || 'N/A'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-secondary/30 p-4 rounded-lg">
              <h4 className="font-bold text-primary mb-2">⚠️ MATRIZ DE RISCO (GUT)</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-background/50 p-2 rounded"><p className="font-bold text-lg">{caseData.case_g || 1}</p><p className="text-xs text-muted-foreground">Gravidade</p></div>
                <div className="bg-background/50 p-2 rounded"><p className="font-bold text-lg">{caseData.case_u || 1}</p><p className="text-xs text-muted-foreground">Urgência</p></div>
                <div className="bg-background/50 p-2 rounded"><p className="font-bold text-lg">{caseData.case_t || 1}</p><p className="text-xs text-muted-foreground">Tendência</p></div>
              </div>
              <div className="mt-3 text-center bg-background/50 p-3 rounded">
                <p className="text-xs text-muted-foreground">NÍVEL DE GRAVIDADE</p>
                <p className={`text-xl font-bold ${getSeverityClass(caseData.GRAVIDADE)}`}>{caseData.GRAVIDADE}</p>
                <p className="text-xs text-muted-foreground">Pontuação: {score}</p>
              </div>
            </div>
            <div className="bg-secondary/30 p-4 rounded-lg">
              <h4 className="font-bold text-primary mb-2">💰 IMPACTO FINANCEIRO</h4>
              <div className="space-y-2">
                <p><strong>Perda Pontual:</strong> <span className="text-destructive">{formatCurrency(caseData.VALOR_PERDA)}</span></p>
                <p><strong>Valor Recuperado:</strong> <span className="text-success">{formatCurrency(caseData.VALOR_RECUPERADO)}</span></p>
                <p><strong>Perda Evitada (Anual):</strong> <span className="font-bold text-info">{formatCurrency(caseData.PERDA_EVITADA_ANUAL)}</span></p>
              </div>
            </div>
          </div>

          <div className="bg-secondary/30 p-4 rounded-lg">
            <h4 className="font-bold text-primary mb-2">⚖️ CONCLUSÃO E AÇÕES</h4>
            <p className="mb-2"><strong>Síntese:</strong><br />{caseData.SINTESE || 'N/A'}</p>
            <p><strong>Ação Tomada:</strong><br />{caseData.AÇÃO_TOMADA || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
