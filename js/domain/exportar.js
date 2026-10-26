// Nonio · construcción de bases para exportar (funciones puras).
//
// Tres vistas de los mismos datos, una fila por participante y momento:
//   - cruda:        ítems con la etiqueta textual que vio el alumno.
//   - recodificada: ítems numéricos + puntuaciones por dimensión.
//   - spss/jasp:    recodificada con nombres de variable seguros, -99 para
//                   "Prefiero no responder" (SPSS) o vacío (JASP).

import { fueraDeCriterio } from './nomina.js';
import { INSTRUMENTOS, INSTRUMENTO, ESCALAS, NO_RESPONDE, varItem, varDim, puntuaciones, etiquetaDe } from './instrumentos.js';
import { puntajesInstrumento, itemsRecodificados } from './puntajes.js';
import { claveRespuesta, momentosOrdenados, cohorteDe, esContrabalanceado, bloqueDe } from './modelo.js';

// ID seudónimo estable derivado del correo (FNV-1a 32 bits, base 36).
export function idSeudonimo(correo) {
  let h = 0x811c9dc5;
  for (const ch of String(correo).toLowerCase()) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 'P' + h.toString(36).toUpperCase().padStart(7, '0');
}

const fecha = iso => iso ? String(iso).replace('T', ' ').slice(0, 19) : '';

// Instrumentos presentes en los momentos elegidos (en orden canónico).
export function instrumentosDeMomentos(config, momentoIds) {
  const set = new Set();
  for (const id of momentoIds) for (const i of config.momentos[id]?.instrumentos || []) set.add(i);
  return INSTRUMENTOS.filter(i => set.has(i.id));
}

