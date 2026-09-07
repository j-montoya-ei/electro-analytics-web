// ═══════════════════════════════════════════════════════════
// POST /api/marcas-fallidas/cargar
// Recibe el reporte "Intentos de Marcaje" (.xls o .xlsx) de Buk,
// extrae las filas y las carga vía RPC fn_cargar_marcas_fallidas.
//
// El RPC aplica las reglas de negocio (no este handler):
//   - normaliza el RUT (quita puntos/espacios, conserva letras)
//   - deduplica por (rut, fecha, hora, sentido)
//
// Ubicación: app/api/marcas-fallidas/cargar/route.ts
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from '@e965/xlsx'
import { createClient } from '@/lib/supabase/server'

// El parseo de Excel usa Buffer → requiere runtime Node, no Edge.
export const runtime = 'nodejs'

// Encabezados exactos del reporte. Se localizan por nombre (no por
// posición) para no romperse si Buk reordena columnas.
const LABELS = {
  id_dispositivo: 'ID Dispositivo',
  nombre: 'Nombre',
  rut: 'RUT',
  error: 'Error al marcar',
  sentido: 'Sentido',
  fecha: 'Fecha intento',
  hora: 'Hora intento',
} as const

// Columnas sin las cuales una fila no puede procesarse.
const CRITICAS: Array<keyof typeof LABELS> = ['rut', 'error', 'sentido', 'fecha', 'hora']

// Fecha: el reporte la entrega como texto 'DD-MM-YYYY'. Se reordena a
// 'YYYY-MM-DD'. Si viniera como Date (export .xlsx), se usa la parte UTC.
const fmtFecha = (v: unknown): string | null => {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  const s = String(v).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s // ya viene YYYY-MM-DD
  const m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/) // DD-MM-YYYY o DD/MM/YYYY
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return s // fallback: el RPC intentará castear
}

// Hora: texto 'HH:MM:SS'. Si viniera como Date, se formatea desde UTC.
const fmtHora = (v: unknown): string | null => {
  if (v == null) return null
  if (v instanceof Date) {
    const hh = String(v.getUTCHours()).padStart(2, '0')
    const mm = String(v.getUTCMinutes()).padStart(2, '0')
    const ss = String(v.getUTCSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  return String(v).trim() || null
}

const txt = (v: unknown): string | null =>
  v == null ? null : String(v).trim() || null

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 1) Autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // 2) Recibir archivo (.xls o .xlsx)
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

  // 3) Parsear y extraer filas
  let filas: Array<Record<string, string | null>>
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buf, { cellDates: true }) // detecta .xls y .xlsx solo
    const ws = wb.Sheets[wb.SheetNames[0]]
    if (!ws) {
      return NextResponse.json({ error: 'El archivo no tiene hojas' }, { status: 400 })
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      defval: null,
    })

    // Localizar la fila de encabezados por la etiqueta del RUT
    const hIdx = rows.findIndex(
      (r) => Array.isArray(r) && r.includes(LABELS.rut),
    )
    if (hIdx === -1) {
      return NextResponse.json(
        { error: 'No se encontró la fila de encabezados del reporte de marcas fallidas' },
        { status: 400 },
      )
    }
    const header = rows[hIdx] as unknown[]

    const idx = Object.fromEntries(
      Object.entries(LABELS).map(([k, label]) => [k, header.indexOf(label)]),
    ) as Record<keyof typeof LABELS, number>

    const faltantes = CRITICAS.filter((k) => idx[k] === -1)
    if (faltantes.length) {
      return NextResponse.json(
        { error: `Faltan columnas en el reporte: ${faltantes.map((k) => LABELS[k]).join(', ')}` },
        { status: 400 },
      )
    }

    filas = []
    for (const r of rows.slice(hIdx + 1)) {
      if (!Array.isArray(r)) continue
      const rut = r[idx.rut] == null ? null : String(r[idx.rut]).trim()
      if (!rut) continue // fila vacía o pie del reporte
      filas.push({
        id_dispositivo: idx.id_dispositivo === -1 ? null : txt(r[idx.id_dispositivo]),
        nombre: idx.nombre === -1 ? null : txt(r[idx.nombre]),
        rut,
        error: txt(r[idx.error]),
        sentido: txt(r[idx.sentido]),
        fecha: fmtFecha(r[idx.fecha]),
        hora: fmtHora(r[idx.hora]),
      })
    }
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo Excel' }, { status: 400 })
  }

  if (filas.length === 0) {
    return NextResponse.json(
      { error: 'El reporte no contiene filas de datos' },
      { status: 400 },
    )
  }

  // 4) Cargar vía RPC
  const { data, error } = await supabase.rpc('fn_cargar_marcas_fallidas', {
    p_filas: filas,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, resumen: data })
}
