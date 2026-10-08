// Formatea horas decimales como "2 h 13 min" (redondeado al minuto).
// Buk entrega segundos; el costo se calcula en SQL con el tiempo exacto,
// esto es solo visualización.
export function fmtHorasMin(horas: number | string | null | undefined): string {
  const totalMin = Math.round(Number(horas ?? 0) * 60)
  if (!Number.isFinite(totalMin) || totalMin <= 0) return '0 min'
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}
