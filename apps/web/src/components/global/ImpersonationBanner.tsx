'use client'

import { useEffect, useState } from 'react'
import { VenetianMask, XCircle } from 'lucide-react'

function getCookie(name: string) {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
}

export default function ImpersonationBanner() {
    const [tenantName, setTenantName] = useState<string | null>(null);

    useEffect(() => {
        const impersonatedName = getCookie('tessera_impersonated_tenant_name');
        if (impersonatedName) {
            setTenantName(decodeURIComponent(impersonatedName));
        }
    }, []);

    const handleStopImpersonating = () => {
        document.cookie = 'tessera_impersonated_tenant=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'tessera_impersonated_tenant_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/admin'; // Hard reload to clear client contexts
    };

    if (!tenantName) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-4 py-2 text-white shadow-lg space-x-4 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 font-medium text-sm">
                <VenetianMask size={16} className="animate-pulse" />
                <span>Superadmin Support Mode — Impersonating: <strong className="font-bold bg-white/20 px-2 py-0.5 rounded ml-1">{tenantName}</strong></span>
            </div>
            <button
                onClick={handleStopImpersonating}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-colors border border-white/20"
            >
                <XCircle size={14} /> Stop
            </button>
        </div>
    )
}
