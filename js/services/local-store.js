// Nonio · MODO DEMO. Misma API que remote-store.js, sobre localStorage.
// Replica las reglas de Firestore que importan para el flujo (RUT al reclamar
// un correo, momento abierto, envío bloqueado) para que la demo se comporte
// como producción.

import { configInicial, claveRespuesta, esContrabalanceado, instrumentosPara, aleatorizarOrdenes } from '../domain/modelo.js';
import { normalizarCodigo } from '../domain/identidad.js';
import { VERSION } from '../domain/consentimiento.js';
import { INSTRUMENTO, ESCALAS } from '../domain/instrumentos.js';

// v2: diseño contrabalanceado y nómina (25-10-2026).
const KEY = 'nonio:db:v2';
const SESION = 'nonio:sesion';
const ahora = () => new Date().toISOString();

function leer() {
  try {
    const db = JSON.parse(localStorage.getItem(KEY));
    if (db && db.config) { db.nomina ||= {}; db.aleatorizaciones ||= []; return db; }
  } catch {}
  const db = { config: configInicial(), codigos: { 'DEMO-S1': 'm1', 'DEMO-S2': 'm2' }, participantes: {}, nomina: {}, aleatorizaciones: [] };
  escribir(db);
  return db;
}
function escribir(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
  try { window.dispatchEvent(new CustomEvent('ama:cambio')); } catch {}
}
const clon = x => JSON.parse(JSON.stringify(x));
const error = (code, message) => Object.assign(new Error(message), { code });

export const modo = 'demo';
if (typeof localStorage !== 'undefined') leer();

// ---------- Alumno ----------
export async function cargarConfig() { return clon(leer().config); }

export async function resolverCodigo(codigo) {
  return leer().codigos[normalizarCodigo(codigo)] || null;
}

export async function ingresar({ correo, nombre, rut, codigo }) {
  const db = leer();
  const cod = normalizarCodigo(codigo);
  const momentoId = db.codigos[cod];
  if (!momentoId) throw error('codigo-invalido', 'El código de acceso no es válido.');
  let p = db.participantes[correo];
  if (p && p.rut !== rut) throw error('rut-no-coincide', 'Este correo ya está registrado con otro RUT. Revisa tu RUT o escribe al investigador.');
  if (!p) {
    p = db.participantes[correo] = { correo, nombre, rut, cohorte: String(db.config.cohorte || ''), creado: ahora(), respuestas: {} };
  }
  p.codigo = cod;
  p.ultimoIngreso = ahora();
  escribir(db);
  try { localStorage.setItem(SESION, JSON.stringify({ correo, codigo: cod })); } catch {}
  return { participante: publico(p), momentoId };
}

const publico = p => { const { respuestas, ...resto } = clon(p); return resto; };

export async function sesionActual() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SESION)); } catch {}
  if (!s?.correo) return null;
  const db = leer();
  const p = db.participantes[s.correo];
  if (!p) return null;
  return { participante: publico(p), momentoId: db.codigos[s.codigo] || null, codigo: s.codigo };
}

export async function salir() { try { localStorage.removeItem(SESION); } catch {} }

export async function guardarConsentimiento(correo, acepta, momentoId = null, { excluyeMayo = false } = {}) {
  const db = leer();
  const p = db.participantes[correo];
  if (!p) throw error('sin-participante', 'Sesión no válida.');
  const registro = { acepta, excluyeMayo: Boolean(acepta && excluyeMayo), fecha: ahora(), version: VERSION, momentoId };
  p.consentimiento = registro;
  if (momentoId) p.consentimientos = { ...(p.consentimientos || {}), [momentoId]: registro };
  p.historialConsentimiento = [...(p.historialConsentimiento || []), registro];
  escribir(db);
  return registro;
}

// Orden (1 | 2) del estudiante en el diseño contrabalanceado. Si no está en la
// nómina, se le asigna uno al azar al entrar y queda registrado (origen 'entrada').
export async function asegurarOrden(correo) {
  const db = leer();
  if (!esContrabalanceado(db.config)) return null;
  let n = db.nomina[correo];
  if (!n?.orden) {
    n = db.nomina[correo] = { ...(n || {}), correo, orden: Math.random() < 0.5 ? 1 : 2, origen: 'entrada', asignado: ahora() };
    escribir(db);
  }
  return n.orden;
}

