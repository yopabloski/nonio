# Seguridad y datos personales

## Modelo de identidad

- **Alumnos:** usan autenticación anónima de Firebase. Cada dispositivo recibe un `uid`. El registro `amaParticipantes/{correo}` guarda en `uids` los dispositivos autorizados para leer y escribir ese correo.
- **Docentes:** inician sesión con Google y deben tener un documento en `amaAdmins/{uid}`, que solo se crea desde la consola.

Como los alumnos escriben su correo y no se verifica con Google, la protección contra suplantación se apoya en tres capas:

1. **Código de acceso** vigente por momento. Hay que conocerlo para registrarse y para escribir respuestas, y se puede consultar un código concreto pero nunca listar todos.
2. **RUT como segundo factor**: un dispositivo nuevo solo puede sumarse a un correo ya registrado si escribe el mismo RUT (`rutIntento == rut`). El RUT registrado no lo puede leer quien no es miembro.
3. **Envío bloqueado**: una vez enviado, el alumno no puede modificar sus respuestas. Solo un docente puede reabrirlas, y cada reapertura queda registrada.

## Qué impide cada regla

| Regla | Evita |
|---|---|
| `amaAdmins`: `write: false` | Que alguien se autoasigne como docente |
| `amaConfig`: escritura solo docente | Que un alumno abra o cierre momentos o cambie los instrumentos |
| `amaCodigos`: `get` sí, `list` no | Que alguien enumere los códigos vigentes |
| Alta de participante: correo `@udd.cl` = ID del documento, RUT con formato, `uids == [yo]`, código vigente y solo campos permitidos | Registros con otros dominios, dueños falsos o campos inyectados |
| Actualización por miembro: solo `consentimiento`, `consentimientos` (registro por momento), `historialConsentimiento`, `codigo` y `ultimoIngreso` | Que un alumno cambie su correo, RUT, nombre o la lista de dispositivos |
| Reclamo desde otro dispositivo: solo *añadir* su uid, con RUT correcto y como máximo 10 dispositivos | Que alguien tome un correo ajeno o expulse al dueño |
| Respuestas: dueño, consentimiento aceptado, momento abierto, instrumento del momento, código del mismo momento, clave = `momento__instrumento` | Escribir fuera de plazo, sin consentimiento o en otro instrumento |
| Respuesta enviada: el alumno ya no puede actualizarla | Modificar un cuestionario después de enviarlo |
| `reaperturas`: el alumno no la puede tocar | Falsificar el historial de reaperturas |
| Lectura global de respuestas solo para docentes | Que un alumno lea las respuestas de otros |

## Límites conocidos

- Quien conozca el código y el correo de un compañero que **aún no se ha registrado** podría registrarse en su nombre. Cuando el dueño real intente entrar con su RUT, recibirá un error y avisará. Se resuelve con **Eliminar datos** en el panel.
- El consentimiento V4.0 declara que el participante puede omitir preguntas. Por eso existe la opción **Prefiero no responder**, que se activa y desactiva en Momentos. Mantenerla activa es coherente con lo aprobado por el CEII.
- **Consentimiento por momento:** cada momento tiene el interruptor *Pedir consentimiento en este momento*. Aunque esté apagado, nadie puede responder sin haber aceptado alguna vez: las reglas exigen `consentimiento.acepta == true` para escribir respuestas.
- **Retiro de datos:** en Participantes, **Eliminar datos** borra el registro, el consentimiento y todas las respuestas de esa persona.
- **Seudonimización:** la exportación puede excluir el correo, el nombre y el RUT. El ID se deriva del correo, así que es estable. La **llave de correspondencia** se descarga por separado y se guarda aparte.
