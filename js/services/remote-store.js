// Nonio · adaptador Firestore. Misma API que local-store.js.
// El SDK se carga desde el CDN de Google (sin bundler). Los alumnos usan
// autenticación anónima; la identidad de investigación es el correo que
// escriben, protegido por el código de acceso y por el RUT al reclamarlo
// desde otro dispositivo (ver firestore.rules).

import { firebaseConfig, SDK, useEmulators, emulatorPorts, paths } from './firebase-config.js';
import { normalizarCodigo } from '../domain/identidad.js';
import { VERSION } from '../domain/consentimiento.js';
import { claveRespuesta, configInicial, esContrabalanceado, aleatorizarOrdenes } from '../domain/modelo.js';

export const modo = 'firebase';
const SESION = 'ama:sesion';

let fb = null;
async function sdk() {
  if (fb) return fb;
  const [app, auth, fs] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`)
  ]);
  // Alumno y panel usan instancias separadas: así la sesión anónima del
  // alumno y la sesión Google del docente no se pisan en el mismo navegador
  // (entrar o salir del panel en otra pestaña cerraba la sesión del alumno).
  const nombre = (typeof location !== 'undefined' && /panel(\.html)?$/.test(location.pathname)) ? 'nonio-docente' : 'nonio-alumno';
  const instancia = app.initializeApp(firebaseConfig, nombre);
  const a = auth.getAuth(instancia);
  const db = fs.getFirestore(instancia);
  if (useEmulators) {
    auth.connectAuthEmulator(a, `http://localhost:${emulatorPorts.auth}`, { disableWarnings: true });
    fs.connectFirestoreEmulator(db, 'localhost', emulatorPorts.firestore);
  }
  fb = { app: instancia, auth: a, db, A: auth, F: fs };
  return fb;
}

const usuarioActual = auth => new Promise(res => {
  const off = auth.onAuthStateChanged(u => { off(); res(u); });
});

async function anonimo() {
  const { auth, A } = await sdk();
  const u = auth.currentUser || await usuarioActual(auth);
  if (u) return u;
  return (await A.signInAnonymously(auth)).user;
}

const iso = v => (v && typeof v.toDate === 'function') ? v.toDate().toISOString() : (v ?? null);
function plano(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (typeof obj.toDate === 'function') return iso(obj);
  if (Array.isArray(obj)) return obj.map(plano);
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, plano(v)]));
}
const error = (code, message) => Object.assign(new Error(message), { code });
const denegado = e => e?.code === 'permission-denied';

// ---------- Alumno ----------
export async function cargarConfig() {
  const { db, F } = await sdk();
  const snap = await F.getDoc(F.doc(db, paths.config, 'estudio'));
  return snap.exists() ? plano(snap.data()) : configInicial();
}

export async function resolverCodigo(codigo) {
  const cod = normalizarCodigo(codigo);
  if (!cod) return null;
  const { db, F } = await sdk();
  await anonimo();
  const snap = await F.getDoc(F.doc(db, paths.codigos, cod));
  return snap.exists() ? snap.data().momentoId : null;
}

export async function ingresar({ correo, nombre, rut, codigo }) {
  const cod = normalizarCodigo(codigo);
  const momentoId = await resolverCodigo(cod);
  if (!momentoId) throw error('codigo-invalido', 'El código de acceso no es válido.');
  const { db, F } = await sdk();
  const user = await anonimo();
  const ref = F.doc(db, paths.participantes, correo);
  let existe = false, miembro = false, datos = null;
  try {
    const snap = await F.getDoc(ref);
    existe = snap.exists();
    miembro = existe;
    datos = existe ? snap.data() : null;
  } catch (e) {
    if (!denegado(e)) throw e;
    existe = true; // existe y este dispositivo aún no es miembro
  }
  if (!existe) {
    await F.setDoc(ref, {
      correo, nombre, rut, codigo: cod, uids: [user.uid], cohorte: String((await cargarConfig()).cohorte || ''),
      creado: F.serverTimestamp(), ultimoIngreso: F.serverTimestamp()
    });
  } else if (!miembro) {
    try {
      await F.updateDoc(ref, {
        uids: F.arrayUnion(user.uid), rutIntento: rut, codigo: cod, ultimoIngreso: F.serverTimestamp()
      });
    } catch (e) {
      if (denegado(e)) throw error('rut-no-coincide', 'Este correo ya está registrado con otro RUT. Revisa tu RUT o escribe al investigador.');
      throw e;
    }
  } else {
    if (datos.rut !== rut) throw error('rut-no-coincide', 'Este correo ya está registrado con otro RUT. Revisa tu RUT o escribe al investigador.');
    await F.updateDoc(ref, { codigo: cod, ultimoIngreso: F.serverTimestamp() });
  }
  const snap = await F.getDoc(ref);
  try { localStorage.setItem(SESION, JSON.stringify({ correo, codigo: cod })); } catch {}
  return { participante: publico(snap.data()), momentoId };
}

