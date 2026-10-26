# Nonio · estudio AMA·PERMA · Libro de códigos

> Generado automáticamente desde `js/domain/instrumentos.js`. No editar a mano: cambie la fuente y ejecute `npm run libro`.

## Convenciones

- Una fila por participante y momento. Llave de cruce con datos académicos: `CORREO`. `ID` es un seudónimo estable derivado del correo.
- "Prefiero no responder": vacío en Excel/CSV/JASP; `-99` declarado como perdido en SPSS.
- Puntajes: promedio simple de los ítems, en la métrica original. Queda vacío si falta más del 25 % de los ítems de esa puntuación.
- Ningún instrumento tiene ítems inversos.

## EME-E · Escala de Motivación Educativa

**Constructo:** Motivación. **Referencia:** Vallerand et al. (1989, 1992); adaptación de Núñez, Martín-Albo y Navarro (2005).

**Enunciado:** ¿Por qué vas a la universidad?

**Instrucciones:** A continuación encontrarás una serie de razones por las que las personas estudian en la universidad. Indica en qué medida cada una corresponde a una de las razones por las que tú vas a la universidad. No hay respuestas correctas ni incorrectas.

**Escala:** 1 = No se corresponde en absoluto · 2 · 3 · 4 = Se corresponde medianamente · 5 · 6 · 7 = Se corresponde totalmente

| Variable | N° | Código | Enunciado | Anclas |
|---|---|---|---|---|
| `EME_01` | 1 |  | Porque sólo con el Bachillerato o la Formación Profesional no podría encontrar un empleo bien pagado. |  |
| `EME_02` | 2 |  | Porque para mí es un placer y una satisfacción aprender cosas nuevas. |  |
| `EME_03` | 3 |  | Porque pienso que los estudios universitarios me ayudarán a preparar mejor la carrera profesional que he elegido. |  |
| `EME_04` | 4 |  | Por los intensos momentos que vivo cuando comunico mis propias ideas a los demás. |  |
| `EME_05` | 5 |  | Sinceramente no lo sé; verdaderamente, tengo la impresión de perder el tiempo en la Universidad. |  |
| `EME_06` | 6 |  | Por la satisfacción que siento cuando me supero en mis estudios. |  |
| `EME_07` | 7 |  | Para demostrarme que soy capaz de terminar una carrera universitaria. |  |
| `EME_08` | 8 |  | Para poder conseguir en el futuro un trabajo más prestigioso. |  |
| `EME_09` | 9 |  | Por el placer de descubrir cosas nuevas desconocidas para mí. |  |
| `EME_10` | 10 |  | Porque posiblemente me permitirá entrar en el mercado laboral dentro del campo que a mí me guste. |  |
| `EME_11` | 11 |  | Por el placer de leer autores interesantes. |  |
| `EME_12` | 12 |  | En su momento, tuve buenas razones para ir a la Universidad; pero, ahora me pregunto si debería continuar en ella. |  |
| `EME_13` | 13 |  | Por la satisfacción que siento al superar cada uno de mis objetivos personales. |  |
| `EME_14` | 14 |  | Porque aprobar en la Universidad me hace sentirme importante. |  |
| `EME_15` | 15 |  | Porque en el futuro quiero tener una «buena vida». |  |
| `EME_16` | 16 |  | Por el placer de saber más sobre las asignaturas que me atraen. |  |
| `EME_17` | 17 |  | Porque me ayudará a elegir mejor mi orientación profesional. |  |
| `EME_18` | 18 |  | Por el placer que experimento al sentirme completamente absorbido por lo que ciertos autores han escrito. |  |
| `EME_19` | 19 |  | No sé porqué voy a la Universidad y francamente, me trae sin cuidado. |  |
| `EME_20` | 20 |  | Por la satisfacción que siento cuando logro realizar actividades académicas difíciles. |  |
| `EME_21` | 21 |  | Para demostrarme que soy una persona inteligente. |  |
| `EME_22` | 22 |  | Para tener un sueldo mejor en el futuro. |  |
| `EME_23` | 23 |  | Porque mis estudios me permiten continuar aprendiendo un montón de cosas que me interesan. |  |
| `EME_24` | 24 |  | Porque creo que unos pocos años más de estudios van a mejorar mi competencia como profesional. |  |
| `EME_25` | 25 |  | Porque me gusta «meterme de lleno» cuando leo diferentes temas interesantes. |  |
| `EME_26` | 26 |  | No lo sé; no consigo entender qué hago en la Universidad. |  |
| `EME_27` | 27 |  | Porque la Universidad me permite sentir la satisfacción personal en la búsqueda de la perfección dentro de mis estudios. |  |
| `EME_28` | 28 |  | Porque quiero demostrarme que soy capaz de tener éxito en mis estudios. |  |

