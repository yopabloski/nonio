// Nonio · modelo de datos compartido por el modo demo y Firebase.

import { INSTRUMENTOS, INSTRUMENTO } from './instrumentos.js';

export const ESTADOS_MOMENTO = ['borrador', 'abierto', 'cerrado'];

// Diseño contrabalanceado aprobado por el CEII (protocolo V7.0, 14-10-2026):
// Bloque A = EME + EAPESA (38 ítems) · Bloque B = PERMA-Profiler + IPAA (35 ítems).
// Orden 1 responde A en la sesión 1 y B en la sesión 2; Orden 2, al revés.
// Dentro de cada bloque los instrumentos van en el orden indicado.
export const BLOQUES_INICIALES = () => ({
  A: { id: 'A', nombre: 'Bloque A', instrumentos: ['eme', 'eapesa'] },
  B: { id: 'B', nombre: 'Bloque B', instrumentos: ['perma', 'ipaa'] }
});

export const configInicial = () => {
  const c = {
    titulo: 'AMA·PERMA · Cohorte 2026',
    // Cohorte que ingresa hoy. Cada participante queda marcado con la cohorte
    // vigente al registrarse; así se pueden comparar cohortes en el futuro.
    cohorte: '2026',
    cohorteN: 149,
    // Permite marcar "Prefiero no responder" en cada ítem. El consentimiento
    // declara que el participante puede omitir cualquier pregunta.
    permitirOmitir: true,
    // tipo: 'contrabalanceado' (dos órdenes cruzados) | 'simple' (todos responden lo mismo)
    diseno: { tipo: 'contrabalanceado', bloques: BLOQUES_INICIALES() },
    momentos: {
      // pedirConsentimiento: muestra el consentimiento al entrar a este momento
      // aunque la persona ya lo haya respondido antes. Quien nunca ha decidido
      // lo ve siempre, en cualquier momento.
      // bloquePorOrden: qué bloque responde cada orden en esta sesión.
      m1: { id: 'm1', nombre: 'Sesión 1', orden: 1, bloquePorOrden: { 1: 'A', 2: 'B' }, instrumentos: [], estado: 'borrador', pedirConsentimiento: true },
      m2: { id: 'm2', nombre: 'Sesión 2', orden: 2, bloquePorOrden: { 1: 'B', 2: 'A' }, instrumentos: [], estado: 'borrador', pedirConsentimiento: false }
    }
  };
  return sincronizarInstrumentos(c);
};

export const ORDENES = [1, 2];
export const esContrabalanceado = config => config?.diseno?.tipo === 'contrabalanceado' && Boolean(config?.diseno?.bloques);

// Bloque ('A' | 'B') que corresponde a un orden en un momento, o null.
export function bloqueDe(config, momento, orden) {
  if (!esContrabalanceado(config) || !momento?.bloquePorOrden || orden == null) return null;
  return momento.bloquePorOrden[String(orden)] || null;
}

// Instrumentos (ids, en orden de presentación) que ve un estudiante de cierto orden.
export function instrumentosPara(config, momento, orden) {
  const b = bloqueDe(config, momento, orden);
  if (b) return [...(config.diseno.bloques[b]?.instrumentos || [])];
  return INSTRUMENTOS.filter(i => (momento?.instrumentos || []).includes(i.id)).map(i => i.id);
}

// En diseño contrabalanceado, momento.instrumentos guarda la unión de los
// bloques de esa sesión (la usan el panel, los análisis y las reglas).
export function sincronizarInstrumentos(config) {
  if (!esContrabalanceado(config)) return config;
  for (const m of Object.values(config.momentos || {})) {
    if (!m.bloquePorOrden) m.bloquePorOrden = { 1: 'A', 2: 'B' };
    const ids = new Set();
    ORDENES.forEach(o => (config.diseno.bloques[m.bloquePorOrden[o]]?.instrumentos || []).forEach(i => ids.add(i)));
    m.instrumentos = INSTRUMENTOS.map(i => i.id).filter(id => ids.has(id));
  }
  return config;
}

// Aleatorización simple (protocolo V7.0): cada estudiante recibe Orden 1 u
// Orden 2 con probabilidad 1/2, de forma independiente. Reproducible con la semilla.
export function aleatorizarOrdenes(correos, semilla) {
  let s = semilla >>> 0;
  const u = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return [...correos].sort().map(correo => ({ correo, orden: u() < 0.5 ? 1 : 2 }));
}

export const momentosOrdenados = config =>
  Object.values(config?.momentos || {}).sort((a, b) => (a.orden || 0) - (b.orden || 0));

export const claveRespuesta = (momentoId, instrumentoId) => `${momentoId}__${instrumentoId}`;

export const instrumentosDe = (momento, config = null, orden = null) =>
  (config ? instrumentosPara(config, momento, orden) : INSTRUMENTOS.filter(i => (momento?.instrumentos || []).includes(i.id)).map(i => i.id))
    .map(id => INSTRUMENTO[id]).filter(Boolean);

export function nuevoMomentoId(config) {
  let n = Object.keys(config.momentos || {}).length + 1;
  while (config.momentos[`m${n}`]) n++;
  return `m${n}`;
}

// Estado del alumno en un instrumento: 'pendiente' | 'en-curso' | 'enviado'
export function estadoRespuesta(doc, inst) {
  if (!doc) return 'pendiente';
  if (doc.estado === 'enviado') return 'enviado';
  const n = Object.keys(doc.respuestas || {}).length;
  return n ? 'en-curso' : 'pendiente';
}

export const codigoSugerido = momento =>
  `AMA-${(momento?.id || 'm').toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// ¿Debe ver el consentimiento al entrar a este momento?
// Siempre si nunca decidió; además, una vez por momento si el momento lo pide.
// Si cambia la versión del consentimiento (p. ej. V3.0 → V4.0), se pide de nuevo.
export function necesitaConsentimiento(participante, momento, versionVigente = null) {
  if (!participante?.consentimiento) return true;
  if (versionVigente && participante.consentimiento.version !== versionVigente) return true;
  return Boolean(momento?.pedirConsentimiento) && !participante.consentimientos?.[momento.id];
}

// Cohorte de un participante (los registros antiguos sin cohorte usan la vigente).
export const cohorteDe = (participante, config) => String(participante?.cohorte || config?.cohorte || 'sin cohorte');
