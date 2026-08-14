# Finance AI para Android

Aplicación móvil de Control de Gastos construida con Expo y React Native.

## Funciones incluidas

- Inicio de sesión con la cuenta de la web.
- Dashboard mensual con balance, ingresos, gastos y ahorro.
- Alta de gastos, ingresos y préstamos.
- Búsqueda y filtros de movimientos.
- Edición y eliminación de movimientos.
- Cambio rápido entre pagado y pendiente.
- Sesión cifrada en el almacenamiento seguro de Android.

## Ejecutar para desarrollo

```bash
npm install
npm run android
```

## Generar un APK de prueba

Después de iniciar sesión en una cuenta de Expo:

```bash
npx eas-cli build --platform android --profile preview
```

El perfil `preview` genera un APK instalable. El perfil `production` genera el AAB para Google Play.
