// ═══════════════════════════════════════════════════════════
// Layout Protegido - Aplica a todas las páginas que requieren login
// Incluye: Sidebar de navegación + Header superior
// ═══════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Área principal: Header + contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header userEmail={user?.email} />
        <main className="flex-1 p-4 md:p-6 overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
