'use client'

import { useEffect, useMemo, useState } from 'react'
import LlegadasTardeDrilldown from './LlegadasTardeDrilldown'
import * as XLSX from 'xlsx-js-style'

type Fila = {
  trab_id: string
  nombre_completo: string
  area: string
  dias_evaluados: number
  tardanzas_oficiales: number
  minutos_oficiales: number
  dias_despues_teorica: number
  minutos_teoricos: number
  tardanzas_tarde: number
  minutos_tarde_oficiales: number
  dias_despues_tarde: number
  minutos_tarde_teoricos: number
  total_dias: number
  total_minutos: number
}

type ColKey =
  | 'nombre_completo'
  | 'area'
  | 'tardanzas_oficiales'
  | 'minutos_oficiales'
  | 'dias_despues_teorica'
  | 'minutos_teoricos'
  | 'tardanzas_tarde'
  | 'minutos_tarde_oficiales'
  | 'dias_despues_tarde'
  | 'minutos_tarde_teoricos'
  | 'total_dias'
  | 'total_minutos'

const PAGE_SIZE = 20

const TIPO: Record<ColKey, 'texto' | 'num'> = {
  nombre_completo: 'texto',
  area: 'texto',
  tardanzas_oficiales: 'num',
  minutos_oficiales: 'num',
  dias_despues_teorica: 'num',
  minutos_teoricos: 'num',
  tardanzas_tarde: 'num',
  minutos_tarde_oficiales: 'num',
  dias_despues_tarde: 'num',
  minutos_tarde_teoricos: 'num',
  total_dias: 'num',
  total_minutos: 'num',
}

