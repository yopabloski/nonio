// Nonio · definición de instrumentos y libro de códigos.
//
// Esta es la ÚNICA fuente de verdad de los ítems, escalas, recodificación y
// puntajes. La app del alumno, el panel docente, las exportaciones y el libro
// de códigos (docs/LIBRO_DE_CODIGOS.md) se derivan de aquí.
//
// Fuentes:
//  - EAPESA: enunciados de Del Valle et al. (2018), Tabla 1 (desde oct. 2026;
//    en mayo se usó la redacción del formulario AMA, con 6 diferencias menores).
//  - EME-E: versión oficial española de Núñez, Martín-Albo y Navarro (2005),
//    Tabla 3, p. 348, con anclas 1/4/7 (desde oct. 2026). Ítems 1 y 3 con las
//    aclaraciones de Instrumentos_Finales_2 («Formación Profesional», «profesional»).
//    En mayo se usó otra redacción y anclas en los 7 puntos: no es una medición idéntica.
//  - IPAA: enunciados exactos del formulario AMA de abril 2026
//    (BBDD/AMA_N147_EAPESA_IPAA_EME.xlsx) y criterios de recodificación de la
//    hoja "Notas_metodologicas" de esa base.
//  - PERMA-Profiler: "02. Instrumento - PERMA-Profiler V1.0" presentado al CEII
//    en la Enmienda 1 (redacción chilena, Cobo-Rendón et al., 2020).
//
// Único cambio respecto a los textos originales: IPAA ítem 11 decía
// "esaasignatura" (error de tipeo) → "esa asignatura".

export const ESCALAS = {
  eapesa4: [
    { valor: 1, etiqueta: 'Nunca' },
    { valor: 2, etiqueta: 'Algunas veces' },
    { valor: 3, etiqueta: 'Bastantes veces' },
    { valor: 4, etiqueta: 'Siempre' }
  ],
  ipaa5: [
    { valor: 1, etiqueta: 'Nunca' },
    { valor: 2, etiqueta: 'Casi nunca' },
    { valor: 3, etiqueta: 'Regularmente' },
    { valor: 4, etiqueta: 'Casi siempre' },
    { valor: 5, etiqueta: 'Siempre' }
  ],
  // EME-E (Núñez et al., 2005): solo se publican las anclas 1, 4 y 7;
  // 2, 3, 5 y 6 se presentan sin etiqueta verbal.
  eme7: [
    { valor: 1, etiqueta: 'No se corresponde en absoluto' },
    { valor: 2, etiqueta: '' },
    { valor: 3, etiqueta: '' },
    { valor: 4, etiqueta: 'Se corresponde medianamente' },
    { valor: 5, etiqueta: '' },
    { valor: 6, etiqueta: '' },
    { valor: 7, etiqueta: 'Se corresponde totalmente' }
  ],
  // PERMA: 0 a 10, solo se rotulan los extremos (anclas por ítem).
  perma11: Array.from({ length: 11 }, (_, i) => ({ valor: i, etiqueta: String(i) }))
};

// Código de dato perdido cuando el participante elige "Prefiero no responder".
// En la base recodificada queda vacío; en SPSS/JASP se declara como perdido.
export const NO_RESPONDE = -99;

const it = (n, texto, extra = {}) => ({ n, texto, ...extra });

