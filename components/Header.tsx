// ═══════════════════════════════════════════════════════════
// Componente Header - Barra superior
// Muestra: título de módulo, usuario logueado, logout
// ═══════════════════════════════════════════════════════════

'use client'

import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { logout } from '@/app/logout/actions'

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/empleados': 'Empleados',
  '/asistencia': 'Asistencia',
  '/inasistencias': 'Inasistencias',
  '/llegadas-tarde': 'Llegadas tarde',
  '/horas-extras': 'Horas extras',
}

export default function Header({ userEmail }: { userEmail: string | undefined }) {
  const pathname = usePathname()
  const title = routeTitles[pathname] || 'Gestión Humana Analytics'

  // Generar iniciales del email para el avatar
  const getInitials = (email: string | undefined) => {
    if (!email) return '?'
    const namePart = email.split('@')[0]
    const parts = namePart.split(/[._-]/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return namePart.substring(0, 2).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200/80 bg-white/95 px-4 shadow-[0_1px_3px_rgba(16,24,40,0.04)] backdrop-blur md:px-8">
      {/* Izquierda: título del módulo */}
      <div className="flex items-center gap-3">
        <span className="hidden h-7 w-1 rounded-full bg-[#F6D000] md:block" aria-hidden="true" />
        <h1 className="text-lg font-bold tracking-tight text-gray-900 md:text-xl">
          {title}
        </h1>
        <span className="hidden text-sm text-gray-400 md:inline">
          · Gestión Humana Analytics
        </span>
      </div>

      {/* Derecha: usuario + logout */}
      <div className="flex items-center gap-2.5 md:gap-3">
        {/* Avatar + email */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00369C] text-sm font-semibold text-white ring-4 ring-blue-50">
            {getInitials(userEmail)}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">
              {userEmail?.split('@')[0]}
            </p>
            <p className="text-xs text-gray-500 leading-tight">
              {userEmail?.split('@')[1]}
            </p>
          </div>
        </div>

        {/* Separador */}
        <div className="hidden h-8 w-px bg-gray-200 sm:block" />

        {/* Botón logout */}
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </form>
      </div>
    </header>
  )
}
