// === NOVA FUNCIONALIDADE: HELPER DE EXPORTAÇÃO PARA EXCEL ===
// Centraliza a geração de .xlsx para todas as listas (Casos, Checklist,
// Risco, Análise, Logs). Aceita um array de objetos planos e o nome do
// arquivo. Retorna true em caso de sucesso, false se a lista estiver vazia.
import * as XLSX from 'xlsx';

export function exportRowsToExcel<T extends Record<string, any>>(
  rows: T[],
  fileBaseName: string,
  sheetName = 'Dados',
): boolean {
  if (!rows || rows.length === 0) return false;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${fileBaseName}_${stamp}.xlsx`);
  return true;
}
