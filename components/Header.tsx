// ═══════════════════════════════════════════════════════════
// Componente Header - Barra superior
// Muestra: título de módulo, usuario logueado, logout
// ═══════════════════════════════════════════════════════════

'use client'

import { usePathname } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { logout } from '@/app/logout/actions'

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/empleados': 'Empleados',
  '/asistencia': 'Asistencia',
  '/inasistencias': 'Inasistencias',
  '/asistencia/administrativos': 'Puntualidad Administrativos',
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
    <header className="bg-white border-b border-gray-200 h-16 sticky top-0 z-30 flex items-center justify-between px-4 md:px-6">
      {/* Izquierda: título del módulo */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg md:text-xl font-semibold text-gray-900">
          {title}
        </h1>
        <span className="hidden md:inline text-sm text-gray-400">
          · Gestión Humana Analytics
        </span>
      </div>

      {/* Derecha: usuario + logout */}
      <div className="flex items-center gap-3">
        {/* Avatar + email */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#00369C] text-white flex items-center justify-center text-sm font-semibold">
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
        <div className="w-px h-8 bg-gray-200 hidden sm:block" />

        {/* Botón logout */}
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
