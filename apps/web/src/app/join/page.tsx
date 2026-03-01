import { ShieldAlert, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function JoinPage() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        redirect('/login')
    }

    // Double check they truly don't have a tenant
    const { data: tenantData } = await supabase
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', session.user.id)

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_tessera_admin')
        .eq('id', session.user.id)
        .single()

    if (profile?.is_tessera_admin) {
        redirect('/admin')
    } else if (tenantData && tenantData.length > 0) {
        redirect('/dashboard')
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert size={32} />
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-white">No Organization Found</h1>
                    <p className="text-zinc-400 mt-2 text-sm">
                        Your account ({session.user.email}) is not currently assigned to any secured Tessera OS environment.
                    </p>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-left space-y-3">
                    <h3 className="text-sm font-semibold text-zinc-300">How to get access:</h3>
                    <ul className="text-sm text-zinc-500 space-y-2">
                        <li className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 mt-1.5 shrink-0" />
                            Ask your environment administrator to invite you via the Studio control panel.
                        </li>
                        <li className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 mt-1.5 shrink-0" />
                            If you are the administrator, you can configure a new environment.
                        </li>
                    </ul>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                    <Link
                        href="/onboarding"
                        className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm"
                    >
                        Create New Environment <ArrowRight size={16} />
                    </Link>
                    <form action="/auth/signout" method="post">
                        <button className="w-full py-2.5 text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-colors">
                            Sign out and use a different account
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