const publico = d => { const { uids, rutIntento, ...resto } = plano(d); return resto; };

export async function sesionActual() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SESION)); } catch {}
  if (!s?.correo) return null;
  const { db, F } = await sdk();
  await anonimo();
  try {
    const snap = await F.getDoc(F.doc(db, paths.participantes, s.correo));
    if (!snap.exists()) return null;
    const momentoId = await resolverCodigo(s.codigo);
    return { participante: publico(snap.data()), momentoId, codigo: s.codigo };
  } catch { return null; }
}

export async function salir() { try { localStorage.removeItem(SESION); } catch {} }

export async function guardarConsentimiento(correo, acepta, momentoId = null, { excluyeMayo = false } = {}) {
  const { db, F } = await sdk();
  const ex = Boolean(acepta && excluyeMayo);
  const registro = { acepta, excluyeMayo: ex, fecha: new Date().toISOString(), version: VERSION, momentoId };
  const cambios = {
    consentimiento: { acepta, excluyeMayo: ex, fecha: F.serverTimestamp(), version: VERSION, momentoId },
    historialConsentimiento: F.arrayUnion(registro)
  };
  if (momentoId) cambios[`consentimientos.${momentoId}`] = { acepta, excluyeMayo: ex, fecha: F.serverTimestamp(), version: VERSION };
  await F.updateDoc(F.doc(db, paths.participantes, correo), cambios);
  return registro;
}

// Orden (1 | 2) del estudiante. Si no está en la nómina, se le asigna uno al
// azar al entrar (origen 'entrada'); las reglas solo permiten crearlo así.
export async function asegurarOrden(correo) {
  const { db, F } = await sdk();
  const config = await cargarConfig();
  if (!esContrabalanceado(config)) return null;
  const ref = F.doc(db, paths.nomina, correo);
  const snap = await F.getDoc(ref);
  if (snap.exists() && snap.data().orden) return snap.data().orden;
  const orden = crypto.getRandomValues(new Uint32Array(1))[0] % 2 === 0 ? 1 : 2;
  await F.setDoc(ref, { correo, orden, origen: 'entrada', asignado: F.serverTimestamp() }, { merge: true });
  return orden;
}

export async function respuestasDe(correo) {
  const { db, F } = await sdk();
  const snap = await F.getDocs(F.collection(db, paths.participantes, correo, paths.respuestas));
  const out = {};
  snap.forEach(d => { out[d.id] = plano(d.data()); });
  return out;
}

async function escribirRespuesta(correo, momentoId, instId, respuestas, estado, { primera = false } = {}) {
  const { db, F } = await sdk();
  let codigo = null;
  try { codigo = JSON.parse(localStorage.getItem(SESION))?.codigo; } catch {}
  const ref = F.doc(db, paths.participantes, correo, paths.respuestas, claveRespuesta(momentoId, instId));
  const datos = {
    momentoId, instrumentoId: instId, codigo, estado,
    respuestas: Object.fromEntries(Object.entries(respuestas).map(([k, v]) => [String(k), v])),
    actualizado: F.serverTimestamp()
  };
  if (estado === 'enviado') datos.enviado = F.serverTimestamp();
  if (primera) datos.inicio = F.serverTimestamp(); // para medir tiempo de respuesta
  try {
    await F.setDoc(ref, datos, { merge: true });
  } catch (e) {
    if (denegado(e)) throw await motivoBloqueo({ correo, momentoId, instId, codigo, ref });
    throw e;
  }
}

