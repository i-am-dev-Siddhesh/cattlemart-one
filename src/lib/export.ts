import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatMoney } from '../units'

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(','))
    .join('\n')
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  downloadText(filename, toCsv(rows), 'text/csv;charset=utf-8')
}

export function downloadXls(filename: string, rows: (string | number)[][]) {
  const table = `<table>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${String(c)}</td>`).join('')}</tr>`)
    .join('')}</table>`
  downloadText(filename, `\uFEFF${table}`, 'application/vnd.ms-excel')
}

export function downloadPdf(title: string, rows: (string | number)[][]) {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(title, 14, 18)
  autoTable(doc, {
    startY: 24,
    head: [rows[0].map(String)],
    body: rows.slice(1).map((r) => r.map((c) => (typeof c === 'number' ? formatMoney(c).replace('₹', '') : String(c)))),
  })
  doc.save(`${title.replaceAll(' ', '-').toLowerCase()}.pdf`)
}