export const INSTRUMENTOS = [
  {
    id: 'eme',
    sigla: 'EME-E',
    nombre: 'Escala de Motivación Educativa',
    constructo: 'Motivación',
    color: '#3F549E',
    referencia: 'Vallerand et al. (1989, 1992); adaptación de Núñez, Martín-Albo y Navarro (2005).',
    escala: 'eme7',
    minutos: 7,
    enunciado: '¿Por qué vas a la universidad?',
    instrucciones: 'A continuación encontrarás una serie de razones por las que las personas estudian en la universidad. Indica en qué medida cada una corresponde a una de las razones por las que tú vas a la universidad. No hay respuestas correctas ni incorrectas.',
    items: [
      it(1, 'Porque sólo con el Bachillerato o la Formación Profesional no podría encontrar un empleo bien pagado.'),
      it(2, 'Porque para mí es un placer y una satisfacción aprender cosas nuevas.'),
      it(3, 'Porque pienso que los estudios universitarios me ayudarán a preparar mejor la carrera profesional que he elegido.'),
      it(4, 'Por los intensos momentos que vivo cuando comunico mis propias ideas a los demás.'),
      it(5, 'Sinceramente no lo sé; verdaderamente, tengo la impresión de perder el tiempo en la Universidad.'),
      it(6, 'Por la satisfacción que siento cuando me supero en mis estudios.'),
      it(7, 'Para demostrarme que soy capaz de terminar una carrera universitaria.'),
      it(8, 'Para poder conseguir en el futuro un trabajo más prestigioso.'),
      it(9, 'Por el placer de descubrir cosas nuevas desconocidas para mí.'),
      it(10, 'Porque posiblemente me permitirá entrar en el mercado laboral dentro del campo que a mí me guste.'),
      it(11, 'Por el placer de leer autores interesantes.'),
      it(12, 'En su momento, tuve buenas razones para ir a la Universidad; pero, ahora me pregunto si debería continuar en ella.'),
      it(13, 'Por la satisfacción que siento al superar cada uno de mis objetivos personales.'),
      it(14, 'Porque aprobar en la Universidad me hace sentirme importante.'),
      it(15, 'Porque en el futuro quiero tener una «buena vida».'),
      it(16, 'Por el placer de saber más sobre las asignaturas que me atraen.'),
      it(17, 'Porque me ayudará a elegir mejor mi orientación profesional.'),
      it(18, 'Por el placer que experimento al sentirme completamente absorbido por lo que ciertos autores han escrito.'),
      it(19, 'No sé porqué voy a la Universidad y francamente, me trae sin cuidado.'),
      it(20, 'Por la satisfacción que siento cuando logro realizar actividades académicas difíciles.'),
      it(21, 'Para demostrarme que soy una persona inteligente.'),
      it(22, 'Para tener un sueldo mejor en el futuro.'),
      it(23, 'Porque mis estudios me permiten continuar aprendiendo un montón de cosas que me interesan.'),
      it(24, 'Porque creo que unos pocos años más de estudios van a mejorar mi competencia como profesional.'),
      it(25, 'Porque me gusta «meterme de lleno» cuando leo diferentes temas interesantes.'),
      it(26, 'No lo sé; no consigo entender qué hago en la Universidad.'),
      it(27, 'Porque la Universidad me permite sentir la satisfacción personal en la búsqueda de la perfección dentro de mis estudios.'),
      it(28, 'Porque quiero demostrarme que soy capaz de tener éxito en mis estudios.')
    ],
    // Orden cíclico estándar de Vallerand: RE, MIC, RId, MIE, AM, MIL, RIn.
    dimensiones: [
      { id: 'RegulacionExterna', nombre: 'Regulación externa', items: [1, 8, 15, 22] },
      { id: 'MI_Conocimiento', nombre: 'MI al conocimiento', items: [2, 9, 16, 23] },
      { id: 'RegulacionIdentificada', nombre: 'Regulación identificada', items: [3, 10, 17, 24] },
      { id: 'MI_ExpEstimulantes', nombre: 'MI a experiencias estimulantes', items: [4, 11, 18, 25] },
      { id: 'Amotivacion', nombre: 'Amotivación', items: [5, 12, 19, 26] },
      { id: 'MI_Logro', nombre: 'MI al logro', items: [6, 13, 20, 27] },
      { id: 'RegulacionIntroyectada', nombre: 'Regulación introyectada', items: [7, 14, 21, 28] }
    ],
    // Puntajes compuestos: promedio de dimensiones.
    compuestos: [
      { id: 'MI_Global', nombre: 'Motivación intrínseca global', dimensiones: ['MI_Conocimiento', 'MI_ExpEstimulantes', 'MI_Logro'] }
    ],
    notas: 'Sin ítems inversos. No se calcula ME global ni RAI (el continuo de autodeterminación no se sostuvo en la muestra de mayo): se reporta el perfil de 7 subescalas. Desde octubre de 2026 se usa la versión oficial de Núñez et al. (2005), Tabla 3, con anclas solo en 1, 4 y 7; en mayo de 2026 se usó otra redacción y anclas en los 7 puntos, por lo que el cambio entre semestres debe interpretarse con cautela.'
  },
  {
    id: 'ipaa',
    sigla: 'IPAA',
    nombre: 'Inventario de Procesos de Autorregulación del Aprendizaje',
    constructo: 'Autorregulación',
    color: '#008B8D',
    referencia: 'Rosário et al. (2007); estructura chilena de Bruna et al. (2017).',
    escala: 'ipaa5',
    minutos: 4,
    enunciado: '¿Con qué frecuencia haces lo siguiente?',
    instrucciones: 'Lee cada afirmación e indica con qué frecuencia la realizas cuando estudias. No hay respuestas correctas ni incorrectas.',
    items: [
      it(1, 'Hago un plan antes de comenzar a hacer un trabajo escrito. Pienso lo que voy a hacer y lo que necesito para conseguirlo.'),
      it(2, 'Después de terminar un examen parcial/final, lo reviso mentalmente para saber dónde tuve los aciertos y errores y, hacerme una idea de la nota que voy a tener.'),
      it(3, 'Cuando estudio, intento comprender las materias, tomar apuntes, hacer resúmenes, resolver ejercicios, hacer preguntas sobre los contenidos.'),
      it(4, 'Cuando recibo una nota, suelo pensar en cosas concretas que tengo que hacer para mejorar mi rendimiento/ nota media.'),
      it(5, 'Estoy seguro de que soy capaz de comprender lo que me van a enseñar y por eso creo que voy a tener buenas notas'),
      it(6, 'Cumplo mis horarios de estudio, e introduzco pequeños cambios siempre que es necesario'),
      it(7, 'Guardo y analizo las correcciones de los trabajos escritos o pruebas parciales, para ver dónde me equivoqué y saber qué tengo que cambiar para mejorar'),
      it(8, 'Mientras estoy en clase o estudiando, si me distraigo o pierdo el hilo, suelo hacer algo para volver a la tarea y alcanzar mis objetivos'),
      it(9, 'Establezco objetivos académicos concretos para cada asignatura'),
      it(10, 'Busco un sitio tranquilo y donde pueda estar concentrado para estudiar'),
      it(11, 'Comparo las notas que saco con los objetivos que me había marcado para esa asignatura'),
      it(12, 'Antes de comenzar a estudiar, compruebo si tengo todo lo que necesito: diccionarios, libros, lápices, cuadernos, fotocopias, para no estar siempre interrumpiendo mi estudio')
    ],
    total: { id: 'Total', nombre: 'Autorregulación total (12 ítems)' },
    dimensiones: [
      { id: 'Planificacion', nombre: 'Planificación', items: [1, 10, 12] },
      { id: 'Ejecucion', nombre: 'Ejecución', items: [3, 5, 6, 8] },
      { id: 'Evaluacion', nombre: 'Evaluación', items: [2, 4, 7, 9, 11] }
    ],
    notas: 'Sin ítems inversos. Subescalas según Tabla 8 de Bruna et al. (2017).'
  },
  {
    id: 'eapesa',
    sigla: 'EAPESA',
    nombre: 'Escala de Autoeficacia Percibida Específica de Situaciones Académicas',
    constructo: 'Autoeficacia',
    color: '#B46919',
    referencia: 'Palenzuela (1983); validación chilena de Del Valle, Díaz, Pérez y Vergara (2018), enunciados de su Tabla 1.',
    escala: 'eapesa4',
    minutos: 3,
    enunciado: '¿Con qué frecuencia te ocurre lo siguiente?',
    instrucciones: 'Lee cada afirmación e indica con qué frecuencia te describe en tu vida académica. No hay respuestas correctas ni incorrectas.',
    items: [
      it(1, 'Me considero lo suficientemente capacitado(a) para enfrentarme con éxito a cualquier tarea académica.'),
      it(2, 'Pienso que tengo bastante capacidad para comprender bien y con rapidez un contenido.'),
      it(3, 'Me siento con confianza para abordar situaciones que ponen a prueba mi capacidad académica.'),
      it(4, 'Tengo la convicción que puedo obtener excelentes notas en las pruebas.'),
      it(5, 'Me da igual que los profesores(as) sean exigentes y duros(as), ya que confío en mi propia capacidad académica.'),
      it(6, 'Creo que soy una persona bastante capacitada y competente en mi vida académica.'),
      it(7, 'Si me lo propongo, creo que tengo la suficiente capacidad para obtener un buen expediente académico.'),
      it(8, 'Pienso que puedo pasar un semestre con bastante facilidad, e incluso con muy buenas notas.'),
      it(9, 'Soy de esas personas que no necesita estudiar para aprobar una asignatura o pasar un semestre.'),
      it(10, 'Creo que estoy preparado(a) y bastante capacitado(a) para conseguir muchos éxitos académicos.')
    ],
    total: { id: 'Total_10items', nombre: 'Autoeficacia (10 ítems)' },
    dimensiones: [
      { id: 'Total_9items_sinItem9', nombre: 'Autoeficacia (9 ítems, sin ítem 9)', items: [1, 2, 3, 4, 5, 6, 7, 8, 10] }
    ],
    notas: 'Sin ítems inversos. Se calculan ambas versiones: 10 ítems y 9 ítems (excluye el ítem 9, de menor carga factorial en todas las validaciones). Redacción de Del Valle et al. (2018) desde octubre de 2026; difiere levemente de la de mayo de 2026 en los ítems 2, 4, 5, 8, 9 y 10 (mismo sentido, misma escala).'
  },
  {
    id: 'perma',
    sigla: 'PERMA',
    nombre: 'PERMA-Profiler',
    constructo: 'Bienestar',
    color: '#7E3857',
    referencia: 'Butler y Kern (2016); validación chilena de Cobo-Rendón et al. (2020). Instrumento V1.0 aprobado por el CEII.',
    escala: 'perma11',
    minutos: 8,
    ordenFijo: true,
    enunciado: 'Piensa en cómo te has sentido en general durante el último tiempo.',
    instrucciones: 'A continuación encontrará una serie de preguntas sobre distintos aspectos de su bienestar. No hay respuestas correctas ni incorrectas. Para cada pregunta, seleccione el número que mejor represente su situación, considerando que 0 corresponde al valor más bajo y 10 al valor más alto de la escala que se indica en cada caso. Responda pensando en cómo se ha sentido en general durante el último tiempo.',
    items: [
      it(1, 'En general, ¿en qué medida lleva usted una vida con propósito y significado?', { codigo: 'M1', anclas: ['Ninguna', 'Completamente'] }),
      it(2, '¿Qué parte del tiempo siente que está avanzando hacia el logro de sus metas?', { codigo: 'A1', anclas: ['Nada', 'Todo'] }),
      it(3, '¿Con qué frecuencia se siente usted absorbido/a en lo que está haciendo?', { codigo: 'E1', anclas: ['Nunca', 'Siempre'] }),
      it(4, 'En general, ¿cómo diría usted que es su salud?', { codigo: 'H1', anclas: ['Pésima', 'Excelente'] }),
      it(5, 'En general, ¿con qué frecuencia se siente alegre?', { codigo: 'P1', anclas: ['Nunca', 'Siempre'] }),
      it(6, '¿En qué medida recibe usted ayuda y apoyo de otras personas cuando lo necesita?', { codigo: 'R1', anclas: ['Nada', 'Completamente'] }),
      it(7, 'En general, ¿qué tan seguido se siente ansioso/a?', { codigo: 'N1', anclas: ['Nunca', 'Siempre'] }),
      it(8, '¿Con qué frecuencia alcanza metas importantes que se ha propuesto para sí mismo/a?', { codigo: 'A2', anclas: ['Nunca', 'Siempre'] }),
      it(9, 'En general, ¿en qué medida siente que lo que hace en su vida es valioso y vale la pena?', { codigo: 'M2', anclas: ['Nada', 'Completamente'] }),
      it(10, 'En general, ¿con qué frecuencia se siente positivo/a?', { codigo: 'P2', anclas: ['Nunca', 'Siempre'] }),
      it(11, 'En general, ¿en qué medida se siente usted entusiasmado/a e interesado/a en las cosas?', { codigo: 'E2', anclas: ['Nada', 'Completamente'] }),
      it(12, '¿Cuán solo/a se siente en su vida diaria?', { codigo: 'LON', anclas: ['Nada', 'Completamente'] }),
      it(13, '¿Qué tan satisfecho/a está usted con su salud física actual?', { codigo: 'H2', anclas: ['Nada', 'Completamente'] }),
      it(14, 'En general, ¿qué tan seguido se siente enojado/a?', { codigo: 'N2', anclas: ['Nunca', 'Siempre'] }),
      it(15, '¿En qué medida se siente usted querido/a?', { codigo: 'R2', anclas: ['Nada', 'Completamente'] }),
      it(16, '¿Qué tan seguido se siente capaz para manejar sus responsabilidades?', { codigo: 'A3', anclas: ['Nunca', 'Siempre'] }),
      it(17, 'En general, ¿hasta qué punto siente que sigue una dirección con sentido en su vida?', { codigo: 'M3', anclas: ['Nada', 'Completamente'] }),
      it(18, 'En comparación con otros de su misma edad y sexo, ¿cómo es su salud?', { codigo: 'H3', anclas: ['Pésima', 'Excelente'] }),
      it(19, '¿Qué tan satisfecho/a está usted con sus relaciones personales?', { codigo: 'R3', anclas: ['Nada', 'Completamente'] }),
      it(20, 'En general, ¿qué tan seguido se siente triste?', { codigo: 'N3', anclas: ['Nunca', 'Siempre'] }),
      it(21, '¿Con qué frecuencia se le pasa el tiempo muy rápido cuando está haciendo algo que disfruta?', { codigo: 'E3', anclas: ['Nunca', 'Siempre'] }),
      it(22, 'En general, ¿cuán satisfecho/a se siente usted?', { codigo: 'P3', anclas: ['Nada', 'Completamente'] }),
      it(23, 'Considerando todas las cosas en conjunto, ¿cuán feliz diría usted que es?', { codigo: 'HAP', anclas: ['Nada', 'Completamente'] })
    ],
    dimensiones: [
      { id: 'P', nombre: 'Emociones positivas', items: [5, 10, 22] },
      { id: 'E', nombre: 'Compromiso', items: [3, 11, 21] },
      { id: 'R', nombre: 'Relaciones positivas', items: [6, 15, 19] },
      { id: 'M', nombre: 'Propósito', items: [1, 9, 17] },
      { id: 'A', nombre: 'Logro', items: [2, 8, 16] },
      { id: 'N', nombre: 'Emociones negativas', items: [7, 14, 20] },
      { id: 'H', nombre: 'Salud', items: [4, 13, 18] },
      { id: 'Soledad', nombre: 'Soledad', items: [12] },
      { id: 'Felicidad', nombre: 'Felicidad general', items: [23] },
      { id: 'Global', nombre: 'Bienestar global (16 ítems)', items: [5, 10, 22, 3, 11, 21, 6, 15, 19, 1, 9, 17, 2, 8, 16, 23] }
    ],
    notas: 'Métrica original 0–10, promedio simple. Sin inversión: N y Soledad se reportan aparte. Compromiso (E) se interpreta con cautela (α = 0,36 en la validación chilena). Preguntas en el orden indicado, sin aleatorizar.'
  }
];

export const INSTRUMENTO = Object.fromEntries(INSTRUMENTOS.map(i => [i.id, i]));

// Nombre de variable de un ítem en las bases (compatible SPSS: letras, números, _).
export const varItem = (inst, n) => `${inst.id.toUpperCase()}_${String(n).padStart(2, '0')}`;
export const varDim = (inst, dimId) => `${inst.id.toUpperCase()}_${dimId}`;

// Todas las puntuaciones que produce un instrumento, en orden de reporte.
export function puntuaciones(inst) {
  const out = [];
  if (inst.total) out.push({ id: inst.total.id, nombre: inst.total.nombre, items: inst.items.map(i => i.n) });
  for (const d of inst.dimensiones) out.push({ ...d });
  for (const c of inst.compuestos || []) out.push({ ...c, compuesto: true });
  return out;
}

export const escalaDe = inst => ESCALAS[inst.escala];
export const etiquetaDe = (inst, valor) => {
  if (valor === NO_RESPONDE) return 'Prefiero no responder';
  const op = escalaDe(inst).find(o => o.valor === valor);
  return op ? (op.etiqueta || String(op.valor)) : '';
};
