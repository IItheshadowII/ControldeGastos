"use client"

import React, { useState, useEffect } from 'react'
import { Card, Button } from '@/components/ui-glass'
import { Settings, Save, Key, Database } from 'lucide-react'

export default function AIConfigPage() {
    const [provider, setProvider] = useState('google')
    const [apiKey, setApiKey] = useState('')
    const [loading, setLoading] = useState(false)

    const saveConfig = async () => {
        setLoading(true)
        try {
            await fetch('/api/ai/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, apiKey }),
            })
            alert("Configuración guardada!")
        } catch (e) {
            alert("Error al guardar")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                    <Settings className="w-8 h-8 text-blue-400" /> Configuración de IA
                </h1>

                <Card className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium opacity-70">Proveedor de IA</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setProvider('google')}
                                className={`p-4 rounded-xl border transition-all ${provider === 'google' ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/10 opacity-50'}`}
                            >
                                Google Gemini
                            </button>
                            <button
                                onClick={() => setProvider('openai')}
                                className={`p-4 rounded-xl border transition-all ${provider === 'openai' ? 'bg-purple-600/20 border-purple-500' : 'bg-white/5 border-white/10 opacity-50'}`}
                            >
                                OpenAI GPT-4o
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium opacity-70 flex items-center gap-2">
                            <Key className="w-4 h-4" /> API Key
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Ingresa tu API Key..."
                            className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs opacity-40">Tus datos se almacenan de forma segura en tu base de datos local.</p>
                    </div>

                    <Button onClick={saveConfig} className="w-full" variant="primary">
                        {loading ? 'Guardando...' : 'Guardar Configuración'}
                        <Save className="w-4 h-4 ml-2 inline" />
                    </Button>
                </Card>
            </div>
        </div>
    )
}
