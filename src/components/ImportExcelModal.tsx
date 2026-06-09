'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { ExpenseCategory } from '@/lib/types'
import { X, Upload, FileSpreadsheet, Check, AlertCircle, ChevronDown } from 'lucide-react'

interface ParsedRow {
  date: string
  amount: number
  type: 'income' | 'expense'
  description: string
  categoryId: string | null
  valid: boolean
  error?: string
}

interface Member {
  profile_id: string
  name: string
}

interface Props {
  householdId: string
  profileId: string
  members: Member[]
  categories: ExpenseCategory[]
  onClose: () => void
  onImported: () => void
}

// Common column name patterns for auto-detection
const DATE_KEYS    = ['fecha','date','día','dia','day','f.','fec']
const AMOUNT_KEYS  = ['monto','importe','amount','valor','total','precio','$','pesos','ars']
const DESC_KEYS    = ['descripcion','descripción','description','detalle','concepto','nombre','glosa','movimiento']
const TYPE_KEYS    = ['tipo','type','categoria','categoría','category']

function findColumn(headers: string[], patterns: string[]): string | null {
  const lower = headers.map(h => h.toLowerCase().trim())
  for (const p of patterns) {
    const idx = lower.findIndex(h => h.includes(p))
    if (idx >= 0) return headers[idx]
  }
  return null
}

