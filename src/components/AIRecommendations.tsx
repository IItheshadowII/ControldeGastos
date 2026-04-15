"use client"

import React, { useState, useEffect } from 'react'
import { Card, Button } from './ui-glass'
import { Sparkles, Loader2, ArrowRight } from 'lucide-react'

export const AIRecommendations = () => {
    const [recommendations, setRecommendations] = useState<string[]>([])
    const [loading, setLoading] = useState(false)

    const fetchRecommendations = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/ai/recommendations')
            const data = await res.json()
            setRecommendations(data.recommendations || [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    // Obtener un consejo automáticamente al montar el componente
    useEffect(() => {
        fetchRecommendations()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <Card className="h-full border-blue-500/20 bg-blue-500/5">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-400" /> IA Consejero
                </h3>
                <Button
                    variant="secondary"
                    onClick={fetchRecommendations}
                    className="text-xs py-1 px-3"
                    disabled={loading}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Actualizar'}
                </Button>
            </div>

            <div className="space-y-4">
                {recommendations.length > 0 ? (
                    recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-3 p-3 bg-white/5 rounded-xl border border-white/5 text-sm">
                            <div className="mt-1"><ArrowRight className="w-4 h-4 text-blue-400" /></div>
                            <p className="opacity-80">{rec}</p>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 opacity-40">
                        <p className="text-sm">¿Necesitas ayuda con tus finanzas?</p>
                        <p className="text-xs">Usa el botón para obtener consejos personalizados.</p>
                    </div>
                )}
            </div>
        </Card>
    )
}
