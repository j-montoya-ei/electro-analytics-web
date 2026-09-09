// ═══════════════════════════════════════════════════════════
// POST /api/recaudo-pagos/cargar
// Recibe el libro RECAUDO (.xls o .xlsx), hoja 'RECAUDO', y hace el
// MELT de la matriz mensual (sección 1, columnas MESES DE PAGO):
// por cada mes de generación × cada columna de pago con valor, emite
// una fila (mes_generacion, mes_pago, valor_recaudado).
//
// Las columnas de pago se detectan por su encabezado 'abbr-YY'
// (dic-24, ene-25, …), lo que excluye MES / INCAPACIDADES /
// VALOR INGRESO / SUMA / % de recaudo automáticamente.
//
// El RPC aplica las reglas de negocio (no este handler):
//   - fila válida = mes_generacion y mes_pago NOT NULL
//   - deduplica por (mes_generacion, mes_pago)
//   - upsert last-write-wins: ON CONFLICT DO UPDATE
//
// Ubicación: app/api/recaudo-pagos/cargar/route.ts
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from '@e965/xlsx'
import { createClient } from '@/lib/supabase/server'

// El parseo de Excel usa Buffer → requiere runtime Node, no Edge.
export const runtime = 'nodejs'

// Anclas para localizar la fila de encabezados de la matriz (por nombre).
const ANCLAS = ['MES', 'INCAPACIDADES', 'VALOR INGRESO'] as const

// Meses en español, nombre completo (columna MES) → número.
const MESES_LARGO: Record<string, string> = {
  ENERO: '01', FEBRERO: '02', MARZO: '03', ABRIL: '04', MAYO: '05', JUNIO: '06',
  JULIO: '07', AGOSTO: '08', SEPTIEMBRE: '09', OCTUBRE: '10', NOVIEMBRE: '11', DICIEMBRE: '12',
}
// Meses en español, abreviatura de 3 letras (encabezados de pago) → número.
const MESES_ABBR: Record<string, string> = {
  ENE: '01', FEB: '02', MAR: '03', ABR: '04', MAY: '05', JUN: '06',
  JUL: '07', AGO: '08', SEP: '09', OCT: '10', NOV: '11', DIC: '12',
}

// 'NOVIEMBRE 2023' → '2023-11-01'. Cualquier otra cosa (Suma, vacío, EPS…) → null.
// Es también la señal de corte del recorrido de filas.
const fmtMesLargo = (v: unknown): string | null => {
  if (v == null) return null
  const s = String(v).trim().toUpperCase()
  const m = s.match(/^([A-ZÁÉÍÓÚÑ]+)\s+(\d{4})$/)
  if (!m) return null
  const mm = MESES_LARGO[m[1]]
  return mm ? `${m[2]}-${mm}-01` : null
}

// 'dic-24' → '2024-12-01'. Sirve además para detectar qué columnas son de pago.
const fmtMesPago = (v: unknown): string | null => {
  if (v == null) return null
  const s = String(v).trim().toUpperCase()
  const m = s.match(/^([A-ZÁÉÍÓÚ]{3})[-/](\d{2})$/)
  if (!m) return null
  const mm = MESES_ABBR[m[1]]
  return mm ? `20${m[2]}-${mm}-01` : null
}

// Número → texto numérico limpio. Con raw:true las celdas numéricas llegan
// como number → String() no introduce separador de miles. Texto solo si es un
// número válido; cualquier otra cosa (p.ej. el marcador '-') → null.
const num = (v: unknown): string | null => {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null
  const s = String(v).trim()
  if (!s) return null
  return /^-?\d+(\.\d+)?$/.test(s) ? s : null
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

  // 3) Parsear y hacer el melt de la matriz
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

    // Fila de encabezados: la que contiene las 3 anclas de la matriz.
    const hIdx = rows.findIndex(
      (r) => Array.isArray(r) && ANCLAS.every((a) => r.includes(a)),
    )
    if (hIdx === -1) {
      return NextResponse.json(
        { error: 'No se encontró la fila de encabezados de la matriz (MES / INCAPACIDADES / VALOR INGRESO)' },
        { status: 400 },
      )
    }
    const header = rows[hIdx] as unknown[]

    const idxMes = header.indexOf('MES')

    // Columnas de pago = aquellas cuyo encabezado parsea como 'abbr-YY'.
    const colsPago: Array<{ col: number; mesPago: string }> = []
    header.forEach((h, i) => {
      const mp = fmtMesPago(h)
      if (mp) colsPago.push({ col: i, mesPago: mp })
    })
    if (idxMes === -1 || colsPago.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron la columna MES o las columnas de meses de pago' },
        { status: 400 },
      )
    }

    // Recorrer filas de generación; corte al primer MES que no parsea (Suma,
    // vacío o inicio de la sección de cartera). Emite una fila por cada celda
    // de pago con valor.
    filas = []
    for (const r of rows.slice(hIdx + 1)) {
      if (!Array.isArray(r)) break
      const mesGen = fmtMesLargo(r[idxMes])
      if (!mesGen) break

      for (const { col, mesPago } of colsPago) {
        const val = num(r[col])
        if (val == null) continue // celda vacía = sin pago ese mes
        filas.push({
          mes_generacion: mesGen,
          mes_pago: mesPago,
          valor_recaudado: val,
        })
      }
    }
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo Excel' }, { status: 400 })
  }

  if (filas.length === 0) {
    return NextResponse.json(
      { error: 'La matriz no contiene pagos para cargar' },
      { status: 400 },
    )
  }

  // 4) Cargar vía RPC
  const { data, error } = await supabase.rpc('fn_cargar_recaudo_pagos', {
    p_filas: filas,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, resumen: data })
}
