// ═══════════════════════════════════════════════════════════
// Server Actions - Manejo de login
// Se ejecutan en el servidor cuando el usuario da submit
// ═══════════════════════════════════════════════════════════

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Si falla, redirige de vuelta al login con un flag de error
    redirect('/login?error=1')
  }

  // Login exitoso → refresca el layout y va a la home
  revalidatePath('/', 'layout')
  redirect('/')
}