export function construirBases({ config, participantes, respuestas, momentoIds, soloEnviados = true, seudonimizar = false, nomina = [], porEstudiante = false, incluirFueraCriterio = false }) {
  const momentos = momentosOrdenados(config).filter(m => momentoIds.includes(m.id));
  const insts = instrumentosDeMomentos(config, momentoIds);
  const porClave = new Map(respuestas.map(r => [`${r.correo}|${r.clave}`, r]));
  const cruz = esContrabalanceado(config);
  const ordenDe = new Map(nomina.filter(n => n.orden).map(n => [n.correo, Number(n.orden)]));
  const seccionDe = new Map(nomina.filter(n => n.seccion).map(n => [n.correo, n.seccion]));
  const fuera = fueraDeCriterio(nomina, config.cohorte);
  const conCriterio = nomina.some(n => n.matricula);

  const ident = seudonimizar
    ? ['ID']
    : ['ID', 'CORREO', 'NOMBRE', 'RUT'];
  const base = [...ident, 'COHORTE', ...(seccionDe.size ? ['SECCION'] : []), ...(conCriterio ? ['EN_CRITERIO'] : []), ...(cruz ? ['ORDEN', 'SECUENCIA'] : []), ...(porEstudiante ? [] : ['MOMENTO', ...(cruz ? ['BLOQUE'] : [])]),
    'CONSENTIMIENTO', 'CONSENTIMIENTO_FECHA', 'CONSENTIMIENTO_VERSION', 'CI_EXCLUYE_MAYO'];

  const colsCruda = [...base];
  const colsRec = [...base];
  for (const inst of insts) {
    const pref = inst.id.toUpperCase();
    const meta = [...(porEstudiante ? [`${pref}_SESION`] : []), `${pref}_ESTADO`, `${pref}_INICIO`, `${pref}_ENVIO`];
    colsCruda.push(...meta, ...inst.items.map(i => varItem(inst, i.n)));
    colsRec.push(...meta, ...inst.items.map(i => varItem(inst, i.n)), ...puntuaciones(inst).map(p => varDim(inst, p.id)));
  }

  // Unidad de fila: una sesión (participante × momento) o el estudiante completo.
  const unidades = porEstudiante ? [momentos] : momentos.map(m => [m]);
  const cruda = [], recod = [];
  const ordenados = [...participantes].sort((a, b) => a.correo.localeCompare(b.correo));
  for (const p of ordenados) {
    if (!p.consentimiento?.acepta) continue;
    if (!incluirFueraCriterio && fuera.has(p.correo)) continue;
    const orden = ordenDe.get(p.correo) ?? null;
    for (const unidad of unidades) {
      const docs = insts.map(inst => {
        for (const m of unidad) {
          const d = porClave.get(`${p.correo}|${claveRespuesta(m.id, inst.id)}`);
          if (!d || !m.instrumentos.includes(inst.id)) continue;
          if (soloEnviados && d.estado !== 'enviado') continue;
          return { d, m };
        }
        return null;
      });
      if (docs.every(x => !x)) continue;
      const m0 = unidad[0];
      const ci = (!porEstudiante && p.consentimientos?.[m0.id]) || p.consentimiento;

      const comun = {
        ID: idSeudonimo(p.correo),
        ...(seudonimizar ? {} : { CORREO: p.correo, NOMBRE: p.nombre, RUT: p.rut }),
        COHORTE: cohorteDe(p, config),
        ...(seccionDe.size ? { SECCION: seccionDe.get(p.correo) || '' } : {}),
        ...(conCriterio ? { EN_CRITERIO: fuera.has(p.correo) ? 0 : 1 } : {}),
        ...(cruz ? { ORDEN: orden ?? '', SECUENCIA: orden === 1 ? 'A-B' : orden === 2 ? 'B-A' : '' } : {}),
        ...(porEstudiante ? {} : { MOMENTO: m0.nombre, ...(cruz ? { BLOQUE: bloqueDe(config, m0, orden) || '' } : {}) }),
        CONSENTIMIENTO: 'Sí',
        CONSENTIMIENTO_FECHA: fecha(ci.fecha),
        CONSENTIMIENTO_VERSION: ci.version || '',
        CI_EXCLUYE_MAYO: p.consentimiento?.excluyeMayo ? 'Sí' : 'No'
      };
      const fc = { ...comun }, fr = { ...comun };
      insts.forEach((inst, k) => {
        const d = docs[k]?.d;
        const pref = inst.id.toUpperCase();
        const meta = {
          ...(porEstudiante ? { [`${pref}_SESION`]: docs[k]?.m.nombre || '' } : {}),
          [`${pref}_ESTADO`]: d ? d.estado : '',
          [`${pref}_INICIO`]: d ? fecha(d.inicio) : '',
          [`${pref}_ENVIO`]: d ? fecha(d.enviado) : ''
        };
        Object.assign(fc, meta);
        Object.assign(fr, meta);
        const r = normalizarRespuestas(d?.respuestas);
        for (const item of inst.items) {
          const v = r[item.n];
          fc[varItem(inst, item.n)] = v === undefined ? '' : etiquetaDe(inst, v);
          fr[varItem(inst, item.n)] = v === undefined ? null : v; // NO_RESPONDE se conserva aquí; ver aSalida()
        }
        if (d) Object.assign(fr, puntajesInstrumento(inst, r));
        else for (const pt of puntuaciones(inst)) fr[varDim(inst, pt.id)] = null;
      });
      cruda.push(fc);
      recod.push(fr);
    }
  }
  return { colsCruda, colsRec, cruda, recod, insts, momentos };
}

export const normalizarRespuestas = r =>
  Object.fromEntries(Object.entries(r || {}).map(([k, v]) => [Number(k), v]));

// Convierte la base recodificada para cada destino.
//  modo 'excel' / 'jasp': perdidos vacíos.  modo 'spss': "no responde" = -99.
export function aSalida(filas, cols, modo) {
  return filas.map(f => Object.fromEntries(cols.map(c => {
    let v = f[c];
    if (v === NO_RESPONDE) v = modo === 'spss' ? NO_RESPONDE : null;
    if (typeof v === 'number') v = Math.round(v * 10000) / 10000;
    return [c, v ?? ''];
  })));
}

