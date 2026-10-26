// Pruebas de dominio: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { INSTRUMENTOS, INSTRUMENTO, NO_RESPONDE, puntuaciones, varDim } from '../js/domain/instrumentos.js';
import { puntajesInstrumento, alfaCronbach, pearson, descriptivos, puntuar } from '../js/domain/puntajes.js';
import { rutValido, normalizarRut, correoValido, dvRut } from '../js/domain/identidad.js';
import { construirBases, aSalida, aCSV, sintaxisSPSS, idSeudonimo, libroDeCodigos } from '../js/domain/exportar.js';
import { configInicial, necesitaConsentimiento } from '../js/domain/modelo.js';

test('estructura de instrumentos', () => {
  const n = Object.fromEntries(INSTRUMENTOS.map(i => [i.id, i.items.length]));
  assert.deepEqual(n, { eme: 28, ipaa: 12, eapesa: 10, perma: 23 });
  for (const inst of INSTRUMENTOS) {
    const ids = new Set(inst.items.map(i => i.n));
    for (const p of puntuaciones(inst)) for (const it of p.items || []) assert.ok(ids.has(it), `${inst.id} ${p.id} ítem ${it}`);
  }
  // EME: cada ítem pertenece a exactamente una subescala
  const eme = INSTRUMENTO.eme.dimensiones.flatMap(d => d.items).sort((a, b) => a - b);
  assert.deepEqual(eme, Array.from({ length: 28 }, (_, i) => i + 1));
  // IPAA: subescalas Bruna et al. cubren los 12 ítems
  assert.equal(new Set(INSTRUMENTO.ipaa.dimensiones.flatMap(d => d.items)).size, 12);
  // PERMA: orden y códigos de la versión V1.0
  assert.deepEqual(INSTRUMENTO.perma.items.slice(0, 7).map(i => i.codigo), ['M1', 'A1', 'E1', 'H1', 'P1', 'R1', 'N1']);
  assert.equal(INSTRUMENTO.perma.dimensiones.find(d => d.id === 'Global').items.length, 16);
});

test('RUT y correo', () => {
  assert.equal(dvRut('22508532'), '3');
  assert.ok(rutValido('22.508.532-3'));
  assert.ok(!rutValido('22.508.532-4'));
  assert.equal(normalizarRut('22.508.532-3'), '22508532-3');
  assert.ok(rutValido('12345678-5'));
  assert.ok(correoValido('F.Guerrero@UDD.cl'));
  assert.ok(!correoValido('alguien@gmail.com'));
  assert.ok(!correoValido('a@udd.cl.com'));
});

test('puntaje PERMA global y tolerancia a perdidos', () => {
  const r = Object.fromEntries(INSTRUMENTO.perma.items.map(i => [i.n, i.n % 11]));
  const p = puntajesInstrumento(INSTRUMENTO.perma, r);
  const g = [5, 10, 22, 3, 11, 21, 6, 15, 19, 1, 9, 17, 2, 8, 16, 23].map(n => n % 11);
  assert.equal(p.PERMA_Global, g.reduce((a, b) => a + b) / 16);
  // Dimensión de 3 ítems con un perdido → vacía
  assert.equal(puntajesInstrumento(INSTRUMENTO.perma, { ...r, 5: NO_RESPONDE }).PERMA_P, null);
  // Dimensión de 5 ítems tolera uno
  assert.equal(puntuar({ 2: 4, 4: 4, 7: 2, 9: NO_RESPONDE, 11: 2 }, [2, 4, 7, 9, 11]), 3);
});

test('alfa de Cronbach contra valor conocido', () => {
  // Datos con α = 0,9 conocido (ejemplo clásico de 3 ítems)
  const m = [[1, 1, 1], [2, 2, 3], [3, 3, 3], [4, 5, 4], [5, 5, 5], [2, 1, 2]];
  const a = alfaCronbach(m);
  assert.ok(a > 0.95 && a < 1, `α = ${a}`);
  assert.equal(pearson([1, 2, 3, 4], [2, 4, 6, 8]).toFixed(6), '1.000000');
  assert.equal(descriptivos([1, 2, 3, 4]).mediana, 2.5);
});

