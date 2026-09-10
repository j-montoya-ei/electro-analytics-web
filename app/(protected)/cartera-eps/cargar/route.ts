// ═══════════════════════════════════════════════════════════
// POST /api/cartera-eps/cargar
// Recibe el libro RECAUDO (.xls/.xlsx), hoja 'RECAUDO', y lee la
// SECCIÓN 2 (cartera por EPS): bloques repetidos con cabecera
// 'MES: <mes> <año>' seguidos de una tabla
// NIT | ENTIDAD | SALDO ANTERIOR | ABONO | NUEVO SALDO.
//
// Emite una fila por cada EPS de cada bloque. Las filas 'Suma' y
// las vacías se omiten. La cabecera de bloque fija el mes de corte.
//
// El RPC aplica las reglas de negocio: válida = mes_corte y nit no
// nulos; deduplica por (mes_corte, nit) — así los bloques duplicados
// del libro colapsan; upsert last-write-wins.
//
// Ubicación: app/api/cartera-eps/cargar/route.ts
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from '@e965/xlsx'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MESES_LARGO: Record<string, string> = {
  ENERO: '01', FEBRERO: '02', MARZO: '03', ABRIL: '04', MAYO: '05', JUNIO: '06',
  JULIO: '07', AGOSTO: '08', SEPTIEMBRE: '09', OCTUBRE: '10', NOVIEMBRE: '11', DICIEMBRE: '12',
}

// 'MES: ABRIL 2024' → '2024-04-01'. Otra cosa → null (así se distingue una
// cabecera de bloque de una fila de datos).
const fmtCorte = (v: unknown): string | null => {
  if (v == null) return null
  const s = String(v).trim().toUpperCase()
  const m = s.match(/^MES:\s*([A-ZÁÉÍÓÚÑ]+)\s+(\d{4})$/)
  if (!m) return null
  const mm = MESES_LARGO[m[1]]
  return mm ? `${m[2]}-${mm}-01` : null
}

const norm = (v: unknown) => (v == null ? '' : String(v).trim().toUpperCase())

const num = (v: unknown): string | null => {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null
  const s = String(v).trim()
  if (!s) return null
  return /^-?\d+(\.\d+)?$/.test(s) ? s : null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  let file: File | null = null
  try {
    const form = await request.formData()
    const f = form.get('file')
    if (f instanceof File) file = f
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })
  }
  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }
  const nombreArchivo = file.name.toLowerCase()
  if (!nombreArchivo.endsWith('.xls') && !nombreArchivo.endsWith('.xlsx')) {
    return NextResponse.json({ error: 'El archivo debe ser .xls o .xlsx' }, { status: 400 })
  }

  let filas: Array<Record<string, string | null>>
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buf, { cellDates: true })

    const nombreHoja =
      wb.SheetNames.find((n) => n.trim().toLowerCase() === 'recaudo') ??
      wb.SheetNames[0]
    const ws = nombreHoja ? wb.Sheets[nombreHoja] : undefined
    if (!ws) {
      return NextResponse.json({ error: 'El archivo no tiene hojas' }, { status: 400 })
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      defval: null,
    })

    let mesCorte: string | null = null
    let idx: { nit: number; entidad: number; saldo: number; abono: number; nuevo: number } | null = null

    filas = []
    for (const r of rows) {
      if (!Array.isArray(r)) continue

      // ¿Cabecera de bloque 'MES: ...'? (fija el corte, resetea columnas)
      const corte = r.map(fmtCorte).find((x) => x != null) ?? null
      if (corte) {
        mesCorte = corte
        idx = null
        continue
      }

      const cells = r.map(norm)

      // ¿Fila de encabezado de columnas?
      if (cells.includes('NIT') && cells.includes('ABONO')) {
        idx = {
          nit: cells.indexOf('NIT'),
          entidad: cells.indexOf('ENTIDAD'),
          saldo: cells.indexOf('SALDO ANTERIOR'),
          abono: cells.indexOf('ABONO'),
          nuevo: cells.indexOf('NUEVO SALDO'),
        }
        continue
      }

      if (!mesCorte || !idx) continue

      const nitRaw = r[idx.nit]
      const nit = nitRaw == null ? '' : String(nitRaw).trim()
      if (!nit || nit.toUpperCase() === 'SUMA') continue // total del bloque o vacío

      filas.push({
        mes_corte: mesCorte,
        nit,
        entidad: idx.entidad >= 0 && r[idx.entidad] != null ? String(r[idx.entidad]).trim() : null,
        saldo_anterior: idx.saldo >= 0 ? num(r[idx.saldo]) : null,
        abono: idx.abono >= 0 ? num(r[idx.abono]) : null,
        nuevo_saldo: idx.nuevo >= 0 ? num(r[idx.nuevo]) : null,
      })
    }
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo Excel' }, { status: 400 })
  }

  if (filas.length === 0) {
    return NextResponse.json(
      { error: 'No se encontraron bloques de cartera por EPS en el archivo' },
      { status: 400 },
    )
  }

  const { data, error } = await supabase.rpc('fn_cargar_cartera_eps', {
    p_filas: filas,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, resumen: data })
}
