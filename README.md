# IPTV Monitor Android

Aplicación Android nativa en Kotlin y Jetpack Compose para consultar información de cuentas IPTV en servidores compatibles.

## Funciones del MVP

- Modo de consulta individual y modo múltiple (una URL por línea).
- Reconocimiento de URL con parámetros `username` y `password`.
- Consulta de información mediante el endpoint compatible `player_api.php`.
- Ficha con estado, vencimiento, días restantes, conexiones, formatos y datos del servidor cuando la API los proporciona.
- Distinción entre datos ausentes, errores HTTP y falta de respuesta.
- Resultados en memoria durante la sesión.

## Limitaciones actuales

- No todas las listas M3U exponen una API de cuenta. Las URL genéricas no pueden proporcionar automáticamente vencimiento ni conexiones.
- Los campos disponibles dependen del proveedor y de su implementación de la API.
- Persistencia local y almacenamiento cifrado de credenciales pendientes.
- Las consultas por lote se realizan secuencialmente para reducir la carga sobre los servidores.
- No se ha generado ni verificado un APK en este entorno; abre el proyecto en Android Studio y sincroniza Gradle para compilarlo.

## Compilar

1. Abre el repositorio en Android Studio.
2. Usa JDK 17.
3. Sincroniza Gradle.
4. Ejecuta la configuración `app` en un emulador o dispositivo.

## Seguridad

No subas URL reales con contraseñas al repositorio. La app no muestra la contraseña en la ficha, pero esta versión inicial aún no incluye almacenamiento cifrado persistente. Las URL se manejan en memoria durante la sesión.

## Rama de desarrollo

`feature/account-detail-compose`
