import { Response } from 'express'

export function toCsv(headers: string[], rows: Record<string, unknown>[], keys: string[]): string {
  const escapeField = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const lines = [headers.map(escapeField).join(',')]
  for (const row of rows) {
    lines.push(keys.map(k => escapeField(row[k])).join(','))
  }
  return lines.join('\n')
}

export function sendCsv(res: Response, filename: string, csvContent: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csvContent)
}
