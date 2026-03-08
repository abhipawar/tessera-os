'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { API_URL } from '@/config'
import { rateLimit } from '@/utils/rateLimit'
import { welcomeTemplate } from '@/emails/welcomeTemplate'

export async function onboardTenant(payload: Record<string, string>) {
    const supabase = await createClient()
    const name = payload.name
    const companyName = payload.companyName
    const email = payload.email
    const password = payload.password
    const otpCode = payload.otpCode

    // Anti-Bot Spam Protection: Max 5 tenant creations per minute per Email
    const { success: allowed } = rateLimit(`onboard_${email}`, 5, 60000)
    if (!allowed) {
        redirect(`/onboarding?error=${encodeURIComponent('Too many requests. Please slow down.')}`)
    }

    // 1. Tell Python to securely create the User, Tenant, and Workspace
    try {
        const res = await fetch(`${API_URL}/api/signup-onboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                name,
                company_name: companyName,
                otp_code: otpCode
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // 2. Secretly send the beautiful Welcome Email right after provisioning!
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
            fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${resendKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from: "Tessera OS <welcome@tesseraos.ai>",
                    to: email,
                    subject: `Welcome to Tessera OS, ${name}`,
                    html: welcomeTemplate(name, companyName)
                })
            }).catch(e => console.error("Non-fatal Background Email Dispatch err:", e));
        }

    } catch (e: any) {
        console.error("Backend onboarding failed", e);
        redirect(`/onboarding?error=${encodeURIComponent('Failed to provision environment')}`);
    }

    // 3. Log the user into the Next.js frontend using the credentials they just provided
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (signInError) {
        redirect(`/onboarding?error=${encodeURIComponent('Created environment, but failed to log in automatically.')}`);
    }

    // 4. Clear the cache and send them to the Tour
    revalidatePath('/', 'layout')
    redirect('/tour')
}
