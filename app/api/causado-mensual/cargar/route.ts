// ═══════════════════════════════════════════════════════════
// POST /api/causado-mensual/cargar
// Recibe el libro RECAUDO (.xls o .xlsx), hoja 'RECAUDO', lee la
// matriz mensual (sección 1) y carga las 3 columnas del grano
// "mes de generación" vía RPC fn_cargar_causado_mensual.
//
// Solo se leen 3 columnas de la matriz:
//   MES → mes_generacion · INCAPACIDADES → valor_causado · VALOR INGRESO → valor_ingreso
// El resto de la matriz (columnas de mes de pago, SUMA, % recaudo) y la
// sección 2 (cartera por EPS) NO se cargan aquí.
//
// El RPC aplica las reglas de negocio (no este handler):
//   - fila válida = mes_generacion NOT NULL
//   - deduplica por mes_generacion
//   - upsert last-write-wins: ON CONFLICT (mes_generacion) DO UPDATE
//
// Ubicación: app/api/causado-mensual/cargar/route.ts
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from '@e965/xlsx'
import { createClient } from '@/lib/supabase/server'

// El parseo de Excel usa Buffer → requiere runtime Node, no Edge.
export const runtime = 'nodejs'

// Encabezados exactos de la matriz. Se localizan por nombre (no por
// posición): el bloque arranca en la columna C, no en A. La clave de cada
// entrada es el nombre interno que espera el RPC (x->>'clave').
const LABELS = {
  mes_generacion: 'MES',
  valor_causado: 'INCAPACIDADES',
  valor_ingreso: 'VALOR INGRESO',
} as const

type Campo = keyof typeof LABELS

// Las tres columnas deben existir en el encabezado para poder procesar.
const CRITICAS: Campo[] = ['mes_generacion', 'valor_causado', 'valor_ingreso']

// Meses en español (nombre completo, mayúsculas) → número de mes.
const MESES: Record<string, string> = {
  ENERO: '01',
  FEBRERO: '02',
  MARZO: '03',
  ABRIL: '04',
  MAYO: '05',
  JUNIO: '06',
  JULIO: '07',
  AGOSTO: '08',
  SEPTIEMBRE: '09',
  OCTUBRE: '10',
  NOVIEMBRE: '11',
  DICIEMBRE: '12',
}

// 'NOVIEMBRE 2023' → '2023-11-01' (primer día del mes, forma canónica).
// Cualquier texto que no sea "<MES> <AAAA>" (p.ej. 'Suma', una nota, un
// nombre de EPS de la sección 2, o vacío) → null. Es también la señal de
// corte del recorrido de filas.
const fmtMesEspanol = (v: unknown): string | null => {
  if (v == null) return null
  const s = String(v).trim().toUpperCase()
  const m = s.match(/^([A-ZÁÉÍÓÚÑ]+)\s+(\d{4})$/)
  if (!m) return null
  const mm = MESES[m[1]]
  if (!mm) return null
  return `${m[2]}-${mm}-01`
}

// Número → texto numérico limpio. Con raw:true las celdas numéricas llegan
// como number → String() no introduce separador de miles. Un texto solo se
// acepta si es un número válido; cualquier otra cosa (p.ej. el marcador '-'
// de "sin dato") → null, para no romper el cast ::numeric del RPC.
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

  // 3) Parsear y extraer filas de la matriz mensual
  let filas: Array<Record<string, string | null>>
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buf, { cellDates: true })

    // Preferir la hoja 'RECAUDO'; si no existe, usar la primera.
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

    // Localizar la fila de encabezados: la que contiene las 3 etiquetas de
    // la matriz. Esto identifica el bloque sin depender del offset de columna.
    const hIdx = rows.findIndex(
      (r) =>
        Array.isArray(r) &&
        r.includes(LABELS.mes_generacion) &&
        r.includes(LABELS.valor_causado) &&
        r.includes(LABELS.valor_ingreso),
    )
    if (hIdx === -1) {
      return NextResponse.json(
        { error: 'No se encontró la fila de encabezados de la matriz (MES / INCAPACIDADES / VALOR INGRESO)' },
        { status: 400 },
      )
    }
    const header = rows[hIdx] as unknown[]

    const idx = Object.fromEntries(
      (Object.entries(LABELS) as [Campo, string][]).map(([k, label]) => [
        k,
        header.indexOf(label),
      ]),
    ) as Record<Campo, number>

    const faltantes = CRITICAS.filter((k) => idx[k] === -1)
    if (faltantes.length) {
      return NextResponse.json(
        {
          error: `Faltan columnas en la matriz: ${faltantes
            .map((k) => LABELS[k])
            .join(', ')}`,
        },
        { status: 400 },
      )
    }

    // Recorrer filas desde el encabezado. Se detiene en el primer MES que no
    // parsea (fila 'Suma', vacía o inicio de la sección de cartera): eso acota
    // la matriz mensual y evita leer la sección 2.
    filas = []
    for (const r of rows.slice(hIdx + 1)) {
      if (!Array.isArray(r)) break
      const mes = fmtMesEspanol(r[idx.mes_generacion])
      if (!mes) break

      filas.push({
        mes_generacion: mes,
        valor_causado: num(r[idx.valor_causado]),
        valor_ingreso: num(r[idx.valor_ingreso]),
      })
    }
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo Excel' }, { status: 400 })
  }

  if (filas.length === 0) {
    return NextResponse.json(
      { error: 'La matriz no contiene filas de meses válidas' },
      { status: 400 },
    )
  }

  // 4) Cargar vía RPC
  const { data, error } = await supabase.rpc('fn_cargar_causado_mensual', {
    p_filas: filas,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, resumen: data })
}