function parseDate(val: unknown): string | null {
  if (!val) return null
  // Excel serial date number
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val)
    if (date) return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`
  }
  const s = String(val).trim()
  // Try common formats: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
  const fmts = [
    /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/, // DD/MM/YYYY
    /^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/, // YYYY-MM-DD
  ]
  for (const re of fmts) {
    const m = s.match(re)
    if (m) {
      if (m[1].length === 4) return `${m[1]}-${m[2]}-${m[3]}`
      return `${m[3]}-${m[2]}-${m[1]}`
    }
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}

function parseAmount(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = parseFloat(String(val).replace(/[$,\s]/g,'').replace(',','.'))
  return isNaN(n) ? null : n
}

export default function ImportExcelModal({ householdId, profileId, members, categories, onClose, onImported }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep]         = useState<'upload'|'map'|'preview'>('upload')
  const [headers, setHeaders]   = useState<string[]>([])
  const [rawRows, setRawRows]   = useState<Record<string,unknown>[]>([])
  const [fileName, setFileName] = useState('')

  // Column mapping
  const [colDate,   setColDate]   = useState('')
  const [colAmount, setColAmount] = useState('')
  const [colDesc,   setColDesc]   = useState('')
  const [colType,   setColType]   = useState('')
  const [defaultType, setDefaultType] = useState<'auto'|'income'|'expense'>('auto')

  const [parsed,       setParsed]       = useState<ParsedRow[]>([])
  const [importing,    setImporting]    = useState(false)
  const [importDone,   setImportDone]   = useState(false)
  // Visibility: 'shared'=todos, 'private'=solo yo, or a specific profile_id
  const [importVisib,  setImportVisib]  = useState<'shared'|'private'|string>('shared')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array', cellDates: false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      if (rows.length === 0) return
      const hdrs = Object.keys(rows[0])
      setHeaders(hdrs)
      setRawRows(rows.slice(0, 500)) // max 500 rows

      // Auto-detect columns
      setColDate(findColumn(hdrs, DATE_KEYS) ?? '')
      setColAmount(findColumn(hdrs, AMOUNT_KEYS) ?? '')
      setColDesc(findColumn(hdrs, DESC_KEYS) ?? '')
      setColType(findColumn(hdrs, TYPE_KEYS) ?? '')
      setStep('map')
    }
    reader.readAsArrayBuffer(file)
  }

  function buildPreview() {
    if (!colDate || !colAmount) return

    const matchCategory = (val: string | undefined): string | null => {
      if (!val) return null
      const v = val.toLowerCase().trim()
      return categories.find(c => c.name.toLowerCase().includes(v) || v.includes(c.name.toLowerCase()))?.id ?? null
    }

    const rows: ParsedRow[] = rawRows.map(row => {
      const rawDate   = row[colDate]
      const rawAmount = row[colAmount]
      const rawDesc   = colDesc ? String(row[colDesc] ?? '') : ''
      const rawType   = colType ? String(row[colType] ?? '') : ''

      const date   = parseDate(rawDate)
      const amount = parseAmount(rawAmount)

      if (!date) return { date: '', amount: 0, type: 'expense' as const, description: rawDesc, categoryId: null, valid: false, error: `Fecha inválida: "${rawDate}"` }
      if (amount === null) return { date, amount: 0, type: 'expense' as const, description: rawDesc, categoryId: null, valid: false, error: `Monto inválido: "${rawAmount}"` }

      let type: 'income' | 'expense'
      if (defaultType === 'auto') {
        // Auto: negative = expense, positive = income
        // or check type column
        if (colType && rawType) {
          const tl = rawType.toLowerCase()
          type = tl.includes('ingreso')||tl.includes('income')||tl.includes('entrada')||tl.includes('haber') ? 'income' : 'expense'
        } else {
          type = amount < 0 ? 'expense' : 'income'
        }
      } else {
        type = defaultType
      }

      return {
        date,
        amount: Math.abs(amount),
        type,
        description: rawDesc.trim(),
        categoryId: matchCategory(rawType || rawDesc),
        valid: true,
      }
    }).filter(r => r.valid || r.error)

    setParsed(rows)
    setStep('preview')
  }

  async function doImport() {
    const valid = parsed.filter(r => r.valid)
    if (!valid.length) return
    setImporting(true)
    const inserts = valid.map(r => ({
      household_id: householdId,
      profile_id: profileId,
      category_id: r.categoryId,
      amount: r.amount,
      type: r.type,
      description: r.description || null,
      date: r.date,
      visibility: importVisib === 'shared' || importVisib === 'private' ? importVisib : 'shared',
    }))
    // Batch inserts (50 at a time)
    for (let i = 0; i < inserts.length; i += 50) {
      await supabase.from('transactions').insert(inserts.slice(i, i + 50))
    }
    setImporting(false)
    setImportDone(true)
    setTimeout(() => { onImported(); onClose() }, 1500)
  }

  const validCount   = parsed.filter(r => r.valid).length
  const invalidCount = parsed.filter(r => !r.valid).length

  return (
    <>
      <div className="ht-overlay" onClick={onClose} />
      <div className="ht-modal">
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ width: 36, height: 4, background: 'rgba(124,58,237,0.2)', borderRadius: 9999, margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileSpreadsheet size={18} color="var(--ht-mint)" />
              <h2 style={{ fontSize: 17, fontWeight: 800 }}>Importar Excel / CSV</h2>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ht-text-3)', padding: 4 }}>
              <X size={20} />
            </button>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
            {(['upload','map','preview'] as const).map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 9999,
                  background: step === s ? 'var(--ht-purple)' : parsed.length > 0 && i < ['upload','map','preview'].indexOf(step) ? 'var(--ht-mint)' : 'rgba(124,58,237,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  color: step === s || (parsed.length > 0 && i < ['upload','map','preview'].indexOf(step)) ? 'white' : 'var(--ht-text-4)',
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: step === s ? 'var(--ht-purple)' : 'var(--ht-text-4)' }}>
                  {s === 'upload' ? 'Archivo' : s === 'map' ? 'Columnas' : 'Previsualizar'}
                </span>
                {i < 2 && <div style={{ width: 20, height: 1, background: 'var(--ht-glass-border)' }} />}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 16px 32px', maxHeight: '65vh', overflowY: 'auto' }}>

          {/* ── STEP 1: UPLOAD ── */}
          {step === 'upload' && (
            <>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: '100%', padding: '32px 20px',
                  border: '2px dashed rgba(124,58,237,0.3)',
                  borderRadius: 20, background: 'rgba(124,58,237,0.04)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 12,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 9999, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={24} color="var(--ht-purple)" strokeWidth={2} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--ht-text)', marginBottom: 4 }}>Seleccionar archivo</p>
                  <p style={{ fontSize: 13, color: 'var(--ht-text-3)' }}>Excel (.xlsx, .xls) o CSV</p>
                </div>
              </button>

              <div style={{ marginTop: 20, padding: 14, background: 'rgba(124,58,237,0.05)', borderRadius: 14, border: '1px solid rgba(124,58,237,0.1)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-purple)', marginBottom: 8 }}>Formato recomendado</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: 8 }}>
                  {['Fecha','Monto','Descripción','Tipo'].map(h => (
                    <div key={h} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--ht-purple)', padding: '4px 2px', background: 'rgba(124,58,237,0.1)', borderRadius: 6 }}>{h}</div>
                  ))}
                  {['01/06/2026','1500','Supermercado','Gasto'].map(v => (
                    <div key={v} style={{ textAlign: 'center', fontSize: 10, color: 'var(--ht-text-3)', padding: '4px 2px' }}>{v}</div>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'var(--ht-text-4)', marginTop: 8 }}>Las columnas se detectan automáticamente. Montos negativos = gastos, positivos = ingresos.</p>
              </div>
            </>
          )}

          {/* ── STEP 2: MAP COLUMNS ── */}
          {step === 'map' && (
            <>
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={16} color="var(--ht-mint)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ht-mint)' }}>{fileName} — {rawRows.length} filas</span>
              </div>

              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Mapeá las columnas</p>

              {[
                { label: 'Fecha *', val: colDate, set: setColDate, required: true },
                { label: 'Monto *', val: colAmount, set: setColAmount, required: true },
                { label: 'Descripción', val: colDesc, set: setColDesc, required: false },
                { label: 'Tipo / Categoría', val: colType, set: setColType, required: false },
              ].map(({ label, val, set, required }) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-text-2)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={val}
                      onChange={e => set(e.target.value)}
                      style={{ width: '100%', padding: '10px 36px 10px 14px', border: `1.5px solid ${val ? 'var(--ht-purple)' : required ? 'rgba(244,63,94,0.3)' : 'var(--ht-glass-border)'}`, borderRadius: 9999, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.8)', color: val ? 'var(--ht-text)' : 'var(--ht-text-4)', outline: 'none', appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="">— No usar</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <ChevronDown size={14} color="var(--ht-text-3)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>
              ))}

              {/* Default type */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-text-2)', display: 'block', marginBottom: 8 }}>Si no hay columna de tipo, ¿qué aplicar?</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                  {([['auto','Auto (±)'],['expense','Gastos'],['income','Ingresos']] as const).map(([v, label]) => (
                    <button key={v} onClick={() => setDefaultType(v)} style={{ padding: '8px', borderRadius: 9999, border: '1.5px solid', borderColor: defaultType===v ? 'var(--ht-purple)' : 'var(--ht-glass-border)', background: defaultType===v ? 'var(--ht-purple-light)' : 'var(--ht-glass-warm)', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: defaultType===v ? 'var(--ht-purple)' : 'var(--ht-text-3)' }}>
                      {label}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'var(--ht-text-4)', marginTop: 6 }}>Auto: monto negativo = gasto, positivo = ingreso</p>
              </div>

              <button
                onClick={buildPreview}
                disabled={!colDate || !colAmount}
                className="ht-btn ht-btn-primary"
                style={{ width: '100%' }}
              >
                Previsualizar {rawRows.length} filas →
              </button>
            </>
          )}

          {/* ── STEP 3: PREVIEW ── */}
          {step === 'preview' && (
            <>
              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '12px 14px' }}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>{validCount}</p>
                  <p style={{ fontSize: 12, color: 'var(--ht-text-3)', fontWeight: 600 }}>Listas para importar</p>
                </div>
                {invalidCount > 0 && (
                  <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 14, padding: '12px 14px' }}>
                    <p style={{ fontSize: 22, fontWeight: 900, color: '#f43f5e' }}>{invalidCount}</p>
                    <p style={{ fontSize: 12, color: 'var(--ht-text-3)', fontWeight: 600 }}>Con errores (se omiten)</p>
                  </div>
                )}
              </div>

              {/* Preview rows */}
              <div style={{ marginBottom: 20 }}>
                {parsed.slice(0, 10).map((row, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12,
                    background: row.valid ? 'var(--ht-glass-warm)' : 'rgba(244,63,94,0.05)',
                    border: `1px solid ${row.valid ? 'var(--ht-glass-border)' : 'rgba(244,63,94,0.2)'}`,
                    marginBottom: 6, opacity: row.valid ? 1 : 0.7,
                  }}>
                    {row.valid
                      ? <Check size={14} color="var(--ht-mint)" />
                      : <AlertCircle size={14} color="var(--ht-rose)" />
                    }
                    <div style={{ flex: 1 }}>
                      {row.valid ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-text-3)' }}>{row.date}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: row.type==='income'?'#10b981':'#f43f5e' }}>
                            {row.type==='income'?'+':'-'}${row.amount.toFixed(0)}
                          </span>
                          {row.description && <span style={{ fontSize: 12, color: 'var(--ht-text-3)' }}>{row.description.slice(0,30)}{row.description.length>30?'…':''}</span>}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--ht-rose)' }}>{row.error}</span>
                      )}
                    </div>
                  </div>
                ))}
                {parsed.length > 10 && (
                  <p style={{ fontSize: 12, color: 'var(--ht-text-4)', textAlign: 'center', padding: '8px 0' }}>
                    + {parsed.length - 10} filas más
                  </p>
                )}
              </div>

              {/* Visibility selector */}
              {!importDone && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ht-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>¿Quiénes pueden ver estos movimientos?</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button onClick={() => setImportVisib('shared')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, border: '1.5px solid', borderColor: importVisib === 'shared' ? 'var(--ht-mint)' : 'var(--ht-glass-border)', background: importVisib === 'shared' ? 'rgba(16,185,129,0.08)' : 'var(--ht-glass-warm)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9999, background: importVisib === 'shared' ? 'var(--ht-mint)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>👥</div>
                      <div><p style={{ fontSize: 13, fontWeight: 700, color: importVisib === 'shared' ? 'var(--ht-mint)' : 'var(--ht-text)' }}>Todos del hogar</p><p style={{ fontSize: 11, color: 'var(--ht-text-3)' }}>Todos los integrantes los ven</p></div>
                    </button>
                    <button onClick={() => setImportVisib('private')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, border: '1.5px solid', borderColor: importVisib === 'private' ? 'var(--ht-purple)' : 'var(--ht-glass-border)', background: importVisib === 'private' ? 'rgba(124,58,237,0.08)' : 'var(--ht-glass-warm)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9999, background: importVisib === 'private' ? 'var(--ht-purple)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>🔒</div>
                      <div><p style={{ fontSize: 13, fontWeight: 700, color: importVisib === 'private' ? 'var(--ht-purple)' : 'var(--ht-text)' }}>Solo yo</p><p style={{ fontSize: 11, color: 'var(--ht-text-3)' }}>Solo vos los podés ver</p></div>
                    </button>
                    {members.filter(m => m.profile_id !== profileId).map(m => (
                      <button key={m.profile_id} onClick={() => setImportVisib(m.profile_id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, border: '1.5px solid', borderColor: importVisib === m.profile_id ? 'var(--ht-rose)' : 'var(--ht-glass-border)', background: importVisib === m.profile_id ? 'rgba(244,63,94,0.08)' : 'var(--ht-glass-warm)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9999, background: importVisib === m.profile_id ? 'var(--ht-rose)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 800, color: importVisib === m.profile_id ? 'white' : 'var(--ht-text-3)' }}>
                          {m.name[0].toUpperCase()}
                        </div>
                        <div><p style={{ fontSize: 13, fontWeight: 700, color: importVisib === m.profile_id ? 'var(--ht-rose)' : 'var(--ht-text)' }}>Yo + {m.name.split(' ')[0]}</p><p style={{ fontSize: 11, color: 'var(--ht-text-3)' }}>Vos y {m.name.split(' ')[0]} los pueden ver</p></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {importDone ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <Check size={32} color="var(--ht-mint)" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--ht-mint)' }}>¡Importado!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setStep('map')} className="ht-btn ht-btn-ghost" style={{ flex: 1 }}>← Volver</button>
                  <button onClick={doImport} disabled={importing || validCount === 0} className="ht-btn ht-btn-primary" style={{ flex: 2 }}>
                    {importing ? <><div className="ht-spinner" /> Importando...</> : <><FileSpreadsheet size={15} /> Importar {validCount} movimientos</>}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
