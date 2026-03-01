'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function onboardTenant(formData: FormData) {
    const supabase = await createClient()
    const name = formData.get('name') as string
    const companyName = formData.get('companyName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // 1. Tell Python to securely create the User, Tenant, and Workspace
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
        const res = await fetch(`${API_URL}/api/signup-onboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                name,
                company_name: companyName
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

    } catch (e: any) {
        console.error("Backend onboarding failed", e);
        redirect(`/onboarding?error=${encodeURIComponent('Failed to provision environment')}`);
    }

    // 2. Log the user into the Next.js frontend using the credentials they just provided
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (signInError) {
        redirect(`/onboarding?error=${encodeURIComponent('Created environment, but failed to log in automatically.')}`);
    }

    // 3. Clear the cache and send them to the Studio
    revalidatePath('/', 'layout')
    redirect('/studio')
}
