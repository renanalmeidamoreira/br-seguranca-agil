import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, formatDate, formatDateTime, generateSequentialDisplayId, CaseData } from '@/lib/localDB';
import CaseForm from '@/components/cases/CaseForm';
import CaseDetailsModal from '@/components/cases/CaseDetailsModal';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-dialog';
import { Plus, FileSpreadsheet, Eye, Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';

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

export default function CasesPage() {
  const { cases, deleteCase, showAlert, pendingItem, clearPendingItem } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseData | null>(null);
  const [viewingCase, setViewingCase] = useState<CaseData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [sortColumn, setSortColumn] = useState('displayId');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  // === NOVA FUNCIONALIDADE: Confirmação de exclusão ===
  const [deleteTarget, setDeleteTarget] = useState<CaseData | null>(null);
  const itemsPerPage = 15;

  // === NOVA FUNCIONALIDADE: Abrir caso vindo da Busca Integrada ===
  useEffect(() => {
    if (pendingItem && pendingItem.module === 'casos') {
      const found = cases.find(c => c.displayId === pendingItem.id || c.id === pendingItem.id);
      if (found) setViewingCase(found);
      clearPendingItem();
    }
  }, [pendingItem, cases, clearPendingItem]);

  const filtered = useMemo(() => {
    let result = cases.filter(item => {
      const matchesSearch = !searchTerm || Object.values(item).some(val =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesSeverity = filterSeverity === 'Todos' || item.GRAVIDADE === filterSeverity;
      const matchesStatus = filterStatus === 'Todos' || item.STATUS === filterStatus;
      return matchesSearch && matchesSeverity && matchesStatus;
    });

    result.sort((a: any, b: any) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];
      if (sortColumn === 'DATA') {
        valA = new Date(valA); valB = new Date(valB);
      } else if (sortColumn === 'PERDA_EVITADA_ANUAL') {
        valA = parseFloat(valA) || 0; valB = parseFloat(valB) || 0;
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [cases, searchTerm, filterSeverity, filterStatus, sortColumn, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDir('asc');
    }
  };

  const handleDelete = (caseItem: CaseData) => {
    // === NOVA FUNCIONALIDADE: Modal de confirmação ao invés de window.confirm ===
    setDeleteTarget(caseItem);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteCase(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const exportToExcel = () => {
    if (filtered.length === 0) { showAlert('Nenhum caso para exportar.', 'info'); return; }
    const data = filtered.map(c => ({
      'ID': c.displayId, 'Data': formatDate(c.DATA), 'Local': c.LOCAL,
      'Unidade': c.UNIDADE, 'Gravidade': c.GRAVIDADE, 'Tipo': c.TIPO_DE_OCORRÊNCIA,
      'Status': c.STATUS, 'Perda': c.VALOR_PERDA, 'Recuperado': c.VALOR_RECUPERADO,
      'Perda Evitada Anual': c.PERDA_EVITADA_ANUAL, 'Ação': c.AÇÃO_TOMADA,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Casos');
    XLSX.writeFile(wb, `synapse_casos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showAlert('Dados exportados para Excel.', 'success');
  };

  const handleEdit = (caseItem: CaseData) => {
    setEditingCase(caseItem);
    setShowForm(true);
  };

  const handleNewCase = () => {
    setEditingCase(null);
    setShowForm(true);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-4">Gestão de Casos</h1>

      {/* Toolbar */}
      <div className="bg-card p-4 rounded-lg mb-6 flex items-center justify-between flex-wrap gap-4 border border-border">
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={handleNewCase} className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-lg flex items-center hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> Novo Caso
          </button>
          <button onClick={exportToExcel} className="bg-success text-success-foreground font-bold py-2 px-4 rounded-lg flex items-center hover:opacity-90">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Excel
          </button>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar..."
            className="bg-secondary border border-border rounded-lg px-3 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={filterSeverity}
            onChange={e => { setFilterSeverity(e.target.value); setCurrentPage(1); }}
            className="bg-secondary border border-border rounded-lg px-3 py-2"
          >
            <option value="Todos">Gravidade: Todos</option>
            <option>MUITO GRAVE</option>
            <option>GRAVE</option>
            <option>MODERADO</option>
            <option>SEM GRAVIDADE</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="bg-secondary border border-border rounded-lg px-3 py-2"
          >
            <option value="Todos">Status: Todos</option>
            <option>EM ANDAMENTO</option>
            <option>FINALIZADO</option>
            <option>EM PAUSA</option>
          </select>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <CaseForm
          editingCase={editingCase}
          onClose={() => { setShowForm(false); setEditingCase(null); }}
        />
      )}

      {/* Table */}
      <div className="bg-card rounded-lg overflow-x-auto border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              {[
                { key: 'displayId', label: 'ID' },
                { key: 'DATA', label: 'Data' },
                { key: 'GRAVIDADE', label: 'Gravidade' },
                { key: 'TIPO_DE_OCORRÊNCIA', label: 'Tipo' },
                { key: 'UNIDADE', label: 'Unidade' },
                { key: 'SETOR', label: 'Setor' },
                { key: 'PERDA_EVITADA_ANUAL', label: 'Perda Evitada' },
                { key: 'AÇÃO_TOMADA', label: 'Ação' },
                { key: 'STATUS', label: 'Status' },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="text-left py-3 px-4 uppercase font-semibold text-xs cursor-pointer select-none hover:text-primary"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
              ))}
              <th className="text-left py-3 px-4 uppercase font-semibold text-xs">Ações</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {paginated.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-8">Nenhum caso encontrado.</td></tr>
            ) : paginated.map(item => (
              <tr key={item.id} className="border-b border-border hover:bg-secondary/30">
                <td className="py-2 px-4">{item.displayId || 'N/A'}</td>
                <td className="py-2 px-4">{formatDate(item.DATA)}</td>
                <td className="py-2 px-4"><span className={getSeverityClass(item.GRAVIDADE)}>{item.GRAVIDADE}</span></td>
                <td className="py-2 px-4 max-w-[200px] truncate">{item.TIPO_DE_OCORRÊNCIA}</td>
                <td className="py-2 px-4">{item.UNIDADE || 'N/A'}</td>
                <td className="py-2 px-4">{item.SETOR || 'N/A'}</td>
                <td className="py-2 px-4 text-info">{formatCurrency(item.PERDA_EVITADA_ANUAL)}</td>
                <td className="py-2 px-4 max-w-[200px] truncate">{item.AÇÃO_TOMADA}</td>
                <td className="py-2 px-4"><span className={getStatusBadge(item.STATUS)}>{item.STATUS}</span></td>
                <td className="py-2 px-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setViewingCase(item)} className="text-info hover:opacity-80" title="Ver">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(item)} className="text-warning hover:opacity-80" title="Editar">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item)} className="text-destructive hover:opacity-80" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="px-4 py-2 bg-secondary rounded disabled:opacity-50"
          >Anterior</button>
          <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages} ({filtered.length} registros)</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="px-4 py-2 bg-secondary rounded disabled:opacity-50"
          >Próxima</button>
        </div>
      )}

      {/* Detail Modal */}
      {viewingCase && (
        <CaseDetailsModal caseData={viewingCase} onClose={() => setViewingCase(null)} />
      )}

      {/* === NOVA FUNCIONALIDADE: Confirmação de exclusão === */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        itemLabel={deleteTarget ? `o caso ${deleteTarget.displayId}` : 'este caso'}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