export async function respuestasDe(correo) {
  return clon(leer().participantes[correo]?.respuestas || {});
}

function puedeEscribir(db, correo, momentoId, instId) {
  const p = db.participantes[correo];
  const m = db.config.momentos[momentoId];
  if (!p) throw error('sin-participante', 'Sesión no válida.');
  if (!p.consentimiento?.acepta) throw error('sin-consentimiento', 'Falta el consentimiento.');
  if (!m || m.estado !== 'abierto') throw error('momento-cerrado', 'Este momento no está abierto.');
  const orden = db.nomina[correo]?.orden ?? null;
  if (!instrumentosPara(db.config, m, orden).includes(instId)) throw error('instrumento', 'Este cuestionario no corresponde a tu bloque en esta sesión.');
  const doc = p.respuestas[claveRespuesta(momentoId, instId)];
  if (doc?.estado === 'enviado') throw error('enviado', 'Este cuestionario ya fue enviado.');
  return { p, doc };
}

export async function guardarRespuestas(correo, momentoId, instId, respuestas) {
  const db = leer();
  const { p, doc } = puedeEscribir(db, correo, momentoId, instId);
  p.respuestas[claveRespuesta(momentoId, instId)] = {
    ...(doc || { inicio: ahora() }), momentoId, instrumentoId: instId,
    respuestas: clon(respuestas), estado: 'borrador', actualizado: ahora()
  };
  if (!db.aleatorizaciones.length) db.aleatorizaciones.push({ fecha: new Date(base - 864e5).toISOString(), semilla: 7, metodo: 'simple', n: Object.keys(db.nomina).length, n1: Object.values(db.nomina).filter(x => x.orden === 1).length, n2: Object.values(db.nomina).filter(x => x.orden === 2).length, por: 'demo' });
  escribir(db);
}

export async function enviarRespuestas(correo, momentoId, instId, respuestas) {
  const db = leer();
  const { p, doc } = puedeEscribir(db, correo, momentoId, instId);
  p.respuestas[claveRespuesta(momentoId, instId)] = {
    ...(doc || { inicio: ahora() }), momentoId, instrumentoId: instId,
    respuestas: clon(respuestas), estado: 'enviado', actualizado: ahora(), enviado: ahora()
  };
  escribir(db);
}

// ---------- Docente ----------
export async function restaurarDocente() { return { uid: 'demo', email: 'demo@local', demo: true }; }
export async function entrarDocente() { return restaurarDocente(); }
export async function salirDocente() {}

export async function guardarConfig(config) {
  const db = leer();
  db.config = clon(config);
  escribir(db);
}

export async function codigosVigentes() {
  const out = {};
  for (const [c, m] of Object.entries(leer().codigos)) out[m] = c;
  return out;
}

export async function fijarCodigo(momentoId, codigo) {
  const db = leer();
  const cod = normalizarCodigo(codigo);
  if (!cod) throw error('codigo', 'Código vacío.');
  if (db.codigos[cod] && db.codigos[cod] !== momentoId) throw error('codigo-usado', 'Ese código ya lo usa otro momento.');
  for (const [c, m] of Object.entries(db.codigos)) if (m === momentoId) delete db.codigos[c];
  db.codigos[cod] = momentoId;
  escribir(db);
}

export async function listarParticipantes() {
  return Object.values(leer().participantes).map(publico);
}

export async function listarRespuestas() {
  const out = [];
  for (const p of Object.values(leer().participantes)) {
    for (const [clave, doc] of Object.entries(p.respuestas || {})) out.push({ correo: p.correo, clave, ...clon(doc) });
  }
  return out;
}

export async function reabrir(correo, clave) {
  const db = leer();
  const doc = db.participantes[correo]?.respuestas?.[clave];
  if (!doc) return;
  doc.estado = 'borrador';
  doc.reaperturas = [...(doc.reaperturas || []), { fecha: ahora(), por: 'demo' }];
  escribir(db);
}

