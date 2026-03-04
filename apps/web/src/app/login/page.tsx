import { Network, Fingerprint, Lock, Mail, ArrowRight, UserPlus } from "lucide-react"
import { login } from "./actions"
import Link from "next/link"

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 relative overflow-hidden font-sans">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Logo Area */}
                <div className="flex flex-col items-center justify-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                        <Network size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Welcome Back</h1>
                    <p className="text-zinc-400 font-medium">Authenticate to the Orchestration Engine</p>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
                    <form action={login} className="space-y-6">
                        <div className="space-y-4">

                            {/* Email Input */}
                            <div className="space-y-1.5">
                                <label htmlFor="email" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-4 w-4 text-zinc-500" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="founder@company.com"
                                        required
                                        className="w-full pl-11 pr-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-zinc-100 transition-all font-mono text-sm"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="space-y-1.5">
                                <label htmlFor="password" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-zinc-500" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        className="w-full pl-11 pr-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none text-zinc-100 transition-all font-mono text-sm tracking-widest"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-6">
                            <button
                                type="submit"
                                className="group w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]"
                            >
                                <Fingerprint size={18} className="group-hover:scale-110 transition-transform" />
                                Authenticate
                            </button>

                            <Link
                                href="/onboarding"
                                className="w-full flex justify-center items-center gap-2 bg-transparent border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-medium py-3 px-4 rounded-xl transition-colors"
                            >
                                <UserPlus size={16} />
                                Create Account
                            </Link>
                        </div>
                    </form>
                </div>

                <div className="text-center mt-8">
                    <Link href="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2">
                        <ArrowRight size={14} className="rotate-180" /> Return to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}