test('exportación: filas, perdidos y SPSS', () => {
  const config = configInicial();
  const participantes = [
    { correo: 'a@udd.cl', nombre: 'A B', rut: '12345678-5', consentimiento: { acepta: true, fecha: '2026-10-01T10:00:00Z', version: 'V3.0' } },
    { correo: 'b@udd.cl', nombre: 'C D', rut: '22508532-3', consentimiento: { acepta: false, fecha: '2026-10-01T10:00:00Z', version: 'V3.0' } }
  ];
  const r12 = Object.fromEntries(INSTRUMENTO.ipaa.items.map(i => [String(i.n), 3]));
  r12['4'] = NO_RESPONDE;
  const respuestas = [
    { correo: 'a@udd.cl', clave: 'm1__ipaa', momentoId: 'm1', instrumentoId: 'ipaa', estado: 'enviado', respuestas: r12, enviado: '2026-10-01T10:10:00Z' },
    { correo: 'b@udd.cl', clave: 'm1__ipaa', momentoId: 'm1', instrumentoId: 'ipaa', estado: 'enviado', respuestas: r12 }
  ];
  const b = construirBases({ config, participantes, respuestas, momentoIds: ['m1'] });
  assert.equal(b.recod.length, 1, 'quien no acepta no entra a la base');
  assert.equal(b.cruda[0].IPAA_04, 'Prefiero no responder');
  assert.equal(b.recod[0].IPAA_Evaluacion, 3);
  const spss = aSalida(b.recod, b.colsRec, 'spss');
  const jasp = aSalida(b.recod, b.colsRec, 'jasp');
  assert.equal(spss[0].IPAA_04, NO_RESPONDE);
  assert.equal(jasp[0].IPAA_04, '');
  assert.equal(spss[0].EME_01, '', 'instrumento sin respuesta queda vacío');
  const seud = construirBases({ config, participantes, respuestas, momentoIds: ['m1'], seudonimizar: true });
  assert.ok(!('CORREO' in seud.recod[0]));
  assert.equal(seud.recod[0].ID, idSeudonimo('a@udd.cl'));
  const sps = sintaxisSPSS(b.colsRec);
  assert.match(sps, /MISSING VALUES[\s\S]*\(-99\)/);
  assert.match(sps, /IPAA_Planificacion/);
  assert.ok(aCSV(jasp, b.colsRec).startsWith('﻿ID,CORREO'));
  assert.ok(libroDeCodigos().length > 100);
});

test('consentimiento por momento', () => {
  const { m1, m2 } = configInicial().momentos;
  const nuevo = { correo: 'a@udd.cl' };
  const ci = { acepta: true, fecha: 'x', version: 'V3.0' };
  assert.equal(necesitaConsentimiento(nuevo, m2), true, 'quien nunca decidió lo ve siempre');
  assert.equal(necesitaConsentimiento({ consentimiento: ci, consentimientos: { m1: ci } }, m1), false);
  assert.equal(necesitaConsentimiento({ consentimiento: ci, consentimientos: { m1: ci } }, m2), false, 'm2 no lo pide');
  assert.equal(necesitaConsentimiento({ consentimiento: ci, consentimientos: { m1: ci } }, { ...m2, pedirConsentimiento: true }), true);
});

// Réplica exacta de los puntajes de la base de mayo (n = 147) si se entrega
// el archivo de prueba (solo números, sin identificadores):
//   AMA_FIXTURE_MAYO=/ruta/may_scores.json npm test
const fixture = process.env.AMA_FIXTURE_MAYO;
test('puntajes idénticos a la base de mayo', { skip: !fixture || !fs.existsSync(fixture) }, () => {
  const casos = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  const mapa = {
    EAPESA_Total_10items: ['eapesa', 'Total_10items'], EAPESA_Total_9items_sinItem9: ['eapesa', 'Total_9items_sinItem9'],
    IPAA_Total_12items: ['ipaa', 'Total'], IPAA_Planificacion_3items: ['ipaa', 'Planificacion'],
    IPAA_Ejecucion_4items: ['ipaa', 'Ejecucion'], IPAA_Evaluacion_5items: ['ipaa', 'Evaluacion']
  };
  let comparaciones = 0;
  for (const c of casos) {
    const resp = {
      eapesa: Object.fromEntries(c.items.slice(0, 10).map((v, i) => [i + 1, v])),
      ipaa: Object.fromEntries(c.items.slice(10, 22).map((v, i) => [i + 1, v])),
      eme: Object.fromEntries(c.items.slice(22, 50).map((v, i) => [i + 1, v]))
    };
    for (const [col, esperado] of Object.entries(c.scores)) {
      const [inst, dim] = mapa[col] || ['eme', col.replace(/^EME_/, '')];
      const obtenido = puntajesInstrumento(INSTRUMENTO[inst], resp[inst])[varDim(INSTRUMENTO[inst], dim)];
      assert.ok(Math.abs(obtenido - esperado) < 1e-9, `${col}: ${obtenido} ≠ ${esperado}`);
      comparaciones++;
    }
  }
  assert.equal(comparaciones, casos.length * 14);
});

