// ═══════════════════════════════════════════════════════════
// POST /api/permisos/cargar
// Recibe el reporte de Novedades (.xlsx) exportado de Buk,
// extrae las filas y las carga vía RPC fn_cargar_permisos.
//
// El RPC aplica las reglas de negocio (no este handler):
//   - fuerza estado = 'Aprobado'
//   - descarta filas sin hora (novedades por día)
//   - limpia el documento (quita puntos de miles)
//   - deduplica por (dni, fecha, hora_inicio, hora_fin)
//
// Ubicación: app/api/permisos/cargar/route.ts
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from '@e965/xlsx'
import { createClient } from '@/lib/supabase/server'

// El parseo de Excel usa Buffer → requiere runtime Node, no Edge.
export const runtime = 'nodejs'

// Encabezados exactos del reporte de Novedades. Se localizan por
// nombre (no por posición) para no romperse si Buk reordena columnas.
const LABELS = {
  dni: 'Colaborador - Número de Documento',
  hora_inicio: 'Novedades - Hora de Inicio',
  hora_fin: 'Novedades - Hora de Término',
  fecha: 'Novedades - Fecha Inicio Aplicación',
} as const

// Las fechas llegan como Date en UTC medianoche → 'YYYY-MM-DD' sin corrimiento.
const fmtFecha = (v: unknown): string | null =>
  v == null
    ? null
    : v instanceof Date
      ? v.toISOString().slice(0, 10)
      : String(v).trim() || null

// Las horas llegan como texto 'HH:MM'. Si vinieran como Date (valor de hora
// de Excel), se formatean igual desde las partes UTC.
const fmtHora = (v: unknown): string | null => {
  if (v == null) return null
  if (v instanceof Date) {
    const hh = String(v.getUTCHours()).padStart(2, '0')
    const mm = String(v.getUTCMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }
  return String(v).trim() || null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 1) Autenticación (el RPC exige rol authenticated; verificamos aquí también)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // 2) Recibir archivo
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
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return NextResponse.json({ error: 'El archivo debe ser .xlsx' }, { status: 400 })
  }

  // 3) Parsear y extraer filas
  let filas: Array<Record<string, string | null>>
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buf, { cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    if (!ws) {
      return NextResponse.json({ error: 'El archivo no tiene hojas' }, { status: 400 })
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      defval: null,
    })

    // Localizar la fila de encabezados por la etiqueta del documento
    const hIdx = rows.findIndex(
      (r) => Array.isArray(r) && r.includes(LABELS.dni),
    )
    if (hIdx === -1) {
      return NextResponse.json(
        { error: 'No se encontró la fila de encabezados del reporte de Novedades' },
        { status: 400 },
      )
    }
    const header = rows[hIdx] as unknown[]

    const idx = {
      dni: header.indexOf(LABELS.dni),
      hora_inicio: header.indexOf(LABELS.hora_inicio),
      hora_fin: header.indexOf(LABELS.hora_fin),
      fecha: header.indexOf(LABELS.fecha),
    }
    const faltantes = Object.entries(idx)
      .filter(([, i]) => i === -1)
      .map(([k]) => k)
    if (faltantes.length) {
      return NextResponse.json(
        { error: `Faltan columnas en el reporte: ${faltantes.join(', ')}` },
        { status: 400 },
      )
    }

    filas = []
    for (const r of rows.slice(hIdx + 1)) {
      if (!Array.isArray(r)) continue
      const dni = r[idx.dni] == null ? null : String(r[idx.dni]).trim()
      if (!dni) continue // fila vacía o pie del reporte
      filas.push({
        dni,
        fecha: fmtFecha(r[idx.fecha]),
        hora_inicio: fmtHora(r[idx.hora_inicio]),
        hora_fin: fmtHora(r[idx.hora_fin]),
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
  const { data, error } = await supabase.rpc('fn_cargar_permisos', {
    p_filas: filas,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, resumen: data })
}
