// ═══════════════════════════════════════════════════════════
// Componente Sidebar - Navegación lateral colapsable
// Gestión Humana · Electroingeniería
// ═══════════════════════════════════════════════════════════
'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  PieChart,
  Users,
  UserX,
  Clock,
  Timer,
  Fingerprint,
  Stethoscope,
  Coins,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  Menu,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Caracterización', icon: PieChart },
  { href: '/empleados', label: 'Empleados', icon: Users },
  { href: '/inasistencias', label: 'Inasistencias', icon: UserX },
  { href: '/llegadas-tarde', label: 'Llegadas tarde', icon: Clock },
  { href: '/horas-extras', label: 'Horas extras', icon: Timer },
  { href: '/marcas-fallidas', label: 'Marcas fallidas', icon: Fingerprint },
  { href: '/incapacidades', label: 'Incapacidades', icon: Stethoscope },
  { href: '/recaudo', label: 'Recaudo', icon: Coins },
]

type SidebarMode = 'expanded' | 'collapsed' | 'hidden'

export default function Sidebar() {
  const pathname = usePathname()
  const [mode, setMode] = useState<SidebarMode>('expanded')
  const [mounted, setMounted] = useState(false)
  const collapsed = mode === 'collapsed'

  // Recuerda la elección entre recargas
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('sidebar-mode')
    if (saved === 'expanded' || saved === 'collapsed' || saved === 'hidden') {
      setMode(saved)
    }
  }, [])
  useEffect(() => {
    if (mounted) localStorage.setItem('sidebar-mode', mode)
  }, [mode, mounted])

  // Oculto: la barra desaparece y queda solo un botón flotante para traerla de vuelta
  if (mode === 'hidden') {
    return (
      <button
        onClick={() => setMode('expanded')}
        title="Mostrar menú"
        aria-label="Mostrar menú"
        className="fixed left-3 top-3 z-40 hidden h-10 w-10 items-center justify-center rounded-md border border-[#123b78] bg-[#092d6b] text-blue-100 shadow-lg transition-colors hover:bg-[#0d3a85] hover:text-white md:flex"
      >
        <Menu className="h-5 w-5" />
      </button>
    )
  }

  return (
    <aside
      className={`sticky top-0 h-screen border-r border-[#123b78] bg-[#092d6b] transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } hidden md:flex md:flex-col`}
    >
      {/* Logo header */}
      <div className="flex h-16 items-center justify-center border-b border-white/15 px-4">
        {collapsed ? (
          <Image
            src="/logos/electroingenieria-isotipo.png"
            alt="Electroingeniería"
            width={32}
            height={32}
            className="object-contain brightness-0 invert"
          />
        ) : (
          <Image
            src="/logos/electroingenieria-logo.png"
            alt="Electroingeniería"
            width={160}
            height={40}
            className="object-contain brightness-0 invert"
          />
        )}
      </div>
      {/* Navegación */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-5">
        {!collapsed && (
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200">
            Módulos
          </p>
        )}
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white font-semibold text-[#092d6b] shadow-sm'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
      {/* Controles: minimizar y ocultar */}
      <div className={`border-t border-white/15 ${collapsed ? 'flex flex-col' : 'flex flex-row'}`}>
        <button
          onClick={() => setMode(collapsed ? 'expanded' : 'collapsed')}
          className="flex h-12 flex-1 items-center justify-center text-blue-200 transition-colors hover:bg-white/10 hover:text-white"
          title={collapsed ? 'Expandir menú' : 'Minimizar menú'}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
        <button
          onClick={() => setMode('hidden')}
          className={`flex h-12 flex-1 items-center justify-center text-blue-200 transition-colors hover:bg-white/10 hover:text-white ${
            collapsed ? 'border-t' : 'border-l'
          } border-white/15`}
          title="Ocultar menú"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>
    </aside>
  )
}
