import * as XLSX from 'xlsx';

/**
 * Builds a real .xlsx workbook from a headers row + data rows and triggers a download.
 * Replaces the old hand-rolled CSV-as-text approach used across the app.
 */
export function exportToExcel(filename, headers, rows, sheetName = 'Sheet1') {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  const colWidths = headers.map((h, colIdx) => {
    const headerLen = String(h ?? '').length;
    const maxRowLen = rows.reduce((max, row) => {
      const cell = row[colIdx];
      return Math.max(max, cell == null ? 0 : String(cell).length);
    }, 0);
    return { wch: Math.min(60, Math.max(headerLen, maxRowLen) + 2) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, finalName);
}

/**
 * Same as exportToExcel but writes multiple named sheets into one workbook.
 * sheets: [{ name, headers, rows }]
 */
export function exportMultiSheetToExcel(filename, sheets) {
  const workbook = XLSX.utils.book_new();

  for (const { name, headers, rows } of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const colWidths = headers.map((h, colIdx) => {
      const headerLen = String(h ?? '').length;
      const maxRowLen = rows.reduce((max, row) => {
        const cell = row[colIdx];
        return Math.max(max, cell == null ? 0 : String(cell).length);
      }, 0);
      return { wch: Math.min(60, Math.max(headerLen, maxRowLen) + 2) };
    });
    worksheet['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31));
  }

  const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, finalName);
}
