'use client';

import React from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming ShadCN utility or standard classname manipulation

export default function NotificationModal() {
    const { isOpen, title, message, type, hideNotification } = useNotificationStore();

    if (!isOpen) return null;

    const iconMap = {
        success: <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />,
        error: <AlertCircle className="text-red-500 shrink-0" size={24} />,
        info: <Info className="text-blue-500 shrink-0" size={24} />,
    };

    const borderMap = {
        success: "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
        error: "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]",
        info: "border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]",
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-top justify-center pt-8 bg-transparent pointer-events-none">
            <div className={cn(
                "relative flex items-start gap-4 p-5 max-w-sm w-full mx-4 rounded-xl",
                "bg-zinc-950/80 backdrop-blur-2xl border pointer-events-auto",
                "transition-all duration-500 animate-in fade-in slide-in-from-top-10 zoom-in-95",
                borderMap[type]
            )}>
                {iconMap[type]}

                <div className="flex-1 flex flex-col pt-0.5">
                    {title && <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>}
                    <p className="text-sm text-zinc-400 mt-1 leading-relaxed truncate whitespace-normal">
                        {message}
                    </p>
                </div>

                <button
                    onClick={hideNotification}
                    className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors shrink-0 -mt-1 -mr-1"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
