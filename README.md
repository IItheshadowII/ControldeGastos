# Family Expense Control - WebApp

Pequeña guía para trabajar con el repo y desplegar en EasyPanel / Docker.

Requisitos:
- Node 20
- Docker & Docker Compose (para despliegue local)

Desarrollo local:

```bash
cd WebApp
npm install
npm run dev
```

Levantar con Docker (desarrollo):

```bash
docker compose up --build -d
```

Subir a GitHub:

1. Crear repo en GitHub.
2. Agregar remote y push:

```bash
git remote add origin git@github.com:TU_USUARIO/TU_REPO.git
git branch -M main
git push -u origin main
```

Workflow CI:
- `.github/workflows/ci.yml` construye la imagen y la publica en GHCR.

Despliegue en EasyPanel:
- Puedes apuntar EasyPanel al `docker-compose.yml` del repo o a la imagen en GHCR/Docker Hub.
- Asegúrate de configurar volúmenes (persistencia de Prisma) y variables de entorno.