// Cuando las reglas rechazan una escritura, averigua la causa concreta para
// decirle al alumno qué hacer. Cada lectura es tolerante a fallos.
async function motivoBloqueo({ correo, momentoId, instId, codigo, ref }) {
  const { db, F } = await sdk();
  const leer = async r => { try { const x = await F.getDoc(r); return x.exists() ? x.data() : null; } catch { return undefined; } };
  const part = await leer(F.doc(db, paths.participantes, correo));
  if (!part) return error('sesion', 'Tu sesión ya no es válida en este dispositivo. Sal y vuelve a ingresar con tu correo, RUT y el código: tus respuestas guardadas no se pierden.');
  const doc = await leer(ref);
  if (doc?.estado === 'enviado') return error('enviado', 'Este cuestionario ya fue enviado y no se puede modificar.');
  const config = await leer(F.doc(db, paths.config, 'estudio'));
  const mom = config?.momentos?.[momentoId];
  if (mom && mom.estado !== 'abierto') return error('cerrado', 'La sesión fue cerrada por el equipo investigador. Tus respuestas quedaron guardadas hasta la última que se registró.');
  const cod = codigo ? await leer(F.doc(db, paths.codigos, codigo)) : null;
  if (!cod || cod.momentoId !== momentoId) return error('codigo', 'El código de acceso cambió. Sal y vuelve a ingresar con el código nuevo: tus respuestas guardadas no se pierden.');
  if (!(part.consentimiento?.acepta)) return error('consentimiento', 'Falta tu consentimiento para guardar respuestas. Vuelve a la lista de cuestionarios.');
  return error('no-permitido', `No fue posible guardar ${instId.toUpperCase()}: este cuestionario no corresponde a tu bloque en esta sesión. Vuelve a la lista de cuestionarios.`);
}

export const guardarRespuestas = (c, m, i, r, o) => escribirRespuesta(c, m, i, r, 'borrador', o);
export const enviarRespuestas = (c, m, i, r, o) => escribirRespuesta(c, m, i, r, 'enviado', o);

// ---------- Docente ----------
async function esDocente(uid) {
  const { db, F } = await sdk();
  try { return (await F.getDoc(F.doc(db, paths.admins, uid))).exists(); } catch { return false; }
}

export async function restaurarDocente() {
  const { auth } = await sdk();
  const u = auth.currentUser || await usuarioActual(auth);
  if (!u || u.isAnonymous) return null;
  return (await esDocente(u.uid)) ? { uid: u.uid, email: u.email } : null;
}

export async function entrarDocente() {
  const { auth, A } = await sdk();
  const cred = await A.signInWithPopup(auth, new A.GoogleAuthProvider());
  if (!(await esDocente(cred.user.uid))) {
    const uid = cred.user.uid;
    await A.signOut(auth);
    throw error('no-docente', `Esta cuenta no está en el padrón docente. Pide que agreguen el UID ${uid} a ${paths.admins}.`);
  }
  return { uid: cred.user.uid, email: cred.user.email };
}

export async function salirDocente() {
  const { auth, A } = await sdk();
  await A.signOut(auth);
}

export async function guardarConfig(config) {
  const { db, F } = await sdk();
  await F.setDoc(F.doc(db, paths.config, 'estudio'), { ...config, actualizado: F.serverTimestamp() });
}

export async function codigosVigentes() {
  const { db, F } = await sdk();
  const snap = await F.getDoc(F.doc(db, paths.privado, 'codigos'));
  return snap.exists() ? snap.data() : {};
}

export async function fijarCodigo(momentoId, codigo) {
  const cod = normalizarCodigo(codigo);
  if (!cod) throw error('codigo', 'Código vacío.');
  const { db, F } = await sdk();
  const nuevo = F.doc(db, paths.codigos, cod);
  const existente = await F.getDoc(nuevo);
  if (existente.exists() && existente.data().momentoId !== momentoId) throw error('codigo-usado', 'Ese código ya lo usa otro momento.');
  const vigentes = await codigosVigentes();
  const batch = F.writeBatch(db);
  if (vigentes[momentoId] && vigentes[momentoId] !== cod) batch.delete(F.doc(db, paths.codigos, vigentes[momentoId]));
  batch.set(nuevo, { momentoId });
  batch.set(F.doc(db, paths.privado, 'codigos'), { ...vigentes, [momentoId]: cod });
  await batch.commit();
}

