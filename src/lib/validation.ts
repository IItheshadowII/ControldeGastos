import { z } from 'zod'

// Schema para transacciones
export const transactionSchema = z.object({
  description: z.string()
    .min(3, 'La descripción debe tener al menos 3 caracteres')
    .max(100, 'La descripción no puede exceder 100 caracteres'),
  
  amount: z.string()
    .min(1, 'El monto es requerido')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Ingresa un monto válido mayor a 0'),
  
  category: z.string()
    .min(1, 'La categoría es requerida'),
  
  type: z.enum(['income', 'expense'], {
    message: 'El tipo debe ser ingreso o gasto',
  }),
  
  date: z.string()
    .min(1, 'La fecha es requerida')
    .or(z.date()),

  isPaid: z.boolean().optional().default(false),
})

export type TransactionFormData = z.infer<typeof transactionSchema>

// Schema para configuración de IA
export const aiConfigSchema = z.object({
  apiKey: z.string()
    .min(1, 'La API key es requerida')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Formato de API key inválido'),
  
  provider: z.enum(['openai', 'gemini'], {
    message: 'Selecciona un proveedor válido',
  }),
  
  enableRecommendations: z.boolean().default(true),
  
  monthlyBudget: z.number()
    .min(0, 'El presupuesto debe ser positivo')
    .optional(),
})

export type AIConfigFormData = z.infer<typeof aiConfigSchema>

// Validación de montos
export const validateAmount = (value: string): number | null => {
  const cleaned = value.replace(/[^0-9.]/g, '')
  const parsed = parseFloat(cleaned)
  
  if (isNaN(parsed)) return null
  return parsed
}

// Validación de fechas
export const validateDate = (dateString: string): boolean => {
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

// Categorías permitidas
export const CATEGORIES = [
  'Alimentación',
  'Transporte',
  'Entretenimiento',
  'Salud',
  'Educación',
  'Servicios',
  'Compras',
  'Ahorros',
  'Otros',
] as const

export type Category = typeof CATEGORIES[number]
