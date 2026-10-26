// Consentimiento informado V4.0, aprobado por el CEII el 14-10-2026 (enmienda consolidada).
// Texto literal de "06.Consentimiento informado Investigacion CID PEGB y SAGB V4.0 - Timbrado".
// Si el CEII aprueba una nueva versión, cambie VERSION y el texto: cada
// aceptación queda registrada con la versión vigente al momento de aceptar.

export const VERSION = 'V4.0';

export const TITULO = 'Consentimiento informado';
export const SUBTITULO = 'Participante de encuesta';

export const PARRAFOS = [
  'He sido invitado/a a participar en una investigación titulada <em>“Predicción del rendimiento académico en Ingeniería: integración de variables académicas y psicoeducativas en estudiantes de primer año”</em>, financiada por el Fondo de Investigación en Docencia Universitaria de la Universidad del Desarrollo, cuyo investigador responsable es Pablo González Brevis.',
  'El objetivo de este estudio es analizar en qué medida variables académicas previas y variables psicoeducativas, tales como la motivación académica, la autoeficacia, la autorregulación del aprendizaje y el bienestar psicológico, permiten predecir el rendimiento académico de estudiantes de primer año de Ingeniería Civil Industrial de la Universidad del Desarrollo, sede Concepción.',
  'La participación en este estudio contribuye al desarrollo de conocimiento científico orientado a mejorar el proceso formativo en educación superior. En particular, los resultados permitirán generar evidencia para el diseño de políticas y estrategias institucionales de apoyo académico temprano, orientadas a fortalecer el rendimiento, la retención y el bienestar estudiantil en carreras de ingeniería. De este modo, la participación de los estudiantes aporta directamente al mejoramiento de la calidad educativa y al desarrollo de futuras generaciones de estudiantes.',
  'Mi participación consistirá en responder cuestionarios en modalidad online en dos momentos del semestre, cada uno con una duración aproximada de 15 a 20 minutos. Estos cuestionarios incluyen preguntas relacionadas con mi experiencia académica y diversos aspectos psicoeducativos asociados al aprendizaje.',
  'Asimismo, autorizo expresamente que mis respuestas sean vinculadas con antecedentes académicos institucionales, tales como calificaciones e indicadores de rendimiento académico del primer año, los cuales serán utilizados exclusivamente con fines de investigación y análisis estadístico, sin afectar en ningún caso mi evaluación académica ni mi situación dentro de la universidad.',
  'Si respondí los cuestionarios de motivación académica, autorregulación del aprendizaje y autoeficacia académica aplicados en mayo de 2026, autorizo además que esas respuestas sean vinculadas con las de esta aplicación mediante el mismo código, con el único fin de analizar cómo cambian estas variables entre el primer y el segundo semestre. Este análisis se reporta de forma agregada y no se utiliza para predecir mi rendimiento académico. Si no deseo que mis respuestas de mayo se utilicen con este fin, puedo marcar la opción correspondiente al final de este formulario; en ese caso, mis registros de mayo serán eliminados y mi participación en esta aplicación no se verá afectada.',
  'Este estudio es de riesgo mínimo. No implica intervención ni manipulación de variables.',
  'Algunas preguntas de los cuestionarios indagan en estados de ánimo, como sentirse ansioso, enojado o triste, y en la percepción que tengo de mi propia salud física. Responderlas podría generar en algunas personas una incomodidad leve. Entiendo que puedo omitir cualquier pregunta que no desee responder y que puedo interrumpir mi participación en cualquier momento, sin consecuencias académicas y sin necesidad de justificar mi decisión. Si al responder experimento malestar, puedo comunicarme con el investigador responsable a través del correo indicado más abajo.',
  'Para resguardar la confidencialidad, las respuestas serán asociadas temporalmente a un identificador único con el fin de realizar el proceso de vinculación con los registros académicos y, cuando corresponda, con las respuestas de mayo de 2026. Una vez finalizado este proceso, y a más tardar en marzo de 2027, los datos serán codificados y anonimizados, eliminando cualquier identificador directo o indirecto que permita la identificación de los participantes, sin posibilidad razonable de reidentificación. Los resultados del estudio serán reportados únicamente de manera agregada.',
  'La información será tratada de manera confidencial y solo el equipo investigador tendrá acceso a los datos identificables. Estos serán almacenados en dispositivos y/o servidores institucionales protegidos, con acceso restringido, hasta marzo de 2027, tras lo cual serán eliminados de manera segura. La base de datos anonimizada podrá ser conservada una vez finalizado el estudio para fines de investigación académica y científica directamente relacionados con los objetivos de esta investigación y con estudios futuros sobre rendimiento académico y variables psicoeducativas en educación superior. No será utilizada con fines administrativos, disciplinarios, comerciales ni para la identificación individual de los participantes.',
  'Entiendo que mi participación es completamente voluntaria, que no recibiré compensación económica y que puedo retirarme en cualquier momento sin necesidad de justificar mi decisión y sin consecuencias académicas. Asimismo, puedo solicitar la eliminación de mis datos mientras estos sean identificables, es decir, hasta marzo de 2027.',
  'Si tengo preguntas sobre el estudio, puedo contactar al investigador responsable al correo: <a href="mailto:pablogonzalez@udd.cl">pablogonzalez@udd.cl</a>.',
  'Si tengo consultas sobre mis derechos como participante, puedo contactar al Comité de Ética Institucional en Investigación de la Universidad del Desarrollo a través de su Presidente, Francisco Ceric Garrido (<a href="mailto:fceric@udd.cl">fceric@udd.cl</a>) o través de su Secretario Ejecutivo, Erick Atenas Núñez (<a href="mailto:erickatenas@udd.cl">erickatenas@udd.cl</a>).'
];

export const CIERRE = 'He leído y comprendido la información anterior.';
export const ACEPTO = 'Sí, acepto voluntariamente participar en este estudio.';
export const NO_ACEPTO = 'No, no acepto participar del estudio.';

// Casilla de exclusión de los registros de mayo (CI V4.0). Opcional; solo
// tiene efecto si la persona respondió en mayo de 2026.
export const EXCLUSION_TITULO = 'Solo si respondí los cuestionarios de mayo de 2026:';
export const EXCLUSION = 'No autorizo que mis respuestas de mayo de 2026 se utilicen para analizar el cambio entre semestres.';
