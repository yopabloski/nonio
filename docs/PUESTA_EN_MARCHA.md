# Puesta en marcha

Calcula unos 30 minutos. Solo hay que hacerlo una vez.

## 1. Proyecto Firebase dedicado

1. En <https://console.firebase.google.com> crea un proyecto nuevo, por ejemplo `nonio-udd`. No necesitas Google Analytics.
2. **Build → Firestore Database → Create database**, en modo *production* y con ubicación `southamerica-east1` (São Paulo), que es la más cercana a Chile.
3. **Build → Authentication → Get started** y activa estos dos proveedores:
   - **Anonymous**: lo usan los alumnos. Da a cada dispositivo una identidad técnica; la identidad de investigación es el correo que escriben.
   - **Google**: lo usan los docentes.
4. **Authentication → Settings → Authorized domains**: agrega `TU-USUARIO.github.io`.
5. **Configuración del proyecto → Tus apps → Web (`</>`)**: registra la app y copia `apiKey`, `authDomain`, `projectId` y `appId` en `js/services/firebase-config.js`.

> Estos valores no son secretos: la seguridad la dan las reglas del paso 2.

## 2. Reglas de seguridad

En **Firestore → Rules**, pega el contenido de `firestore.rules` y publica. También puedes hacerlo con la CLI:

```bash
npm i -g firebase-tools
firebase login
firebase use --add            # elige el proyecto
firebase deploy --only firestore:rules
```

## 3. Padrón docente

1. Abre `panel.html` publicado y entra con tu cuenta de Google. Como aún no estás en el padrón, verás un mensaje con tu **UID**.
2. En **Firestore → Data**, crea la colección `amaAdmins` y agrega un documento cuyo **ID sea ese UID**. Basta con un campo, por ejemplo `email: "tu@gmail.com"`.
3. Vuelve a entrar. Repite estos pasos por cada docente (por ejemplo, Sebastián).

El padrón solo se puede modificar desde la consola: ninguna cuenta puede autoasignarse como docente desde el navegador.

## 4. GitHub Pages

```bash
cd Encuestas/nonio
git init && git add . && git commit -m "Nonio v1 · estudio AMA·PERMA"
gh repo create nonio --private --source . --push   # o créalo desde github.com
```

En el repositorio: **Settings → Pages → Deploy from a branch → `main` / root**. La URL queda como `https://TU-USUARIO.github.io/nonio/`.

> GitHub Pages en un repositorio **privado** requiere un plan pago de GitHub. Si el repositorio es público, el código queda visible, pero no los datos: esos viven en Firestore, protegidos por las reglas. El repositorio no incluye datos personales.

## 5. Antes de cada aplicación

1. **Panel → Momentos**: revisa los instrumentos del momento, genera un código y presiona **Guardar código**.
2. Cambia el momento a **Abierto**.
3. Comparte con los alumnos el **enlace directo** (`…/?codigo=XXXX`), que ya trae el código escrito, o anota el código en la pizarra.
4. Sigue el avance en **Resumen** y **Participantes**.
5. Al terminar, cambia el momento a **Cerrado** y descarga los datos en **Exportar**.

## Emuladores (opcional)

```bash
firebase emulators:start --only auth,firestore
# abre http://localhost:5173/index.html?emu=1
```

## Recomendaciones

- Prueba el flujo completo con 2 o 3 cuentas antes de la aplicación real.
- El panel docente y la app del alumno mantienen sesiones separadas, así que se pueden usar en el mismo navegador. Para probar como dos alumnos distintos, usa una ventana de incógnito.
- Descarga un **Respaldo completo (.json)** después de cerrar cada momento.
