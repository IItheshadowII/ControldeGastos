"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail, AlertCircle } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            })

            const data = await res.json().catch(() => ({}))

            if (!res.ok || !data.ok) {
                throw new Error(data.error || 'Error al iniciar sesión')
            }

            // Navegación completa para cargar el dashboard ya autenticado.
            window.location.href = '/dashboard'
        } catch (e: any) {
            setError(e.message || 'Error al iniciar sesión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#000000] text-white px-8 relative overflow-hidden">
            {/* Background gradient effects */}
            <div className="absolute inset-0 bg-mesh opacity-[0.07] pointer-events-none z-0" />
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            
            <div className="relative z-10 w-full max-w-xl">
                {/* Logo/Title */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg shadow-blue-500/25">
                        <Lock className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Control de Gastos
                    </h1>
                    <p className="text-sm text-white/40">Acceso restringido</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl p-16">
                    <h2 className="text-2xl font-bold mb-12">Iniciar sesión</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div>
                            <label className="block text-sm mb-4 text-white/70 font-medium">Correo electrónico</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none">
                                    <Mail className="w-5 h-5 text-white/30" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full pl-6 pr-16 py-5 rounded-xl bg-black/40 border border-white/10 text-base focus:outline-none focus:border-blue-500 focus:bg-black/60 transition-all text-white placeholder:text-white/20"
                                    placeholder="tu@email.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm mb-4 text-white/70 font-medium">Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none">
                                    <Lock className="w-5 h-5 text-white/30" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-6 pr-16 py-5 rounded-xl bg-black/40 border border-white/10 text-base focus:outline-none focus:border-blue-500 focus:bg-black/60 transition-all text-white placeholder:text-white/20"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>
                        
                        {error && (
                            <div className="flex items-start gap-3 p-5 rounded-xl bg-red-500/10 border border-red-500/20">
                                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}
                        
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-10 px-8 py-5 rounded-xl font-bold transition-all bg-blue-600 text-white shadow-[0_0_40px_-5px_rgba(37,99,235,0.4)] hover:shadow-[0_0_50px_-5px_rgba(37,99,235,0.6)] hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-[0.1em] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
                        >
                            {loading ? 'Ingresando...' : 'Entrar'}
                        </button>
                    </form>
                    
                    <div className="mt-12 pt-8 border-t border-white/5">
                        <p className="text-xs text-white/30 text-center">
                            Acceso exclusivo para usuarios autorizados
                        </p>
                    </div>
                </div>
            </div>
        </main>
    )
}
