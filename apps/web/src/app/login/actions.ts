'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // 1. Authenticate the user
    const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error || !data.user) {
        redirect('/login?error=Could not authenticate user')
    }

    // 2. Fetch their secure admin flag from the database
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_tessera_admin') // 🔥 Ghost column removed!
        .eq('id', data.user.id)
        .single()

    revalidatePath('/', 'layout')

    // 3. Route them dynamically based on their admin flag
    if (profile?.is_tessera_admin) {
        redirect('/admin')
    } else {
        redirect('/dashboard')
    }
}

export async function signup(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        redirect('/login?error=Could not create user')
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}