| Puntuación | Nombre | Cálculo |
|---|---|---|
| `EME_RegulacionExterna` | Regulación externa | promedio de ítems 1, 8, 15, 22 |
| `EME_MI_Conocimiento` | MI al conocimiento | promedio de ítems 2, 9, 16, 23 |
| `EME_RegulacionIdentificada` | Regulación identificada | promedio de ítems 3, 10, 17, 24 |
| `EME_MI_ExpEstimulantes` | MI a experiencias estimulantes | promedio de ítems 4, 11, 18, 25 |
| `EME_Amotivacion` | Amotivación | promedio de ítems 5, 12, 19, 26 |
| `EME_MI_Logro` | MI al logro | promedio de ítems 6, 13, 20, 27 |
| `EME_RegulacionIntroyectada` | Regulación introyectada | promedio de ítems 7, 14, 21, 28 |
| `EME_MI_Global` | Motivación intrínseca global | promedio de `EME_MI_Conocimiento`, `EME_MI_ExpEstimulantes`, `EME_MI_Logro` |

*Sin ítems inversos. No se calcula ME global ni RAI (el continuo de autodeterminación no se sostuvo en la muestra de mayo): se reporta el perfil de 7 subescalas. Desde octubre de 2026 se usa la versión oficial de Núñez et al. (2005), Tabla 3, con anclas solo en 1, 4 y 7; en mayo de 2026 se usó otra redacción y anclas en los 7 puntos, por lo que el cambio entre semestres debe interpretarse con cautela.*

## IPAA · Inventario de Procesos de Autorregulación del Aprendizaje

**Constructo:** Autorregulación. **Referencia:** Rosário et al. (2007); estructura chilena de Bruna et al. (2017).

**Enunciado:** ¿Con qué frecuencia haces lo siguiente?

**Instrucciones:** Lee cada afirmación e indica con qué frecuencia la realizas cuando estudias. No hay respuestas correctas ni incorrectas.

**Escala:** 1 = Nunca · 2 = Casi nunca · 3 = Regularmente · 4 = Casi siempre · 5 = Siempre

| Variable | N° | Código | Enunciado | Anclas |
|---|---|---|---|---|
| `IPAA_01` | 1 |  | Hago un plan antes de comenzar a hacer un trabajo escrito. Pienso lo que voy a hacer y lo que necesito para conseguirlo. |  |
| `IPAA_02` | 2 |  | Después de terminar un examen parcial/final, lo reviso mentalmente para saber dónde tuve los aciertos y errores y, hacerme una idea de la nota que voy a tener. |  |
| `IPAA_03` | 3 |  | Cuando estudio, intento comprender las materias, tomar apuntes, hacer resúmenes, resolver ejercicios, hacer preguntas sobre los contenidos. |  |
| `IPAA_04` | 4 |  | Cuando recibo una nota, suelo pensar en cosas concretas que tengo que hacer para mejorar mi rendimiento/ nota media. |  |
| `IPAA_05` | 5 |  | Estoy seguro de que soy capaz de comprender lo que me van a enseñar y por eso creo que voy a tener buenas notas |  |
| `IPAA_06` | 6 |  | Cumplo mis horarios de estudio, e introduzco pequeños cambios siempre que es necesario |  |
| `IPAA_07` | 7 |  | Guardo y analizo las correcciones de los trabajos escritos o pruebas parciales, para ver dónde me equivoqué y saber qué tengo que cambiar para mejorar |  |
| `IPAA_08` | 8 |  | Mientras estoy en clase o estudiando, si me distraigo o pierdo el hilo, suelo hacer algo para volver a la tarea y alcanzar mis objetivos |  |
| `IPAA_09` | 9 |  | Establezco objetivos académicos concretos para cada asignatura |  |
| `IPAA_10` | 10 |  | Busco un sitio tranquilo y donde pueda estar concentrado para estudiar |  |
| `IPAA_11` | 11 |  | Comparo las notas que saco con los objetivos que me había marcado para esa asignatura |  |
| `IPAA_12` | 12 |  | Antes de comenzar a estudiar, compruebo si tengo todo lo que necesito: diccionarios, libros, lápices, cuadernos, fotocopias, para no estar siempre interrumpiendo mi estudio |  |

