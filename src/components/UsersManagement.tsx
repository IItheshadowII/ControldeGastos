"use client"

import { useEffect, useState } from "react"
import { Card, Button } from "@/components/ui-glass"

type UserRow = {
    id: string
    name: string | null
    email: string | null
    isActive: boolean
    isAdmin: boolean
}

export function UsersManagement() {
    const [users, setUsers] = useState<UserRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isAdmin, setIsAdmin] = useState(false)

    const load = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/users')
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'No se pudo cargar la lista de usuarios')
            }
            const data = await res.json()
            setUsers(data)
        } catch (e: any) {
            setError(e.message || 'Error cargando usuarios')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, isAdmin }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'No se pudo crear el usuario')
            setName("")
            setEmail("")
            setPassword("")
            setIsAdmin(false)
            await load()
        } catch (e: any) {
            setError(e.message || 'Error creando usuario')
        }
    }

    const toggleActive = async (user: UserRow) => {
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !user.isActive }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el usuario')
            await load()
        } catch (e: any) {
            alert(e.message || 'Error actualizando usuario')
        }
    }

    const resetPassword = async (user: UserRow) => {
        const pwd = window.prompt(`Nueva contraseña para ${user.email}`)
        if (!pwd) return
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'No se pudo cambiar la contraseña')
            alert('Contraseña actualizada')
        } catch (e: any) {
            alert(e.message || 'Error cambiando contraseña')
        }
    }

    const removeUser = async (user: UserRow) => {
        if (!window.confirm(`¿Eliminar usuario ${user.email}?`)) return
        try {
            const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'No se pudo eliminar el usuario')
            await load()
        } catch (e: any) {
            alert(e.message || 'Error eliminando usuario')
        }
    }

    return (
        <div className="space-y-8">
            <Card className="p-6 bg-white/[0.02] border-white/10 rounded-3xl">
                <h2 className="text-lg font-bold mb-4">Crear usuario</h2>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs text-white/50 mb-1">Nombre</label>
                        <input
                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-white/50 mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-white/50 mb-1">Contraseña</label>
                        <input
                            type="password"
                            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-xs text-white/50">Admin</label>
                        <input
                            type="checkbox"
                            checked={isAdmin}
                            onChange={e => setIsAdmin(e.target.checked)}
                        />
                    </div>
                    <div className="md:col-span-4 flex justify-end">
                        <Button type="submit">Crear usuario</Button>
                    </div>
                </form>
                {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            </Card>

            <Card className="p-6 bg-white/[0.02] border-white/10 rounded-3xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Usuarios registrados</h2>
                    {loading && <span className="text-xs text-white/40">Cargando...</span>}
                </div>
                <div className="space-y-2">
                    {users.map(u => (
                        <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl bg-black/30 border border-white/5 text-sm">
                            <div className="flex flex-col">
                                <span className="font-semibold">{u.name || u.email}</span>
                                <span className="text-xs text-white/40">{u.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                                <span className={u.isActive ? 'text-emerald-400' : 'text-red-400'}>
                                    {u.isActive ? 'Activo' : 'Deshabilitado'}
                                </span>
                                <span className={u.isAdmin ? 'text-blue-400' : 'text-white/40'}>
                                    {u.isAdmin ? 'Admin' : 'Normal'}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="primary" onClick={() => resetPassword(u)}>
                                    Cambiar contraseña
                                </Button>
                                <Button variant="secondary" onClick={() => toggleActive(u)}>
                                    {u.isActive ? 'Deshabilitar' : 'Habilitar'}
                                </Button>
                                <Button variant="danger" onClick={() => removeUser(u)}>
                                    Eliminar
                                </Button>
                            </div>
                        </div>
                    ))}
                    {users.length === 0 && !loading && (
                        <p className="text-xs text-white/40">No hay usuarios registrados.</p>
                    )}
                </div>
            </Card>
        </div>
    )
}
