// Pruebas de firestore.rules contra el emulador.
// Requiere: npm i -D firebase @firebase/rules-unit-testing  y  Java.
// Uso: npm run test:reglas
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, getDocs, collectionGroup } from 'firebase/firestore';

let env;
const CORREO = 'ana.perez@udd.cl';
const RUT = '12345678-5';

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'nonio-test',
    firestore: { rules: fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 }
  });
});
after(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'amaAdmins/profe'), { email: 'profe@gmail.com' });
    await setDoc(doc(db, 'amaCodigos/AMA-M1'), { momentoId: 'm1' });
    await setDoc(doc(db, 'amaCodigos/AMA-M2'), { momentoId: 'm2' });
    await setDoc(doc(db, 'amaConfig/estudio'), {
      cohorte: '2026',
      momentos: {
        m1: { id: 'm1', estado: 'abierto', instrumentos: ['eme', 'ipaa'] },
        m2: { id: 'm2', estado: 'borrador', instrumentos: ['perma'] }
      }
    });
    await setDoc(doc(db, 'amaCodigos/AMA-S1'), { momentoId: 's1' });
  });
});

const alumno = uid => env.authenticatedContext(uid).firestore();
const nuevo = (uid, extra = {}) => ({ correo: CORREO, nombre: 'Ana Pérez', rut: RUT, codigo: 'AMA-M1', uids: [uid], ...extra });
async function registrarYConsentir(uid = 'dev1') {
  const db = alumno(uid);
  await setDoc(doc(db, `amaParticipantes/${CORREO}`), nuevo(uid));
  await assertSucceeds(updateDoc(doc(db, `amaParticipantes/${CORREO}`), { consentimiento: { acepta: true, version: 'V3.0' }, 'consentimientos.m1': { acepta: true, version: 'V3.0' } }));
  return db;
}
const resp = (extra = {}) => ({ momentoId: 'm1', instrumentoId: 'ipaa', codigo: 'AMA-M1', estado: 'borrador', respuestas: { 1: 3 }, ...extra });

test('alta válida y rechazos', async () => {
  const db = alumno('dev1');
  await assertFails(setDoc(doc(db, 'amaParticipantes/x@gmail.com'), { ...nuevo('dev1'), correo: 'x@gmail.com' }));
  await assertFails(setDoc(doc(db, `amaParticipantes/${CORREO}`), nuevo('dev1', { codigo: 'FALSO' })));
  await assertFails(setDoc(doc(db, `amaParticipantes/${CORREO}`), nuevo('otro')));
  await assertFails(setDoc(doc(db, `amaParticipantes/${CORREO}`), nuevo('dev1', { consentimiento: { acepta: true } })));
  await assertSucceeds(setDoc(doc(db, `amaParticipantes/${CORREO}`), nuevo('dev1')));
});

test('la cohorte debe ser la vigente', async () => {
  const db = alumno('dev1');
  await assertFails(setDoc(doc(db, `amaParticipantes/${CORREO}`), nuevo('dev1', { cohorte: '1999' })));
  await assertSucceeds(setDoc(doc(db, `amaParticipantes/${CORREO}`), nuevo('dev1', { cohorte: '2026' })));
});

test('otro dispositivo necesita el RUT correcto', async () => {
  await registrarYConsentir('dev1');
  const db2 = alumno('dev2');
  await assertFails(getDoc(doc(db2, `amaParticipantes/${CORREO}`)));
  await assertFails(updateDoc(doc(db2, `amaParticipantes/${CORREO}`), { uids: arrayUnion('dev2'), rutIntento: '11111111-1', codigo: 'AMA-M1' }));
  await assertSucceeds(updateDoc(doc(db2, `amaParticipantes/${CORREO}`), { uids: arrayUnion('dev2'), rutIntento: RUT, codigo: 'AMA-M1' }));
  await assertSucceeds(getDoc(doc(db2, `amaParticipantes/${CORREO}`)));
});

test('el miembro no puede cambiar RUT ni dispositivos', async () => {
  const db = await registrarYConsentir();
  await assertFails(updateDoc(doc(db, `amaParticipantes/${CORREO}`), { rut: '22508532-3' }));
  await assertFails(updateDoc(doc(db, `amaParticipantes/${CORREO}`), { uids: ['dev1', 'intruso'] }));
});

