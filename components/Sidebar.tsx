// ═══════════════════════════════════════════════════════════
// Componente Sidebar - Navegación lateral colapsable
// Gestión Humana Analytics · Electroingeniería
// ═══════════════════════════════════════════════════════════
'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
   import {
     LayoutDashboard,
     PieChart,
     Users,
     CalendarCheck,
     UserX,
     Clock,
     ChevronLeft,
     ChevronRight,
   } from 'lucide-react'

   const navItems = [
     { href: '/', label: 'Caracterización', icon: PieChart },
     { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
     { href: '/empleados', label: 'Empleados', icon: Users },
     { href: '/asistencia', label: 'Asistencia', icon: CalendarCheck },
     { href: '/inasistencias', label: 'Inasistencias', icon: UserX },
     { href: '/llegadas-tarde', label: 'Llegadas tarde', icon: Clock },
   ]
export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  return (
    <aside
      className={`bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } hidden md:flex md:flex-col`}
    >
      {/* Logo header */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-center px-4">
        {collapsed ? (
          <Image
            src="/logos/electroingenieria-isotipo.png"
            alt="Electroingeniería"
            width={32}
            height={32}
            className="object-contain"
          />
        ) : (
          <Image
            src="/logos/electroingenieria-logo.png"
            alt="Electroingeniería"
            width={160}
            height={40}
            className="object-contain"
          />
        )}
      </div>
      {/* Navegación */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#00369C] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
      {/* Botón colapsar */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="border-t border-gray-200 h-12 flex items-center justify-center hover:bg-gray-50 text-gray-500 transition-colors"
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
