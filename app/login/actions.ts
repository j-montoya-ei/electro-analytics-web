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
    const errorCode =
      error.message.toLowerCase().includes('email not confirmed')
        ? 'email_not_confirmed'
        : error.status === 400
          ? 'invalid_credentials'
          : 'auth_unavailable'

    redirect(`/login?error=${errorCode}`)
  }

  // Login exitoso → refresca el layout y va a la home
  revalidatePath('/', 'layout')
  redirect('/')
}
