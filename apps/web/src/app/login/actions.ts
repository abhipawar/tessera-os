'use server'

import { createClient } from '@/utils/supabase/server'
import { rateLimit } from '@/utils/rateLimit'

export async function login(formData: FormData) {
    const email = formData.get('email') as string

    // Anti-Bruteforce Bot Protection: Max 5 login attempts per minute per Email Address
    const { success: allowed } = rateLimit(`login_${email}`, 5, 60000)
    if (!allowed) {
        return { success: false, error: 'Too many attempts. Please try again later.' }
    }

    const supabase = await createClient()
    const password = formData.get('password') as string

    // 1. Authenticate the user
    const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error || !data.user) {
        return { success: false, error: 'Could not authenticate user. Please check your credentials.' }
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

    // 4. Route them dynamically based on their roles
    if (profile?.is_tessera_admin) {
        return { success: true, url: '/admin' }
    } else if (!tenantData || tenantData.length === 0) {
        return { success: true, url: '/join' }
    } else {
        return { success: true, url: '/dashboard' }
    }
}

