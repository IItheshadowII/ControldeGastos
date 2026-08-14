# Actualizaciones remotas de Finance AI

La versión Android 1.1.0 está vinculada al proyecto EAS `@ebanega/finance-ai` y al canal `production`.

## Publicar cambios de interfaz o lógica

```powershell
npm run update:production -- --message "Descripción del cambio"
```

La app comprueba el canal al iniciarse, descarga el cambio en segundo plano y lo aplica en el siguiente inicio. El botón de nube del encabezado permite comprobar y aplicar una actualización manualmente.

## Publicar cambios nativos

Si cambia una dependencia nativa, un permiso, Expo SDK o la configuración nativa, incrementar `expo.version` y `expo.android.versionCode` en `app.json`, y luego ejecutar:

```powershell
npm run build:android:device
```

El APK debe estar firmado con las credenciales Android guardadas en la cuenta EAS `ebanega`. No se debe crear otra clave para el paquete `com.accesoit.financeai`.

## Revertir

Los lanzamientos y reversiones se administran desde:

https://expo.dev/accounts/ebanega/projects/finance-ai
