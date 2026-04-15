$env:DATABASE_URL="postgresql://web_accesoit:password123@localhost:5432/web_accesoit?schema=public"
Write-Host "Database URL set: $env:DATABASE_URL"
npx prisma migrate dev --name init