export default function LlegadasTardeTable({
  data,
  desde,
  hasta,
}: {
  data: Fila[]
  desde: string
  hasta: string
}) {
  const [sortKey, setSortKey] = useState<ColKey>('total_minutos')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [seleccionado, setSeleccionado] = useState<Fila | null>(null)
  const [pagina, setPagina] = useState(1)

  function ordenarPor(key: ColKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(TIPO[key] === 'num' ? 'desc' : 'asc')
    }
  }

  const filas = useMemo(() => {
    const copia = [...data]
    const dir = sortDir === 'asc' ? 1 : -1
    copia.sort((a, b) => {
      if (TIPO[sortKey] === 'texto') {
        return String(a[sortKey]).localeCompare(String(b[sortKey]), 'es') * dir
      }
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir
    })
    return copia
  }, [data, sortKey, sortDir])

  const totalPaginas = Math.max(1, Math.ceil(filas.length / PAGE_SIZE))
  const filasVisibles = filas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)

  function exportarExcel() {
    // Top 20 por minutos totales acumulados (TOL + HORA), independiente del
    // orden en pantalla, para que el título "Top N ... con más llegadas tarde"
    // sea siempre veraz. (Cambio deliberado: antes exportaba el orden de la vista.)
    const filasExportadas = [...data]
      .sort((a, b) => b.total_minutos - a.total_minutos)
      .slice(0, 20)

    const n = filasExportadas.length
    const NCOLS = 13
    const R_TITULO = 0
    const R_SUB = 1
    const R_SPACER = 2
    const R_GRUPO = 3
    const R_SUBHDR = 4
    const R_DATA0 = 5
    const R_FOOTER = R_DATA0 + n

    // ── Matriz de valores ─────────────────────────────────────────────
    const aoa: (string | number)[][] = []
    aoa[R_TITULO] = [
      `Top ${n} colaboradores con más llegadas tarde — Electroingeniería S.A.S.`,
    ]
    aoa[R_SUB] = [
      `Período: ${desde} a ${hasta}  ·  Ordenado por minutos totales acumulados (mañana + tarde)`,
    ]
    aoa[R_SPACER] = []
    aoa[R_GRUPO] = [
      '#', 'Colaborador', 'Proceso',
      'MAÑANA (ENTRADA)', '', '', '',
      'TARDE (REGRESO ALMUERZO)', '', '', '',
      'TOTAL ACUMULADO', '',
    ]
    aoa[R_SUBHDR] = [
      '', '', '',
      'Días (TOL)', 'Min (TOL)', 'Días (HORA)', 'Min (HORA)',
      'Días (TOL)', 'Min (TOL)', 'Días (HORA)', 'Min (HORA)',
      'Días', 'Minutos',
    ]
    filasExportadas.forEach((f, i) => {
      aoa[R_DATA0 + i] = [
        i + 1, f.nombre_completo, f.area,
        f.tardanzas_oficiales, f.minutos_oficiales, f.dias_despues_teorica, f.minutos_teoricos,
        f.tardanzas_tarde, f.minutos_tarde_oficiales, f.dias_despues_tarde, f.minutos_tarde_teoricos,
        f.total_dias, f.total_minutos,
      ]
    })
    aoa[R_FOOTER] = [
      'TOL = minutos que superaron la tolerancia de gracia (7 min).  ' +
        'HORA = minutos transcurridos desde la hora teórica.  ' +
        'El total acumulado suma TOL + HORA de mañana y tarde.  ' +
        'Se consideran permisos aprobados y las excepciones de horario vigentes.',
    ]

    const hoja = XLSX.utils.aoa_to_sheet(aoa)

    // ── Combinaciones ─────────────────────────────────────────────────
    hoja['!merges'] = [
      { s: { r: R_TITULO, c: 0 }, e: { r: R_TITULO, c: NCOLS - 1 } },
      { s: { r: R_SUB, c: 0 }, e: { r: R_SUB, c: NCOLS - 1 } },
      { s: { r: R_GRUPO, c: 0 }, e: { r: R_SUBHDR, c: 0 } }, // #
      { s: { r: R_GRUPO, c: 1 }, e: { r: R_SUBHDR, c: 1 } }, // Colaborador
      { s: { r: R_GRUPO, c: 2 }, e: { r: R_SUBHDR, c: 2 } }, // Proceso
      { s: { r: R_GRUPO, c: 3 }, e: { r: R_GRUPO, c: 6 } }, // Mañana
      { s: { r: R_GRUPO, c: 7 }, e: { r: R_GRUPO, c: 10 } }, // Tarde
      { s: { r: R_GRUPO, c: 11 }, e: { r: R_GRUPO, c: 12 } }, // Total
      { s: { r: R_FOOTER, c: 0 }, e: { r: R_FOOTER, c: NCOLS - 1 } },
    ]

    // ── Anchos de columna ─────────────────────────────────────────────
    hoja['!cols'] = [
      { wch: 4 }, { wch: 32 }, { wch: 24 },
      { wch: 10 }, { wch: 10 }, { wch: 11 }, { wch: 11 },
      { wch: 10 }, { wch: 10 }, { wch: 11 }, { wch: 11 },
      { wch: 8 }, { wch: 11 },
    ]

    // ── Altos de fila ─────────────────────────────────────────────────
    const altos: { hpt: number }[] = []
    altos[R_TITULO] = { hpt: 26 }
    altos[R_SUB] = { hpt: 16 }
    altos[R_SPACER] = { hpt: 6 }
    altos[R_GRUPO] = { hpt: 20 }
    altos[R_SUBHDR] = { hpt: 26 }
    altos[R_FOOTER] = { hpt: 40 }
    hoja['!rows'] = altos

    // Congelar encabezados + 3 primeras columnas (si la librería lo soporta)
    hoja['!freeze'] = { xSplit: 3, ySplit: R_DATA0 }

    // ── Paleta ────────────────────────────────────────────────────────
    const NAVY = '092D6B'
    const MID = '1B4F91'
    const CLARO = 'DCE6F1'
    const ZEBRA = 'EEF3F8'
    const TOTAL_FILL = 'EAF0F9'
    const GRIS_TXT = '1F2937'
    const GRIS_SUAVE = '6B7280'
    const NARANJA = 'C0501E'
    const BORDE = 'AFC4DF'
    const BORDE_SUAVE = 'D8E1EC'

    const set = (r: number, c: number, s: object) => {
      const ref = XLSX.utils.encode_cell({ r, c })
      if (!hoja[ref]) hoja[ref] = { t: 's', v: '' }
      hoja[ref].s = s
    }

    const bordeHdr = {
      top: { style: 'thin', color: { rgb: NAVY } },
      bottom: { style: 'thin', color: { rgb: NAVY } },
      left: { style: 'thin', color: { rgb: BORDE } },
      right: { style: 'thin', color: { rgb: BORDE } },
    }

    // Título y subtítulo
    set(R_TITULO, 0, {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 },
      fill: { fgColor: { rgb: NAVY } },
      alignment: { horizontal: 'center', vertical: 'center' },
    })
    set(R_SUB, 0, {
      font: { italic: true, color: { rgb: GRIS_SUAVE }, sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center' },
    })

    // Encabezado izquierdo (#, Colaborador, Proceso) — merge R_GRUPO:R_SUBHDR
    ;[0, 1, 2].forEach((c) => {
      set(R_GRUPO, c, {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
        fill: { fgColor: { rgb: NAVY } },
        alignment: { horizontal: c === 0 ? 'center' : 'left', vertical: 'center', wrapText: true },
        border: bordeHdr,
      })
      // parte inferior del merge (para cerrar bordes/relleno)
      set(R_SUBHDR, c, { fill: { fgColor: { rgb: NAVY } }, border: bordeHdr })
    })

    // Grupos Mañana / Tarde (navy) y Total (claro)
    for (let c = 3; c <= 12; c += 1) {
      const esTotal = c >= 11
      set(R_GRUPO, c, {
        font: { bold: true, color: { rgb: esTotal ? NAVY : 'FFFFFF' }, sz: 10 },
        fill: { fgColor: { rgb: esTotal ? CLARO : NAVY } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: bordeHdr,
      })
    }

    // Subencabezados (Días/Min ...)
    for (let c = 3; c <= 12; c += 1) {
      const esTotal = c >= 11
      set(R_SUBHDR, c, {
        font: { bold: true, color: { rgb: esTotal ? NAVY : 'FFFFFF' }, sz: 9 },
        fill: { fgColor: { rgb: esTotal ? CLARO : MID } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: bordeHdr,
      })
    }

    // Datos
    for (let i = 0; i < n; i += 1) {
      const r = R_DATA0 + i
      const zebra = i % 2 === 1 ? ZEBRA : 'FFFFFF'
      for (let c = 0; c < NCOLS; c += 1) {
        const esTexto = c === 1 || c === 2
        const esTotalMin = c === 12
        const esTotalDias = c === 11
        const esMinTol = c === 4 || c === 8
        const val = aoa[r][c]
        let color = GRIS_TXT
        if (esTotalMin) color = NAVY
        else if (esMinTol && typeof val === 'number' && val > 0) color = NARANJA
        set(r, c, {
          font: { color: { rgb: color }, bold: esTotalMin || esTotalDias },
          fill: { fgColor: { rgb: esTotalDias || esTotalMin ? TOTAL_FILL : zebra } },
          alignment: {
            horizontal: c === 0 ? 'center' : esTexto ? 'left' : 'center',
            vertical: 'center',
            wrapText: esTexto,
          },
          border: {
            bottom: { style: 'thin', color: { rgb: BORDE_SUAVE } },
            right: { style: 'thin', color: { rgb: 'E8EDF4' } },
            ...(c === 3 || c === 7 || c === 11
              ? { left: { style: 'thin', color: { rgb: BORDE } } }
              : {}),
          },
        })
      }
    }

    // Nota al pie
    set(R_FOOTER, 0, {
      font: { italic: true, color: { rgb: GRIS_SUAVE }, sz: 8 },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    })

    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Llegadas tarde')
    XLSX.writeFile(libro, `llegadas-tarde-${desde}-${hasta}.xlsx`)
  }

  useEffect(() => {
    setPagina(1)
  }, [data, sortKey, sortDir])

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas)
  }, [pagina, totalPaginas])

  const flecha = (key: ColKey) =>
    key === sortKey ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const thNum =
    'px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#00369C] transition-colors'
  const thTxt =
    'px-4 py-3 text-left font-medium text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#00369C] align-middle transition-colors'

  return (
    <div className="space-y-3">
      {/* Nota aclaratoria minimalista */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3.5 text-xs leading-relaxed text-gray-500 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold text-[#00369C]">TOL = Tolerancia:</span> minutos que exceden el margen de gracia permitido.{' '}
          <span className="font-semibold text-gray-700">HORA = Hora reglamentaria:</span> minutos calculados desde la hora oficial de ingreso.{' '}
          <span className="text-gray-400">|</span>{' '}
          <span className="italic">El total acumulado suma ambos conceptos (TOL + HORA) por turno y por jornada.</span>
        </p>
        <button
          type="button"
          onClick={exportarExcel}
          disabled={filas.length === 0}
          className="shrink-0 rounded-md bg-[#087F5B] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#06684B] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Exportar Excel (20)
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full text-sm">
            <thead className="sticky top-0 z-10 text-gray-700 font-semibold">
              {/* Fila superior de Categorías de Agrupación */}
              <tr className="border-b border-gray-200 bg-gray-50 text-xs">
                <th rowSpan={2} onClick={() => ordenarPor('nombre_completo')} className={thTxt + ' sticky left-0 z-20 bg-gray-50'}>
                  Colaborador{flecha('nombre_completo')}
                </th>
                <th rowSpan={2} onClick={() => ordenarPor('area')} className={thTxt + ' sticky left-[190px] z-20 bg-gray-50'}>
                  Proceso{flecha('area')}
                </th>
                <th colSpan={4} className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-100/60 border-l border-gray-200">
                  Mañana (Entrada)
                </th>
                <th colSpan={4} className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-100/60 border-l border-gray-200">
                  Tarde (Regreso Almuerzo)
                </th>
                <th colSpan={2} className="px-3 py-2 text-center font-bold text-[#00369C] bg-blue-50/50 border-l border-gray-200">
                  Total acumulado (Tol + Hora)
                </th>
              </tr>
              {/* Fila inferior de Métricas Específicas */}
              <tr className="border-b border-gray-200 bg-white text-[11px] text-gray-500">
                <th onClick={() => ordenarPor('tardanzas_oficiales')} className={thNum + ' border-l border-gray-200'}>
                  Días (Tol){flecha('tardanzas_oficiales')}
                </th>
                <th onClick={() => ordenarPor('minutos_oficiales')} className={thNum}>
                  Min (Tol){flecha('minutos_oficiales')}
                </th>
                <th onClick={() => ordenarPor('dias_despues_teorica')} className={thNum}>
                  Días (Hora){flecha('dias_despues_teorica')}
                </th>
                <th onClick={() => ordenarPor('minutos_teoricos')} className={thNum}>
                  Min (Hora){flecha('minutos_teoricos')}
                </th>
                <th onClick={() => ordenarPor('tardanzas_tarde')} className={thNum + ' border-l border-gray-200'}>
                  Días (Tol){flecha('tardanzas_tarde')}
                </th>
                <th onClick={() => ordenarPor('minutos_tarde_oficiales')} className={thNum}>
                  Min (Tol){flecha('minutos_tarde_oficiales')}
                </th>
                <th onClick={() => ordenarPor('dias_despues_tarde')} className={thNum}>
                  Días (Hora){flecha('dias_despues_tarde')}
                </th>
                <th onClick={() => ordenarPor('minutos_tarde_teoricos')} className={thNum}>
                  Min (Hora){flecha('minutos_tarde_teoricos')}
                </th>
                <th onClick={() => ordenarPor('total_dias')} className={thNum + ' border-l border-gray-200 font-bold text-gray-900 bg-blue-50/30'}>
                  Días{flecha('total_dias')}
                </th>
                <th onClick={() => ordenarPor('total_minutos')} className={thNum + ' font-bold text-[#00369C] bg-blue-50/30'}>
                  Minutos{flecha('total_minutos')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filasVisibles.map((f) => (
                <tr
                  key={f.trab_id}
                  onClick={() => setSeleccionado(f)}
                  className="group cursor-pointer border-b border-gray-100 transition-colors odd:bg-white even:bg-slate-50/35 hover:bg-blue-50/50 focus-within:bg-blue-50/50"
                  title={`Ver detalle de ${f.nombre_completo}`}
                >
                  <td className="sticky left-0 z-10 bg-inherit px-4 py-3 font-semibold text-gray-900 group-hover:bg-blue-50/50">{f.nombre_completo}</td>
                  <td className="sticky left-[190px] z-10 bg-inherit px-4 py-3 text-xs text-gray-600 group-hover:bg-blue-50/50">{f.area}</td>
                  
                  {/* Mañana */}
                  <td className="border-l border-gray-100 px-3 py-3 text-right text-gray-600">{f.tardanzas_oficiales}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${f.minutos_oficiales > 0 ? 'text-gray-900' : 'text-gray-400'}`}>{f.minutos_oficiales}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{f.dias_despues_teorica}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${f.minutos_teoricos > 0 ? 'text-gray-900' : 'text-gray-400'}`}>{f.minutos_teoricos}</td>

                  {/* Tarde */}
                  <td className="border-l border-gray-100 px-3 py-3 text-right text-gray-600">{f.tardanzas_tarde}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${f.minutos_tarde_oficiales > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{f.minutos_tarde_oficiales}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{f.dias_despues_tarde}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${f.minutos_tarde_teoricos > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{f.minutos_tarde_teoricos}</td>

                  {/* Totales */}
                  <td className="border-l border-gray-200 bg-blue-50/20 px-3 py-3 text-right font-bold text-gray-900">{f.total_dias}</td>
                  <td className="bg-blue-50/20 px-3 py-3 text-right font-bold text-[#00369C]">{f.total_minutos}</td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">
                    No se registran llegadas tarde en el rango de fechas seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filas.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Mostrando {((pagina - 1) * PAGE_SIZE) + 1}–{Math.min(pagina * PAGE_SIZE, filas.length)} de {filas.length} colaboradores
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-[#00369C] hover:text-[#00369C] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((numero) => (
                <button
                  key={numero}
                  type="button"
                  onClick={() => setPagina(numero)}
                  className={`min-w-8 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                    pagina === numero
                      ? 'bg-[#00369C] text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-[#00369C] hover:text-[#00369C]'
                  }`}
                  aria-current={pagina === numero ? 'page' : undefined}
                >
                  {numero}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-[#00369C] hover:text-[#00369C] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {seleccionado && (
        <LlegadasTardeDrilldown
          trabId={seleccionado.trab_id}
          nombre={seleccionado.nombre_completo}
          area={seleccionado.area}
          desde={desde}
          hasta={hasta}
          onClose={() => setSeleccionado(null)}
        />
      )}
    </div>
  )
}
