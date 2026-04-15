type Client = {
  id: string
  send: (payload: unknown) => void
  close: () => void
}

function getStore(): Set<Client> {
  const g = globalThis as any
  if (!g.__realtimeClients) g.__realtimeClients = new Set<Client>()
  return g.__realtimeClients as Set<Client>
}

export function registerRealtimeClient(client: Client) {
  const store = getStore()
  store.add(client)
  return () => {
    store.delete(client)
    try {
      client.close()
    } catch {
      // ignore
    }
  }
}

export function broadcastRealtime(event: string, data?: unknown) {
  const store = getStore()
  store.forEach((client) => {
    try {
      client.send({ event, data, ts: Date.now() })
    } catch {
      // ignore
    }
  })
}