| Puntuación | Nombre | Cálculo |
|---|---|---|
| `IPAA_Total` | Autorregulación total (12 ítems) | promedio de ítems 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |
| `IPAA_Planificacion` | Planificación | promedio de ítems 1, 10, 12 |
| `IPAA_Ejecucion` | Ejecución | promedio de ítems 3, 5, 6, 8 |
| `IPAA_Evaluacion` | Evaluación | promedio de ítems 2, 4, 7, 9, 11 |

*Sin ítems inversos. Subescalas según Tabla 8 de Bruna et al. (2017).*

## EAPESA · Escala de Autoeficacia Percibida Específica de Situaciones Académicas

**Constructo:** Autoeficacia. **Referencia:** Palenzuela (1983); validación chilena de Del Valle, Díaz, Pérez y Vergara (2018), enunciados de su Tabla 1.

**Enunciado:** ¿Con qué frecuencia te ocurre lo siguiente?

**Instrucciones:** Lee cada afirmación e indica con qué frecuencia te describe en tu vida académica. No hay respuestas correctas ni incorrectas.

**Escala:** 1 = Nunca · 2 = Algunas veces · 3 = Bastantes veces · 4 = Siempre

| Variable | N° | Código | Enunciado | Anclas |
|---|---|---|---|---|
| `EAPESA_01` | 1 |  | Me considero lo suficientemente capacitado(a) para enfrentarme con éxito a cualquier tarea académica. |  |
| `EAPESA_02` | 2 |  | Pienso que tengo bastante capacidad para comprender bien y con rapidez un contenido. |  |
| `EAPESA_03` | 3 |  | Me siento con confianza para abordar situaciones que ponen a prueba mi capacidad académica. |  |
| `EAPESA_04` | 4 |  | Tengo la convicción que puedo obtener excelentes notas en las pruebas. |  |
| `EAPESA_05` | 5 |  | Me da igual que los profesores(as) sean exigentes y duros(as), ya que confío en mi propia capacidad académica. |  |
| `EAPESA_06` | 6 |  | Creo que soy una persona bastante capacitada y competente en mi vida académica. |  |
| `EAPESA_07` | 7 |  | Si me lo propongo, creo que tengo la suficiente capacidad para obtener un buen expediente académico. |  |
| `EAPESA_08` | 8 |  | Pienso que puedo pasar un semestre con bastante facilidad, e incluso con muy buenas notas. |  |
| `EAPESA_09` | 9 |  | Soy de esas personas que no necesita estudiar para aprobar una asignatura o pasar un semestre. |  |
| `EAPESA_10` | 10 |  | Creo que estoy preparado(a) y bastante capacitado(a) para conseguir muchos éxitos académicos. |  |

| Puntuación | Nombre | Cálculo |
|---|---|---|
| `EAPESA_Total_10items` | Autoeficacia (10 ítems) | promedio de ítems 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| `EAPESA_Total_9items_sinItem9` | Autoeficacia (9 ítems, sin ítem 9) | promedio de ítems 1, 2, 3, 4, 5, 6, 7, 8, 10 |

*Sin ítems inversos. Se calculan ambas versiones: 10 ítems y 9 ítems (excluye el ítem 9, de menor carga factorial en todas las validaciones). Redacción de Del Valle et al. (2018) desde octubre de 2026; difiere levemente de la de mayo de 2026 en los ítems 2, 4, 5, 8, 9 y 10 (mismo sentido, misma escala).*

## PERMA · PERMA-Profiler

**Constructo:** Bienestar. **Referencia:** Butler y Kern (2016); validación chilena de Cobo-Rendón et al. (2020). Instrumento V1.0 aprobado por el CEII.

**Enunciado:** Piensa en cómo te has sentido en general durante el último tiempo.

**Instrucciones:** A continuación encontrará una serie de preguntas sobre distintos aspectos de su bienestar. No hay respuestas correctas ni incorrectas. Para cada pregunta, seleccione el número que mejor represente su situación, considerando que 0 corresponde al valor más bajo y 10 al valor más alto de la escala que se indica en cada caso. Responda pensando en cómo se ha sentido en general durante el último tiempo.

**Escala:** 0 a 10, anclas por ítem en los extremos

