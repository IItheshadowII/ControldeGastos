import * as SecureStore from 'expo-secure-store'
import { Transaction, TransactionDraft, User } from './types'

export const API_BASE_URL = 'https://gastos.accesoit.com.ar'
const TOKEN_KEY = 'finance_ai_session'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || 'No se pudo completar la operación')
    ;(error as Error & { status?: number }).status = response.status
    throw error
  }
  return payload as T
}

export async function restoreSession(): Promise<User | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY)
  if (!token) return null
  try {
    const data = await request<{ user: User }>('/api/auth/me')
    return data.user
  } catch {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    return null
  }
}

export async function login(email: string, password: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/mobile/auth/login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.token) {
    throw new Error(payload?.error || 'No se pudo iniciar sesión')
  }
  await SecureStore.setItemAsync(TOKEN_KEY, payload.token)
  return payload.user as User
}

export async function logout() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export const getTransactions = () => request<Transaction[]>('/api/transactions')

export async function saveTransaction(draft: TransactionDraft, id?: string) {
  const normalizedAmount = Number(draft.amount.replace(/\./g, '').replace(',', '.'))
  const body = {
    description: draft.description.trim(),
    amount: normalizedAmount,
    currency: draft.currency,
    type: draft.type,
    frequency: draft.frequency,
    isPaid: draft.type === 'LOAN' ? draft.loanStatus === 'PAID' : draft.type === 'INCOME' ? true : draft.isPaid,
    incomeType: draft.type === 'INCOME' ? draft.incomeType : null,
    loanType: draft.type === 'LOAN' ? draft.loanType : undefined,
    loanStatus: draft.type === 'LOAN' ? draft.loanStatus : undefined,
    loanParty: draft.type === 'LOAN' ? draft.loanParty.trim() : undefined,
  }
  return request<Transaction>(id ? `/api/transactions/${id}` : '/api/transactions', {
    method: id ? 'PATCH' : 'POST',
    body: JSON.stringify(body),
  })
}

export const setPaid = (transaction: Transaction, paid: boolean) =>
  request<Transaction>(`/api/transactions/${transaction.id}`, {
    method: 'PATCH',
    body: JSON.stringify(
      transaction.type === 'LOAN'
        ? { isPaid: paid, loanStatus: paid ? 'PAID' : 'PENDING' }
        : { isPaid: paid },
    ),
  })

export const deleteTransaction = (id: string) =>
  request<{ success: boolean }>(`/api/transactions/${id}`, { method: 'DELETE' })