test('respuestas: momento abierto, bloqueo al enviar y reapertura docente', async () => {
  const db = await registrarYConsentir();
  const ref = doc(db, `amaParticipantes/${CORREO}/respuestas/m1__ipaa`);
  await assertSucceeds(setDoc(ref, resp()));
  await assertFails(setDoc(doc(db, `amaParticipantes/${CORREO}/respuestas/m2__perma`), resp({ momentoId: 'm2', instrumentoId: 'perma', codigo: 'AMA-M2' })));
  await assertFails(setDoc(doc(db, `amaParticipantes/${CORREO}/respuestas/m1__perma`), resp({ instrumentoId: 'perma' })));
  await assertFails(setDoc(doc(db, `amaParticipantes/${CORREO}/respuestas/m1__eme`), resp({ instrumentoId: 'eme', codigo: 'AMA-M2' })));
  await assertSucceeds(setDoc(ref, resp({ estado: 'enviado' }), { merge: true }));
  await assertFails(setDoc(ref, resp({ respuestas: { 1: 1 } }), { merge: true }));
  const profe = env.authenticatedContext('profe').firestore();
  await assertSucceeds(updateDoc(doc(profe, `amaParticipantes/${CORREO}/respuestas/m1__ipaa`), { estado: 'borrador' }));
  await assertSucceeds(setDoc(ref, resp({ respuestas: { 1: 1 } }), { merge: true }));
});

test('sin consentimiento no se responde', async () => {
  const db = alumno('dev1');
  await setDoc(doc(db, `amaParticipantes/${CORREO}`), nuevo('dev1'));
  await assertFails(setDoc(doc(db, `amaParticipantes/${CORREO}/respuestas/m1__ipaa`), resp()));
});

test('lecturas globales solo docentes; códigos no listables', async () => {
  await registrarYConsentir();
  const intruso = alumno('intruso');
  await assertFails(getDocs(collection(intruso, 'amaParticipantes')));
  await assertFails(getDocs(collectionGroup(intruso, 'respuestas')));
  await assertFails(getDocs(collection(intruso, 'amaCodigos')));
  await assertSucceeds(getDoc(doc(intruso, 'amaCodigos/AMA-M1')));
  await assertFails(setDoc(doc(intruso, 'amaAdmins/intruso'), { x: 1 }));
  await assertFails(setDoc(doc(intruso, 'amaConfig/estudio'), { momentos: {} }));
  const profe = env.authenticatedContext('profe').firestore();
  await assertSucceeds(getDocs(collection(profe, 'amaParticipantes')));
  await assertSucceeds(getDocs(collectionGroup(profe, 'respuestas')));
});

// ---------- Diseño contrabalanceado ----------
async function configCruzada() {
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'amaConfig/estudio'), {
      cohorte: '2026',
      diseno: { tipo: 'contrabalanceado', bloques: { A: { id: 'A', instrumentos: ['eme', 'eapesa'] }, B: { id: 'B', instrumentos: ['perma', 'ipaa'] } } },
      momentos: { s1: { id: 's1', estado: 'abierto', bloquePorOrden: { 1: 'A', 2: 'B' }, instrumentos: ['eme', 'ipaa', 'eapesa', 'perma'] } }
    });
  });
}
const respS1 = inst => ({ momentoId: 's1', instrumentoId: inst, codigo: 'AMA-S1', estado: 'borrador', respuestas: { 1: 3 } });

test('contrabalanceado: solo el bloque del orden del estudiante', async () => {
  await configCruzada();
  const db = await registrarYConsentir();
  await assertSucceeds(setDoc(doc(db, `amaNomina/${CORREO}`), { correo: CORREO, orden: 2, origen: 'entrada' }));
  await assertFails(setDoc(doc(db, `amaParticipantes/${CORREO}/respuestas/s1__eme`), respS1('eme')));
  await assertSucceeds(setDoc(doc(db, `amaParticipantes/${CORREO}/respuestas/s1__perma`), respS1('perma')));
});

test('nómina: el estudiante no puede elegir ni cambiar su orden', async () => {
  await configCruzada();
  const db = await registrarYConsentir();
  await assertFails(setDoc(doc(db, `amaNomina/${CORREO}`), { correo: CORREO, orden: 1, origen: 'aleatorizacion' }));
  await assertFails(setDoc(doc(db, `amaNomina/otro@udd.cl`), { correo: 'otro@udd.cl', orden: 1, origen: 'entrada' }));
  await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), `amaNomina/${CORREO}`), { correo: CORREO, orden: 1, origen: 'aleatorizacion' }); });
  await assertFails(setDoc(doc(db, `amaNomina/${CORREO}`), { correo: CORREO, orden: 2, origen: 'entrada' }, { merge: true }));
  await assertSucceeds(getDoc(doc(db, `amaNomina/${CORREO}`)));
  await assertFails(getDocs(collection(alumno('intruso'), 'amaNomina')));
});
