"use client"

import React, { useEffect, useState } from 'react'

export default function SettingsPage() {
  const [provider, setProvider] = useState('google')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gemini-2.0')
  const [models, setModels] = useState<string[]>([])
  const [baseUrl, setBaseUrl] = useState('https://generativelanguage.googleapis.com/v1beta')
  const [status, setStatus] = useState<string | null>(null)
  const [loadingModels, setLoadingModels] = useState(false)

  useEffect(() => {
    fetch('/api/ai/config').then(r => r.json()).then((d) => {
      if (d && d.apiKey) setApiKey(d.apiKey)
      if (d && d.modelName) setModel(d.modelName)
    }).catch(() => { })
  }, [])

  const save = async () => {
    setStatus('guardando...')
    const res = await fetch('/api/ai/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'google', apiKey, modelName: model })
    })
    const data = await res.json()
    setStatus(data.success ? 'guardado' : `error: ${data.error || 'no se pudo guardar'}`)
    setTimeout(() => setStatus(null), 3000)
  }

  const remove = async () => {
    setStatus('eliminando...')
    // No borramos de DB por ahora; sólo limpiamos el estado local.
    // (Evita borrar accidentalmente la config del usuario.)
    setApiKey('')
    setModel('')
    setStatus('limpiado')
    setTimeout(() => setStatus(null), 3000)
  }

  const loadModels = async () => {
    setLoadingModels(true)
    try {
      const res = await fetch('/api/ai/google/models')
      const data = await res.json()
      if (data.ok && Array.isArray(data.models)) {
        // normalize different shapes
        const list = data.models.map((m: any) => (m.name || m.model || m).toString())
        setModels(list)
      } else {
        setStatus(`error: ${data.error || 'no models returned'}`)
      }
    } catch (e) {
      setStatus(String(e))
    }
    setLoadingModels(false)
    setTimeout(() => setStatus(null), 2500)
  }

  const testPrompt = 'Hola, genera un saludo breve en español.'
  const runTest = async () => {
    setStatus('probando...')
    const res = await fetch('/api/ai/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: testPrompt })
    })
    const data = await res.json()
    setStatus(null)
    alert(JSON.stringify(data, null, 2))
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Configuración del Proveedor de IA</h2>

      <div className="max-w-3xl bg-white/3 p-6 rounded-xl border border-white/5 space-y-4">
        <h3 className="font-bold text-lg">Proveedor de IA</h3>
        <p className="text-sm text-white/50">Configura el modelo de lenguaje a utilizar en el chat.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-sm block mb-2">Proveedor</label>
            <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full p-3 rounded bg-black/60 border border-white/5">
              <option value="google">Google Gemini</option>
            </select>
          </div>

          <div>
            <label className="text-sm block mb-2">Modelo</label>
            <select value={model} onChange={e => setModel(e.target.value)} className="w-full p-3 rounded bg-black/60 border border-white/5">
              {models.length === 0 ? (
                <option value={model}>{model || 'Selecciona o carga modelos'}</option>
              ) : models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button onClick={loadModels} disabled={loadingModels} className="mt-3 px-4 py-2 rounded bg-gradient-to-r from-blue-500 to-violet-500 text-white">
              {loadingModels ? 'Cargando...' : 'Cargar modelos desde Google'}
            </button>
            <p className="text-xs text-white/40 mt-2">Usa tu API Key para listar los modelos disponibles. Obtén una en Google AI Studio.</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm block mb-2">API Key</label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full p-3 rounded bg-black/60 border border-white/5" placeholder="••••••••" />
        </div>

        <div className="mt-2">
          <label className="text-sm block mb-2">Base URL (Opcional)</label>
          <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className="w-full p-3 rounded bg-black/60 border border-white/5" placeholder="https://generativelanguage.googleapis.com/v1beta" />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button onClick={save} className="px-4 py-2 rounded bg-gradient-to-r from-blue-500 to-violet-500 text-white">Guardar Cambios</button>
          <button onClick={remove} className="px-4 py-2 rounded bg-white/5">Eliminar</button>
          {status && <span className="text-sm">{status}</span>}
        </div>
      </div>
    </div>
  )
}
