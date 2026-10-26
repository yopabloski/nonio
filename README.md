# Nonio

*Lo que las notas no muestran, medido con cuidado.* El nonio es la pequeña escala que permite leer entre las marcas de una regla; esta plataforma hace lo mismo con variables psicoeducativas: motivación, autorregulación, autoeficacia, bienestar y estrés.

Cada estudio tiene su propio nombre dentro de la plataforma. El primero es **AMA·PERMA**, del proyecto *Predicción del rendimiento académico en Ingeniería* (ICI · UDD Concepción, cohorte 2026).

**AMA** = Autorregulación, Motivación y Autoeficacia (las variables); **PERMA** = PERMA-Profiler (el instrumento de bienestar). El estudio aplica cuatro instrumentos validados en momentos que configura el docente:

| Sigla | Instrumento | Ítems | Escala |
|---|---|---|---|
| EME-E | Escala de Motivación Educativa | 28 | 1–7 |
| IPAA | Inventario de Procesos de Autorregulación del Aprendizaje | 12 | 1–5 |
| EAPESA | Autoeficacia Percibida Específica de Situaciones Académicas | 10 | 1–4 |
| PERMA | PERMA-Profiler (V1.0 aprobada por el CEII) | 23 | 0–10 |

HTML, CSS y JS sin compilación, publicado como estático en GitHub Pages. Firebase se usa solo para Authentication y Firestore.

- `index.html`: los alumnos responden desde el celular, la tablet o el computador.
- `panel.html`: panel docente (desde computador) para configurar, hacer seguimiento, analizar y exportar.

## Probar sin Firebase (modo demo)

```bash
npm run serve        # http://localhost:5173
npm test             # pruebas de dominio (puntajes, RUT, exportación)
```

Mientras `js/services/firebase-config.js` no tenga `apiKey`, todo se guarda en el `localStorage` del navegador:

1. Abre `panel.html` → **Momentos** → pon Momento 1 en **Abierto**.
2. En otra pestaña abre `index.html` y entra con cualquier correo @udd.cl, un RUT válido y el código `DEMO-M1`.
3. Para ver los análisis con datos, usa **Cargar datos de ejemplo** en el panel.

**Para publicar, sigue `docs/PUESTA_EN_MARCHA.md`.**

## Diseño contrabalanceado (protocolo V7.0, aprobado el 14-10-2026)

- **Bloque A** = EME-E + EAPESA (38 ítems) · **Bloque B** = PERMA-Profiler + IPAA (35 ítems).
- **Orden 1** responde A en la sesión 1 y B en la sesión 2; **Orden 2**, al revés. Sesiones separadas por al menos una semana.
- **Nómina** (panel → Nómina): se cargan las listas de curso (varias a la vez; la sección sale del nombre del archivo) y se **aleatoriza** (simple, p = 1/2, con semilla registrada). Se descarga el registro de aleatorización.
- Quien entra sin estar en la nómina recibe un orden al azar en ese momento (origen "al entrar").
- El estudiante entra con el código de la sesión y ve **solo su bloque**. Las reglas de Firestore impiden responder instrumentos de otro bloque.
- Exportación: columnas `SECCION`, `ORDEN`, `SECUENCIA`, `BLOQUE` (por sesión) y `CI_EXCLUYE_MAYO`; opción de una fila por estudiante.
- Análisis: tarjeta "Efecto de orden" (O1 vs O2 por variable general).

## Flujo del alumno

Correo @udd.cl + nombre + RUT + código de acceso → consentimiento informado V4.0 (se registra si acepta o rechaza, la casilla de exclusión de mayo, fecha, hora, versión y momento). Quien nunca ha respondido el consentimiento lo ve siempre; además, cada momento puede configurarse para pedirlo de nuevo → cuestionarios del momento abierto → autoguardado → envío con confirmación. Después del envío el cuestionario queda bloqueado y solo un docente puede reabrirlo.

## Dónde vive cada cosa

| Archivo | Rol |
|---|---|
| `js/domain/instrumentos.js` | **Fuente única** de ítems, escalas, dimensiones y notas |
| `js/domain/puntajes.js` | Recodificación, puntajes, α, ω aproximado, correlaciones |
| `js/domain/estadistica.js` | Estadística validada contra R: Shapiro-Wilk, policóricas, α/ω, AFE, regresión, k-medias |
| `js/domain/analitica.js` | Variables generales, calidad de respuesta, preparación de datos |
| `js/ui/analisis.js` | Vistas de Análisis (cohorte, instrumento, relaciones, perfiles, calidad) |
| `js/domain/exportar.js` | Bases cruda y recodificada, CSV, sintaxis SPSS, libro de códigos |
| `js/domain/consentimiento.js` | Texto literal del consentimiento V4.0 (timbrado 14-10-2026) |
| `js/domain/identidad.js` | Validación de correo, RUT y código |
| `js/services/store.js` | Fachada: Firebase o demo local |
| `js/services/remote-store.js` | Adaptador Firestore |
| `js/services/local-store.js` | Modo demo (localStorage) |
| `firestore.rules` | Reglas de seguridad (ver `docs/SEGURIDAD.md`) |
| `docs/LIBRO_DE_CODIGOS.md` | Generado con `npm run libro` |

## Documentación

| Documento | Para qué |
|---|---|
| `docs/PUESTA_EN_MARCHA.md` | Crear el proyecto Firebase, reglas, docentes y GitHub Pages |
| `docs/ANALISIS.md` | Qué calcula cada vista de Análisis, métodos y umbrales |
| `docs/SEGURIDAD.md` | Qué protege cada regla y sus límites |
| `docs/LIBRO_DE_CODIGOS.md` | Variables, ítems y cálculo de puntajes |
| `docs/DISENO.md` | Identidad visual y paleta |
