// ═══════════════════════════════════════════════════════════
// Componente Sidebar - Navegación lateral colapsable
// Gestión Humana · Electroingeniería
// ═══════════════════════════════════════════════════════════
'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  PieChart,
  Users,
  UserX,
  Clock,
  Timer,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Caracterización', icon: PieChart },
  { href: '/empleados', label: 'Empleados', icon: Users },
  { href: '/inasistencias', label: 'Inasistencias', icon: UserX },
  { href: '/llegadas-tarde', label: 'Llegadas tarde', icon: Clock },
  { href: '/horas-extras', label: 'Horas extras', icon: Timer },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
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
      {/* Botón colapsar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-12 items-center justify-center border-t border-white/15 text-blue-200 transition-colors hover:bg-white/10 hover:text-white"
        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        {collapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>
    </aside>
  )
}
