import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Notice the function is now named `proxy` to satisfy Next.js 16!
export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 1. Check if the user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    // 2. Define our route groups
    // 2. Define our route groups
    const isAuthRoute = request.nextUrl.pathname === '/login' ||
        request.nextUrl.pathname === '/' ||
        request.nextUrl.pathname.startsWith('/onboarding') // ✅ Add it here

    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

    // Group all the standard SaaS pages together
    const isTenantRoute = request.nextUrl.pathname.startsWith('/chat') ||
        request.nextUrl.pathname.startsWith('/studio') ||
        request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/integrations')

    // 3. The Loop Fix: Boot unauthenticated users to /login instead of /
    if (!user && (isAdminRoute || isTenantRoute)) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 4. If user exists, check their RBAC role AND super admin flag
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_tessera_admin')
            .eq('id', user.id)
            .single()

        const isSuperAdmin = profile?.is_tessera_admin === true

        // 4b. Check if they belong to any organization
        const { data: tenantData } = await supabase
            .from('tenant_members')
            .select('tenant_id')
            .eq('user_id', user.id)

        const hasTenant = tenantData && tenantData.length > 0;

        // Enforce the boundary
        // If they are NOT a Super Admin, kick them out of the Control Plane
        if (isAdminRoute && !isSuperAdmin) {
            return NextResponse.redirect(new URL(hasTenant ? '/dashboard' : '/join', request.url))
        }

        // If they are trying to access a tenant route but don't belong to a tenant
        if (isTenantRoute && !isSuperAdmin && !hasTenant) {
            return NextResponse.redirect(new URL('/join', request.url))
        }

        // If they are logged in and hit the login page, send them to their respective home
        if (isAuthRoute) {
            let targetUrl = '/dashboard';
            if (isSuperAdmin) targetUrl = '/admin';
            else if (!hasTenant) targetUrl = '/join';

            return NextResponse.redirect(new URL(targetUrl, request.url))
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}