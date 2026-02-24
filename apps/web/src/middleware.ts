import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
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
                setAll(cookiesToSet: { name: string; value: string; options: any }[]) { {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

    const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
    const isWorkspaceRoute = request.nextUrl.pathname.startsWith('/workspace')

    // 2. If no user and trying to access a protected route, boot them to login
    if (!user && (isAdminRoute || isWorkspaceRoute)) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 3. If user exists, check their RBAC role in the profiles table
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const role = profile?.role || 'tenant'

        // 4. Enforce the boundary
        if (isAdminRoute && role !== 'admin') {
            // Tenants cannot access the Control Plane
            return NextResponse.redirect(new URL('/workspace', request.url))
        }

        if (isWorkspaceRoute && role === 'admin') {
            // Admins should be working in the Control Plane, not a tenant workspace
            return NextResponse.redirect(new URL('/admin', request.url))
        }

        // 5. If they are logged in and hit the login page, send them to their respective home
        if (isAuthRoute) {
            return NextResponse.redirect(new URL(role === 'admin' ? '/admin' : '/workspace', request.url))
        }
    }

    return supabaseResponse
}

// Only run middleware on specific routes to save compute
export const config = {
    matcher: [
        '/admin/:path*',
        '/workspace/:path*',
        '/login',
    ],
}