export async function eliminarParticipante(correo) {
  const db = leer();
  delete db.participantes[correo];
  escribir(db);
}

// ---------- Nómina y aleatorización ----------
export async function listarNomina() { return Object.values(clon(leer().nomina)); }
export async function registrosAleatorizacion() { return clon(leer().aleatorizaciones); }

// filas: [{ correo, nombre?, rut? }]. No toca el orden de quienes ya lo tienen.
export async function agregarNomina(filas) {
  const db = leer();
  let nuevos = 0;
  for (const f of filas) {
    const prev = db.nomina[f.correo];
    if (!prev) nuevos++;
    db.nomina[f.correo] = { ...(prev || {}), correo: f.correo, ...(f.nombre ? { nombre: f.nombre } : {}), ...(f.rut ? { rut: f.rut } : {}), ...(f.matricula ? { matricula: f.matricula } : {}), ...(f.seccion ? { seccion: f.seccion } : {}), ...(f.orden ? { orden: f.orden, origen: 'importado', asignado: ahora() } : {}) };
  }
  escribir(db);
  return { nuevos, total: Object.keys(db.nomina).length };
}

// Asigna orden a quienes no lo tienen (aleatorización simple con semilla).
export async function aleatorizar(semilla) {
  const db = leer();
  const sinOrden = Object.values(db.nomina).filter(n => !n.orden).map(n => n.correo);
  const asign = aleatorizarOrdenes(sinOrden, semilla);
  const fecha = ahora();
  for (const a of asign) Object.assign(db.nomina[a.correo], { orden: a.orden, origen: 'aleatorizacion', asignado: fecha, semilla });
  const registro = { fecha, semilla, metodo: 'simple', n: asign.length, n1: asign.filter(a => a.orden === 1).length, n2: asign.filter(a => a.orden === 2).length, por: 'demo' };
  db.aleatorizaciones.push(registro);
  escribir(db);
  return registro;
}

export async function fijarOrden(correo, orden) {
  const db = leer();
  if (!db.nomina[correo]) db.nomina[correo] = { correo };
  Object.assign(db.nomina[correo], { orden, origen: 'manual', asignado: ahora() });
  escribir(db);
}

export async function quitarDeNomina(correo) {
  const db = leer();
  delete db.nomina[correo];
  escribir(db);
}

export function suscribir(fn) {
  const h = () => fn();
  window.addEventListener('ama:cambio', h);
  window.addEventListener('storage', e => { if (e.key === KEY) fn(); });
  return () => window.removeEventListener('ama:cambio', h);
}

