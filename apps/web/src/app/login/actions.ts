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
        .select('is_tessera_admin')
        .eq('id', data.user.id)
        .single()

    // 3. Check if they belong to any organization
    const { data: tenantData } = await supabase
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', data.user.id)

    revalidatePath('/', 'layout')

    // 4. Route them dynamically based on their roles
    if (profile?.is_tessera_admin) {
        redirect('/admin')
    } else if (!tenantData || tenantData.length === 0) {
        redirect('/join')
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