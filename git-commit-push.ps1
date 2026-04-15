# Script para hacer commit y push de los cambios de préstamos
Write-Host "Inicializando commit y push de cambios de préstamos..."

# Verificar si git está inicializado
if (!(Test-Path .git)) {
    Write-Host "Inicializando repositorio git..."
    git init
}

# Verificar remote
$remoteExists = git remote get-url origin 2>$null
if (!$remoteExists) {
    Write-Host "Agregando remote origin..."
    git remote add origin https://github.com/IItheshadowII/ControldeGastos.git
}

# Agregar archivos
Write-Host "Agregando archivos..."
git add .

# Verificar si hay cambios para commit
$status = git status --porcelain
if ($status) {
    Write-Host "Haciendo commit..."
    git commit -m "feat: Agregar funcionalidad completa de préstamos

- Agregar campos de préstamos al esquema de Prisma
- Actualizar APIs para manejar préstamos
- Reescribir TransactionForm con soporte completo para LOAN
- Agregar widget de préstamos en dashboard
- Implementar filtros y gestión de estado de préstamos
- Integrar modal de préstamos con UI violeta"

    Write-Host "Haciendo push..."
    git push -u origin main
    Write-Host "¡Push completado exitosamente!"
} else {
    Write-Host "No hay cambios para commit"
}