test('analítica: calidad de respuesta y variables generales', async () => {
  const { calidadDe, prepararDatos, VARIABLES_GENERALES } = await import('../js/domain/analitica.js');
  const plano = Object.fromEntries(INSTRUMENTO.eapesa.items.map(i => [i.n, 3]));
  const q = calidadDe({ instrumentoId: 'eapesa', respuestas: plano, inicio: '2026-10-01T10:00:00Z', enviado: '2026-10-01T10:00:12Z' });
  assert.deepEqual(q.motivos, ['rápida', 'misma opción en todo']);
  const variado = Object.fromEntries(INSTRUMENTO.eapesa.items.map(i => [i.n, (i.n % 4) + 1]));
  assert.deepEqual(calidadDe({ instrumentoId: 'eapesa', respuestas: variado, inicio: '2026-10-01T10:00:00Z', enviado: '2026-10-01T10:02:00Z' }).motivos, []);
  assert.deepEqual(VARIABLES_GENERALES.map(v => v.variable), ['EME_MI_Global', 'IPAA_Total', 'EAPESA_Total_10items', 'PERMA_Global']);
  const config = configInicial();
  const participantes = [{ correo: 'a@udd.cl', nombre: 'A B', cohorte: '2026', consentimiento: { acepta: true } }, { correo: 'b@udd.cl', nombre: 'C D', cohorte: '2025', consentimiento: { acepta: true } }];
  const resp = c => ({ correo: c, clave: 'm2__eapesa', momentoId: 'm2', instrumentoId: 'eapesa', estado: 'enviado', respuestas: variado, inicio: '2026-10-01T10:00:00Z', enviado: '2026-10-01T10:02:00Z' });
  const D = prepararDatos({ config, participantes, respuestas: [resp('a@udd.cl'), resp('b@udd.cl')], cohorte: '2026' });
  assert.equal(D.personas.length, 1);
  assert.deepEqual(D.cohortes, ['2025', '2026']);
});