export function aCSV(filas, cols, sep = ',') {
  const q = v => {
    const s = String(v ?? '');
    return /[",\n;\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cols.join(sep), ...filas.map(f => cols.map(c => q(f[c])).join(sep))].join('\r\n');
}

// Libro de códigos: una fila por variable.
export function libroDeCodigos(insts = INSTRUMENTOS) {
  const filas = [
    { variable: 'ID', etiqueta: 'Identificador seudónimo estable (derivado del correo)', instrumento: '', tipo: 'texto', valores: '' },
    { variable: 'CORREO', etiqueta: 'Correo institucional (llave de cruce con datos académicos)', instrumento: '', tipo: 'texto', valores: '' },
    { variable: 'NOMBRE', etiqueta: 'Nombre declarado', instrumento: '', tipo: 'texto', valores: '' },
    { variable: 'RUT', etiqueta: 'RUT normalizado (cuerpo-DV)', instrumento: '', tipo: 'texto', valores: '' },
    { variable: 'COHORTE', etiqueta: 'Cohorte (año de ingreso) al momento del registro', instrumento: '', tipo: 'texto', valores: '' },
    { variable: 'SECCION', etiqueta: 'Sección del curso según la nómina', instrumento: '', tipo: 'texto', valores: '' },
    { variable: 'EN_CRITERIO', etiqueta: 'Cumple el criterio de inclusión (matrícula de la cohorte del estudio)', instrumento: '', tipo: 'nominal', valores: '1 = Sí; 0 = No (otro año de ingreso)' },
    { variable: 'ORDEN', etiqueta: 'Orden asignado (1 = Bloque A en la sesión 1 y B en la 2; 2 = al revés)', instrumento: '', tipo: 'nominal', valores: '1; 2' },
    { variable: 'SECUENCIA', etiqueta: 'Secuencia de bloques', instrumento: '', tipo: 'texto', valores: 'A-B; B-A' },
    { variable: 'BLOQUE', etiqueta: 'Bloque respondido en esa sesión', instrumento: '', tipo: 'texto', valores: 'A; B' },
    { variable: 'CI_EXCLUYE_MAYO', etiqueta: 'Marcó la casilla de exclusión de sus respuestas de mayo de 2026 (CI V4.0)', instrumento: '', tipo: 'texto', valores: 'Sí; No' },
    { variable: 'MOMENTO', etiqueta: 'Momento de aplicación', instrumento: '', tipo: 'texto', valores: '' },
    { variable: 'CONSENTIMIENTO', etiqueta: 'Acepta participar', instrumento: '', tipo: 'texto', valores: 'Sí' },
    { variable: 'CONSENTIMIENTO_FECHA', etiqueta: 'Fecha y hora de aceptación (la de este momento si se pidió en él; si no, la última)', instrumento: '', tipo: 'fecha', valores: '' },
    { variable: 'CONSENTIMIENTO_VERSION', etiqueta: 'Versión del consentimiento aceptada', instrumento: '', tipo: 'texto', valores: '' }
  ];
  for (const inst of insts) {
    const pref = inst.id.toUpperCase();
    const esc = ESCALAS[inst.escala];
    const valores = inst.escala === 'perma11'
      ? '0–10 (anclas por ítem)'
      : esc.filter(o => o.etiqueta).map(o => `${o.valor} = ${o.etiqueta}`).join('; ');
    filas.push(
      { variable: `${pref}_SESION`, etiqueta: `${inst.sigla}: sesión en que se respondió (formato una fila por estudiante)`, instrumento: inst.sigla, tipo: 'texto', valores: '' },
      { variable: `${pref}_ESTADO`, etiqueta: `${inst.sigla}: estado (borrador / enviado)`, instrumento: inst.sigla, tipo: 'texto', valores: '' },
      { variable: `${pref}_INICIO`, etiqueta: `${inst.sigla}: primer guardado`, instrumento: inst.sigla, tipo: 'fecha', valores: '' },
      { variable: `${pref}_ENVIO`, etiqueta: `${inst.sigla}: fecha de envío`, instrumento: inst.sigla, tipo: 'fecha', valores: '' }
    );
    for (const item of inst.items) {
      filas.push({
        variable: varItem(inst, item.n),
        etiqueta: `${inst.sigla} ${item.codigo ? item.codigo + ' ' : ''}${item.n}. ${item.texto}`,
        instrumento: inst.sigla,
        tipo: 'ordinal',
        valores: inst.escala === 'perma11' ? `0 = ${item.anclas[0]}; 10 = ${item.anclas[1]}` : valores,
        perdido: `${NO_RESPONDE} = Prefiero no responder (solo SPSS)`
      });
    }
    for (const p of puntuaciones(inst)) {
      filas.push({
        variable: varDim(inst, p.id),
        etiqueta: `${inst.sigla}: ${p.nombre}`,
        instrumento: inst.sigla,
        tipo: 'escala',
        valores: p.compuesto
          ? `promedio de ${p.dimensiones.map(d => varDim(inst, d)).join(', ')}`
          : `promedio de ítems ${p.items.join(', ')}`
      });
    }
  }
  return filas;
}

// Sintaxis SPSS para importar datos_spss.csv con etiquetas y perdidos.
export function sintaxisSPSS(cols, archivo = 'datos_spss.csv') {
  const libro = new Map(libroDeCodigos().map(f => [f.variable, f]));
  const txt = s => String(s).replace(/"/g, "'").slice(0, 250);
  const numericas = cols.filter(c => /_(\d{2})$/.test(c) || isPuntaje(c));
  const fechas = cols.filter(c => /_(INICIO|ENVIO)$/.test(c) || c === 'CONSENTIMIENTO_FECHA');
  const tipo = c => numericas.includes(c) ? 'F8.4' : fechas.includes(c) ? 'A19' : 'A120';
  const lineas = [
    '* Nonio · estudio AMA·PERMA · importación a SPSS (generado automáticamente).',
    '* Ubique este archivo junto a ' + archivo + ' y ajuste la ruta si es necesario.',
    'SET UNICODE=ON.',
    'GET DATA /TYPE=TXT',
    `  /FILE="${archivo}"`,
    '  /ENCODING="UTF8"',
    '  /DELCASE=LINE /DELIMITERS="," /QUALIFIER=\'"\'',
    '  /ARRANGEMENT=DELIMITED /FIRSTCASE=2',
    '  /VARIABLES=',
    ...cols.map(c => `    ${c} ${tipo(c)}`),
    '.',
    'EXECUTE.',
    '',
    'VARIABLE LABELS',
    ...cols.map((c, i) => `  ${c} "${txt(libro.get(c)?.etiqueta || c)}"${i === cols.length - 1 ? '.' : ''}`),
    ''
  ];
  const items = cols.filter(c => /_(\d{2})$/.test(c));
  if (items.length) {
    lineas.push(`MISSING VALUES ${bloque(items)} (${NO_RESPONDE}).`, '');
    lineas.push('VALUE LABELS');
    for (const inst of INSTRUMENTOS) {
      const vars = items.filter(c => c.startsWith(inst.id.toUpperCase() + '_'));
      if (!vars.length) continue;
      const etiquetas = inst.escala === 'perma11'
        ? [[0, '0 (mínimo)'], [10, '10 (máximo)']]
        : ESCALAS[inst.escala].map(o => [o.valor, o.etiqueta || String(o.valor)]);
      lineas.push(`  /${bloque(vars)}\r\n    ${etiquetas.map(([v, e]) => `${v} "${e}"`).join(' ')} ${NO_RESPONDE} "Prefiero no responder"`);
    }
    lineas.push('.', '');
    lineas.push(`VARIABLE LEVEL ${bloque(items)} (ORDINAL).`);
  }
  const punt = cols.filter(isPuntaje);
  if (punt.length) lineas.push(`VARIABLE LEVEL ${bloque(punt)} (SCALE).`);
  lineas.push('EXECUTE.', '');
  return lineas.join('\r\n');
}

// Parte listas largas de variables en líneas de ≤ 8 nombres (legibilidad y
// compatibilidad con versiones antiguas de SPSS).
const bloque = vars => vars.reduce((acc, v, i) => acc + (i && i % 8 === 0 ? '\r\n    ' : i ? ' ' : '') + v, '');

function isPuntaje(c) {
  const [pref, ...resto] = c.split('_');
  const inst = INSTRUMENTO[pref.toLowerCase()];
  if (!inst || !resto.length || /^\d{2}$/.test(resto.join('_'))) return false;
  return puntuaciones(inst).some(p => p.id === resto.join('_'));
}

export const LEEME = `Nonio · estudio AMA·PERMA · paquete para JASP y SPSS
=====================================

datos_jasp.csv   Base recodificada. Celdas vacías = dato perdido (incluye
                 "Prefiero no responder"). Ábrala directamente en JASP.
datos_spss.csv   Misma base, pero "Prefiero no responder" = -99.
importar_spss.sps Sintaxis: importa datos_spss.csv con etiquetas de variable,
                 etiquetas de valor, -99 declarado como perdido y nivel de
                 medida. En SPSS: Archivo > Abrir > Sintaxis > Ejecutar todo.
libro_de_codigos.csv  Descripción de cada variable.

Puntajes: promedio simple de los ítems de cada dimensión. Una puntuación
queda vacía si se respondió menos del 75 % de sus ítems (protocolo V7.0).
`;
