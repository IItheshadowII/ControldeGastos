# Migración de Base de Datos - Campo isPaid

## ⚠️ IMPORTANTE: Pasos para aplicar la migración

La base de datos necesita ser actualizada para agregar el campo `isPaid` a las transacciones.

### Opción 1: Reiniciar la base de datos (DESARROLLO)

1. **Detener el servidor de desarrollo:**
   ```bash
   # Presiona Ctrl+C en la terminal donde corre npm run dev
   ```

2. **Eliminar la base de datos actual:**
   ```bash
   # En Windows PowerShell
   Remove-Item .\prisma\dev.db
   ```

3. **Aplicar el nuevo schema:**
   ```bash
   npx prisma db push
   ```

4. **Reiniciar el servidor:**
   ```bash
   npm run dev
   ```

### Opción 2: Migración sin perder datos (PRODUCCIÓN)

1. **Detener el servidor:**
   ```bash
   # Ctrl+C en la terminal
   ```

2. **Crear y aplicar migración:**
   ```bash
   npx prisma migrate dev --name add_is_paid_field
   ```

3. **Reiniciar el servidor:**
   ```bash
   npm run dev
   ```

## Cambios Realizados

### Schema de Base de Datos
- ✅ Agregado campo `isPaid Boolean @default(false)` al modelo Transaction
- Este campo rastrea si un gasto ha sido pagado o no

### Componentes Actualizados

1. **TransactionForm.tsx**
   - ✅ Agregado estado `isPaid`
   - ✅ Checkbox visual para marcar gastos como pagados/pendientes
   - ✅ El campo se envía en el POST a `/api/transactions`

2. **MonthlyOverview.tsx**
   - ✅ Indicador verde pulsante para gastos pagados
   - ✅ Indicador amarillo para gastos pendientes
   - ✅ Etiqueta "Pendiente" visible en gastos no pagados

### Funcionalidad
- Los **ingresos** siempre se marcan como `isPaid: true` automáticamente
- Los **gastos** pueden marcarse como pagados o pendientes
- El estado se visualiza en el resumen mensual con colores distintivos:
  - 🟢 Verde = Pagado
  - 🟡 Amarillo = Pendiente

## Próximos Pasos Sugeridos

1. Agregar filtro en la vista de Transacciones para ver solo pendientes
2. Agregar botón de "marcar como pagado" en la lista de transacciones
3. Agregar estadísticas de gastos pendientes vs pagados
4. Notificaciones para gastos próximos a vencer (si se agrega fecha de vencimiento)