| Variable | N° | Código | Enunciado | Anclas |
|---|---|---|---|---|
| `PERMA_01` | 1 | M1 | En general, ¿en qué medida lleva usted una vida con propósito y significado? | 0 = Ninguna · 10 = Completamente |
| `PERMA_02` | 2 | A1 | ¿Qué parte del tiempo siente que está avanzando hacia el logro de sus metas? | 0 = Nada · 10 = Todo |
| `PERMA_03` | 3 | E1 | ¿Con qué frecuencia se siente usted absorbido/a en lo que está haciendo? | 0 = Nunca · 10 = Siempre |
| `PERMA_04` | 4 | H1 | En general, ¿cómo diría usted que es su salud? | 0 = Pésima · 10 = Excelente |
| `PERMA_05` | 5 | P1 | En general, ¿con qué frecuencia se siente alegre? | 0 = Nunca · 10 = Siempre |
| `PERMA_06` | 6 | R1 | ¿En qué medida recibe usted ayuda y apoyo de otras personas cuando lo necesita? | 0 = Nada · 10 = Completamente |
| `PERMA_07` | 7 | N1 | En general, ¿qué tan seguido se siente ansioso/a? | 0 = Nunca · 10 = Siempre |
| `PERMA_08` | 8 | A2 | ¿Con qué frecuencia alcanza metas importantes que se ha propuesto para sí mismo/a? | 0 = Nunca · 10 = Siempre |
| `PERMA_09` | 9 | M2 | En general, ¿en qué medida siente que lo que hace en su vida es valioso y vale la pena? | 0 = Nada · 10 = Completamente |
| `PERMA_10` | 10 | P2 | En general, ¿con qué frecuencia se siente positivo/a? | 0 = Nunca · 10 = Siempre |
| `PERMA_11` | 11 | E2 | En general, ¿en qué medida se siente usted entusiasmado/a e interesado/a en las cosas? | 0 = Nada · 10 = Completamente |
| `PERMA_12` | 12 | LON | ¿Cuán solo/a se siente en su vida diaria? | 0 = Nada · 10 = Completamente |
| `PERMA_13` | 13 | H2 | ¿Qué tan satisfecho/a está usted con su salud física actual? | 0 = Nada · 10 = Completamente |
| `PERMA_14` | 14 | N2 | En general, ¿qué tan seguido se siente enojado/a? | 0 = Nunca · 10 = Siempre |
| `PERMA_15` | 15 | R2 | ¿En qué medida se siente usted querido/a? | 0 = Nada · 10 = Completamente |
| `PERMA_16` | 16 | A3 | ¿Qué tan seguido se siente capaz para manejar sus responsabilidades? | 0 = Nunca · 10 = Siempre |
| `PERMA_17` | 17 | M3 | En general, ¿hasta qué punto siente que sigue una dirección con sentido en su vida? | 0 = Nada · 10 = Completamente |
| `PERMA_18` | 18 | H3 | En comparación con otros de su misma edad y sexo, ¿cómo es su salud? | 0 = Pésima · 10 = Excelente |
| `PERMA_19` | 19 | R3 | ¿Qué tan satisfecho/a está usted con sus relaciones personales? | 0 = Nada · 10 = Completamente |
| `PERMA_20` | 20 | N3 | En general, ¿qué tan seguido se siente triste? | 0 = Nunca · 10 = Siempre |
| `PERMA_21` | 21 | E3 | ¿Con qué frecuencia se le pasa el tiempo muy rápido cuando está haciendo algo que disfruta? | 0 = Nunca · 10 = Siempre |
| `PERMA_22` | 22 | P3 | En general, ¿cuán satisfecho/a se siente usted? | 0 = Nada · 10 = Completamente |
| `PERMA_23` | 23 | HAP | Considerando todas las cosas en conjunto, ¿cuán feliz diría usted que es? | 0 = Nada · 10 = Completamente |

| Puntuación | Nombre | Cálculo |
|---|---|---|
| `PERMA_P` | Emociones positivas | promedio de ítems 5, 10, 22 |
| `PERMA_E` | Compromiso | promedio de ítems 3, 11, 21 |
| `PERMA_R` | Relaciones positivas | promedio de ítems 6, 15, 19 |
| `PERMA_M` | Propósito | promedio de ítems 1, 9, 17 |
| `PERMA_A` | Logro | promedio de ítems 2, 8, 16 |
| `PERMA_N` | Emociones negativas | promedio de ítems 7, 14, 20 |
| `PERMA_H` | Salud | promedio de ítems 4, 13, 18 |
| `PERMA_Soledad` | Soledad | promedio de ítems 12 |
| `PERMA_Felicidad` | Felicidad general | promedio de ítems 23 |
| `PERMA_Global` | Bienestar global (16 ítems) | promedio de ítems 5, 10, 22, 3, 11, 21, 6, 15, 19, 1, 9, 17, 2, 8, 16, 23 |

*Métrica original 0–10, promedio simple. Sin inversión: N y Soledad se reportan aparte. Compromiso (E) se interpreta con cautela (α = 0,36 en la validación chilena). Preguntas en el orden indicado, sin aleatorizar.*