// ---------- Solo demo ----------
// Genera respuestas sintéticas con estructura factorial simple para que el
// panel muestre análisis con sentido. NUNCA existe en modo Firebase.
export async function sembrarDemo(n = 150) {
  const db = leer();
  const nombres = ['Antonia', 'Benjamín', 'Catalina', 'Diego', 'Emilia', 'Felipe', 'Gabriela', 'Hernán', 'Isidora', 'Joaquín', 'Josefa', 'Matías', 'Martina', 'Nicolás', 'Florencia', 'Tomás', 'Valentina', 'Vicente', 'Sofía', 'Agustín'];
  const apellidos = ['Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya'];
  let semilla = 7;
  const rnd = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  const normal = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const dv = c => { let s = 0, m = 2; for (let i = c.length - 1; i >= 0; i--) { s += +c[i] * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return r === 11 ? '0' : r === 10 ? 'K' : String(r); };
  const actual = String(db.config.cohorte || '2026');
  const previa = String(Number(actual) - 1 || 'anterior');
  const base = Date.now() - 6 * 864e5;
  // Dos rasgos latentes: "académico" (autoeficacia/autorregulación/MI) y "bienestar".
  // Amotivación se opone al rasgo académico. La cohorte previa parte un poco más baja.
  const cargas = { eme: 'acad', ipaa: 'acad', eapesa: 'acad', perma: 'bien' };
  for (let k = 0; k < n; k++) {
    const nom = `${nombres[k % nombres.length]} ${apellidos[(k * 7) % apellidos.length]}`;
    const correo = `${nom.split(' ')[0][0]}.${apellidos[(k * 7) % apellidos.length]}${k}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + '@udd.cl';
    const cuerpo = String(21000000 + Math.floor(rnd() * 1500000));
    const acepta = rnd() > 0.04;
    const cohorte = k < n * 0.7 ? actual : previa;
    const t0 = base + k * 36e5;
    const tISO = new Date(t0).toISOString();
    const orden = rnd() < 0.5 ? 1 : 2;
    if (cohorte === actual) db.nomina[correo] = { correo, nombre: nom, orden, origen: 'aleatorizacion', asignado: tISO, semilla: 7 };
    // ~7 % de la nómina nunca entra: queda en la nómina sin registro.
    if (cohorte === actual && rnd() < 0.07) continue;
    const ci = { acepta, excluyeMayo: acepta && rnd() < 0.08, fecha: tISO, version: VERSION };
    const p = { correo, nombre: nom, rut: `${cuerpo}-${dv(cuerpo)}`, cohorte, creado: tISO, codigo: 'DEMO-S1', respuestas: {},
      consentimiento: ci, consentimientos: { m1: ci } };
    if (acepta) {
      const acad = normal() + (cohorte === previa ? -0.35 : 0);
      const bien = 0.55 * acad + 0.8 * normal();
      const rasgos = { acad, bien };
      const tipo = rnd();
      const descuidado = tipo < 0.04 ? 'plano' : tipo < 0.07 ? 'rapido' : tipo < 0.12 ? 'omite' : null;
      for (const m of Object.values(db.config.momentos)) {
        for (const id of instrumentosPara(db.config, m, orden)) {
          const inst = INSTRUMENTO[id];
          if (rnd() < (m.orden === 1 ? 0.05 : 0.12)) continue;
          const esc = ESCALAS[inst.escala];
          const min = esc[0].valor, max = esc[esc.length - 1].valor;
          const dimDe = {};
          inst.dimensiones.forEach((d, j) => d.items.forEach(nIt => { if (dimDe[nIt] == null) dimDe[nIt] = j; }));
          const rasgo = rasgos[cargas[id]];
          const dimRasgo = inst.dimensiones.map(() => 0.75 * rasgo + 0.6 * normal());
          const r = {};
          const completo = rnd() > 0.07;
          const fijo = Math.round((min + max) / 2 + normal());
          for (const item of inst.items) {
            if (!completo && item.n > inst.items.length * 0.6) break;
            const amot = id === 'eme' && [5, 12, 19, 26].includes(item.n);
            const neg = id === 'perma' && [7, 14, 20, 12].includes(item.n);
            const centro = (min + max) / 2 + (amot ? -1.6 : neg ? -0.8 : 0.5);
            const signo = amot || neg ? -0.6 : 1;
            const z = signo * (dimRasgo[dimDe[item.n] ?? 0] ?? rasgo) + 0.65 * normal();
            let v = Math.max(min, Math.min(max, Math.round(centro + z * (max - min) / 5)));
            if (descuidado === 'plano') v = Math.max(min, Math.min(max, fijo));
            if (descuidado === 'omite' && rnd() < 0.3) v = -99;
            r[item.n] = v;
          }
          const seg = descuidado === 'rapido' ? inst.items.length * (0.8 + rnd()) : inst.items.length * (4 + 6 * rnd());
          const ini = new Date(t0 + (m.orden - 1) * 7 * 864e5);
          const fin = new Date(ini.getTime() + seg * 1000);
          p.respuestas[claveRespuesta(m.id, id)] = {
            momentoId: m.id, instrumentoId: id, respuestas: r,
            estado: completo ? 'enviado' : 'borrador', inicio: ini.toISOString(), actualizado: fin.toISOString(), ...(completo ? { enviado: fin.toISOString() } : {})
          };
        }
      }
    }
    db.participantes[correo] = p;
  }
  escribir(db);
}

export async function vaciarDemo() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(SESION); } catch {}
  leer();
}

