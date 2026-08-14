export type TransactionType = 'INCOME' | 'EXPENSE' | 'LOAN'

export type Transaction = {
  id: string
  description: string
  amount: number
  currency: 'ARS' | 'USD'
  type: TransactionType
  date: string
  category?: string | null
  frequency: 'VARIABLE' | 'FIXED'
  incomeType?: 'BLANCO' | 'NEGRO' | null
  isPaid: boolean
  isSavings: boolean
  loanType?: 'LENT' | 'BORROWED' | null
  loanStatus?: 'PENDING' | 'PAID' | null
  loanParty?: string | null
  loanInstallments?: number | null
  loanNotes?: string | null
}

export type User = {
  id: string
  name: string | null
  email: string | null
}

export type TransactionDraft = {
  description: string
  amount: string
  category: string
  currency: 'ARS' | 'USD'
  type: TransactionType
  frequency: 'VARIABLE' | 'FIXED'
  isPaid: boolean
  isSavings: boolean
  incomeType: 'BLANCO' | 'NEGRO'
  loanType: 'LENT' | 'BORROWED'
  loanStatus: 'PENDING' | 'PAID'
  loanParty: string
}

export type TicketScanResult = {
  description: string
  amount: number
  currency: 'ARS' | 'USD'
  category: string
}