export async function listarParticipantes() {
  const { db, F } = await sdk();
  const snap = await F.getDocs(F.collection(db, paths.participantes));
  return snap.docs.map(d => publico(d.data()));
}

export async function listarRespuestas() {
  const { db, F } = await sdk();
  const snap = await F.getDocs(F.collectionGroup(db, paths.respuestas));
  return snap.docs.map(d => ({ correo: d.ref.parent.parent.id, clave: d.id, ...plano(d.data()) }));
}

export async function reabrir(correo, clave) {
  const { db, F, auth } = await sdk();
  await F.updateDoc(F.doc(db, paths.participantes, correo, paths.respuestas, clave), {
    estado: 'borrador',
    reaperturas: F.arrayUnion({ fecha: new Date().toISOString(), por: auth.currentUser?.email || '' })
  });
}

export async function eliminarParticipante(correo) {
  const { db, F } = await sdk();
  const resp = await F.getDocs(F.collection(db, paths.participantes, correo, paths.respuestas));
  const batch = F.writeBatch(db);
  resp.forEach(d => batch.delete(d.ref));
  batch.delete(F.doc(db, paths.participantes, correo));
  await batch.commit();
}

// ---------- Nómina y aleatorización (docentes) ----------
export async function listarNomina() {
  const { db, F } = await sdk();
  const snap = await F.getDocs(F.collection(db, paths.nomina));
  return snap.docs.map(d => plano(d.data()));
}

export async function registrosAleatorizacion() {
  const { db, F } = await sdk();
  const snap = await F.getDocs(F.collection(db, paths.aleatorizaciones));
  return snap.docs.map(d => plano(d.data())).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}

async function enLotes(cambios) {
  const { db, F } = await sdk();
  for (let i = 0; i < cambios.length; i += 400) {
    const b = F.writeBatch(db);
    cambios.slice(i, i + 400).forEach(fn => fn(b));
    await b.commit();
  }
}

export async function agregarNomina(filas) {
  const { db, F } = await sdk();
  const actuales = new Map((await listarNomina()).map(n => [n.correo, n]));
  let nuevos = 0;
  await enLotes(filas.map(f => b => {
    if (!actuales.has(f.correo)) nuevos++;
    const datos = { correo: f.correo, ...(f.nombre ? { nombre: f.nombre } : {}), ...(f.rut ? { rut: f.rut } : {}), ...(f.matricula ? { matricula: f.matricula } : {}), ...(f.seccion ? { seccion: f.seccion } : {}) };
    if (f.orden) Object.assign(datos, { orden: f.orden, origen: 'importado', asignado: F.serverTimestamp() });
    b.set(F.doc(db, paths.nomina, f.correo), datos, { merge: true });
  }));
  return { nuevos, total: new Set([...actuales.keys(), ...filas.map(f => f.correo)]).size };
}

export async function aleatorizar(semilla) {
  const { db, F, auth } = await sdk();
  const sinOrden = (await listarNomina()).filter(n => !n.orden).map(n => n.correo);
  const asign = aleatorizarOrdenes(sinOrden, semilla);
  const fecha = new Date().toISOString();
  await enLotes(asign.map(a => b => b.set(F.doc(db, paths.nomina, a.correo), { orden: a.orden, origen: 'aleatorizacion', asignado: fecha, semilla }, { merge: true })));
  const registro = { fecha, semilla, metodo: 'simple', n: asign.length, n1: asign.filter(a => a.orden === 1).length, n2: asign.filter(a => a.orden === 2).length, por: auth.currentUser?.email || '' };
  await F.addDoc(F.collection(db, paths.aleatorizaciones), registro);
  return registro;
}

export async function fijarOrden(correo, orden) {
  const { db, F } = await sdk();
  await F.setDoc(F.doc(db, paths.nomina, correo), { correo, orden, origen: 'manual', asignado: F.serverTimestamp() }, { merge: true });
}

export async function quitarDeNomina(correo) {
  const { db, F } = await sdk();
  await F.deleteDoc(F.doc(db, paths.nomina, correo));
}

// El panel refresca bajo demanda y cada 60 s; no se mantienen listeners
// abiertos sobre toda la colección para no multiplicar lecturas.
export function suscribir(fn) {
  const t = setInterval(fn, 60000);
  return () => clearInterval(t);
}