test('diseño contrabalanceado y nómina', async () => {
  const M = await import('../js/domain/modelo.js');
  const N = await import('../js/domain/nomina.js');
  const c = M.configInicial();
  assert.deepEqual(M.instrumentosPara(c, c.momentos.m1, 1), ['eme', 'eapesa']);
  assert.deepEqual(M.instrumentosPara(c, c.momentos.m1, 2), ['perma', 'ipaa']);
  assert.deepEqual(M.instrumentosPara(c, c.momentos.m2, 1), ['perma', 'ipaa']);
  assert.equal(M.bloqueDe(c, c.momentos.m2, 2), 'A');
  const items = b => c.diseno.bloques[b].instrumentos.reduce((a, id) => a + INSTRUMENTO[id].items.length, 0);
  assert.equal(items('A'), 38); assert.equal(items('B'), 35);
  // aleatorización reproducible e independiente del orden de entrada
  const a1 = M.aleatorizarOrdenes(['c@udd.cl', 'a@udd.cl', 'b@udd.cl'], 123);
  const a2 = M.aleatorizarOrdenes(['a@udd.cl', 'b@udd.cl', 'c@udd.cl'], 123);
  assert.deepEqual(a1, a2);
  const grande = M.aleatorizarOrdenes(Array.from({ length: 2000 }, (_, i) => `x${i}@udd.cl`), 9);
  const p1 = grande.filter(x => x.orden === 1).length / 2000;
  assert.ok(p1 > 0.46 && p1 < 0.54, `proporción ${p1}`);
  // lista de curso UDD: encabezado institucional + fila de columnas
  const tabla = [['Universidad del Desarrollo'], [], ['Lista de Curso X'], ['Num', 'Carrera', 'RUN', 'Numero_Matricula', 'Correo', 'Nombre_Alumno'],
    ['1', '1500C', '12345678-5', '202611500C001', 'A.Perez@udd.cl', 'PÉREZ, ANA'], ['2', '1500C', '1-9', '202511500C002', 'malo@gmail.com', 'X'], ['3', '1500C', '22508532-3', '202611500C003', 'a.perez@udd.cl', 'dup']];
  const r = N.leerNomina(tabla, { seccion: N.seccionDesdeArchivo('ListaDefinitiva_ITH129ASCT_3__2026_2_3.xlsx') });
  assert.equal(r.validos.length, 1); assert.equal(r.invalidos.length, 1); assert.equal(r.duplicados, 1);
  assert.deepEqual(r.validos[0], { correo: 'a.perez@udd.cl', nombre: 'PÉREZ, ANA', rut: '12345678-5', matricula: '202611500C001', seccion: 'ITH129ASCT-3' });
  // consentimiento: cambio de versión obliga a responder de nuevo
  assert.equal(M.necesitaConsentimiento({ consentimiento: { acepta: true, version: 'V3.0' } }, c.momentos.m2, 'V4.0'), true);
  assert.equal(M.necesitaConsentimiento({ consentimiento: { acepta: true, version: 'V4.0' } }, c.momentos.m2, 'V4.0'), false);
});

test('criterio de faltantes del protocolo V7.0 (≥ 75 % respondido)', () => {
  const N = NO_RESPONDE;
  assert.equal(puntuar({ 1: 4, 2: 6, 3: N, 4: 5 }, [1, 2, 3, 4]), 5);      // 3 de 4 = 75 % → se calcula
  assert.equal(puntuar({ 1: 4, 2: N, 3: N, 4: 5 }, [1, 2, 3, 4]), null);   // 2 de 4 → faltante
  assert.equal(puntuar({ 1: 7, 2: 8, 3: N }, [1, 2, 3]), null);            // 2 de 3 = 67 % → faltante
  assert.equal(puntuar({ 1: 7, 2: 8, 3: 9 }, [1, 2, 3]), 8);
});

test('criterio de inclusión por año de matrícula', async () => {
  const { enCriterio, fueraDeCriterio } = await import('../js/domain/nomina.js');
  assert.equal(enCriterio({ matricula: '2026123' }, '2026'), true);
  assert.equal(enCriterio({ matricula: '2025001' }, '2026'), false);
  assert.equal(enCriterio({}, '2026'), true);
  const nomina = [{ correo: 'a@udd.cl', matricula: '2026001' }, { correo: 'b@udd.cl', matricula: '2024001' }];
  assert.deepEqual([...fueraDeCriterio(nomina, 2026)], ['b@udd.cl']);
  const config = configInicial(); config.cohorte = '2026';
  const ci = { acepta: true, fecha: '2026-10-27T10:00:00Z', version: 'V4.0' };
  const participantes = [{ correo: 'a@udd.cl', nombre: 'A', cohorte: '2026', consentimiento: ci }, { correo: 'b@udd.cl', nombre: 'B', cohorte: '2026', consentimiento: ci }];
  const resp = Object.fromEntries(INSTRUMENTO.eapesa.items.map(i => [i.n, 3]));
  const respuestas = participantes.map(p => ({ correo: p.correo, momentoId: 'm1', instrumentoId: 'eapesa', clave: 'm1__eapesa', estado: 'enviado', respuestas: resp, enviado: '2026-10-27T10:10:00Z' }));
  const base = { config, participantes, respuestas, momentoIds: ['m1', 'm2'], nomina, porEstudiante: true };
  const sin = construirBases(base), con = construirBases({ ...base, incluirFueraCriterio: true });
  assert.equal(sin.recod.length, 1);
  assert.equal(con.recod.length, 2);
  assert.deepEqual(con.recod.map(f => f.EN_CRITERIO), [1, 0]);
});
