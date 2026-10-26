// Nonio · lectura de nóminas (funciones puras).
// Acepta una tabla (filas × columnas) que viene de un CSV, un Excel o texto
// pegado. Busca la columna de correo por su encabezado (correo, email, mail…)
// o, si no hay encabezado, la primera columna que contenga "@".

import { correoValido, normalizarCorreo, normalizarRut, rutValido, normalizarNombre } from './identidad.js';

const sinTildes = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const COLS = {
  correo: ['correo', 'correo institucional', 'email', 'e-mail', 'mail', 'correo electronico'],
  nombre: ['nombre', 'nombre completo', 'nombre_alumno', 'nombre alumno', 'estudiante', 'alumno', 'nombres'],
  rut: ['rut', 'run'],
  matricula: ['numero_matricula', 'numero matricula', 'matricula', 'n matricula'],
  seccion: ['seccion', 'sección', 'curso'],
  orden: ['orden', 'grupo']
};

export function textoATabla(texto) {
  const lineas = String(texto || '').replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!lineas.length) return [];
  const sep = [';', '\t', ','].map(c => [c, lineas[0].split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  return lineas.map(l => partir(l, sep));
}
function partir(linea, sep) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') { if (q && linea[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === sep && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(x => x.trim());
}

// Las listas de curso de la UDD traen un encabezado institucional de varias
// filas antes de la fila de columnas ("Num, Carrera, RUN, …, Correo, …"):
// se busca la fila de encabezado entre las primeras 30.
export function leerNomina(tabla, { seccion = null } = {}) {
  let filas = (tabla || []).filter(f => f && f.some(c => String(c ?? '').trim()));
  if (!filas.length) return { validos: [], invalidos: [], duplicados: 0 };
  const iCab = filas.slice(0, 30).findIndex(f => f.some(c => COLS.correo.includes(sinTildes(c))));
  if (iCab > 0) filas = filas.slice(iCab);
  const cab = filas[0].map(sinTildes);
  const idx = Object.fromEntries(Object.entries(COLS).map(([k, nombres]) => [k, cab.findIndex(c => nombres.includes(c))]));
  const conCabecera = idx.correo >= 0;
  if (!conCabecera) idx.correo = filas[0].findIndex(c => String(c).includes('@'));
  const datos = conCabecera ? filas.slice(1) : filas;
  const vistos = new Set();
  const validos = [], invalidos = [];
  let duplicados = 0;
  datos.forEach((f, i) => {
    const bruto = idx.correo >= 0 ? f[idx.correo] : f.find(c => String(c).includes('@'));
    const correo = normalizarCorreo(bruto);
    const linea = i + (conCabecera ? 2 : 1);
    if (!correoValido(correo)) { invalidos.push({ linea, valor: String(bruto ?? '') }); return; }
    if (vistos.has(correo)) { duplicados++; return; }
    vistos.add(correo);
    const fila = { correo };
    if (idx.nombre >= 0 && f[idx.nombre]) fila.nombre = normalizarNombre(f[idx.nombre]);
    if (idx.rut >= 0 && rutValido(f[idx.rut])) fila.rut = normalizarRut(f[idx.rut]);
    if (idx.orden >= 0) { const o = Number(String(f[idx.orden]).replace(/\D/g, '')); if (o === 1 || o === 2) fila.orden = o; }
    if (idx.matricula >= 0 && f[idx.matricula]) fila.matricula = String(f[idx.matricula]).trim();
    const sec = idx.seccion >= 0 && f[idx.seccion] ? String(f[idx.seccion]).trim() : seccion;
    if (sec) fila.seccion = String(sec);
    validos.push(fila);
  });
  return { validos, invalidos, duplicados, conCabecera };
}

// Criterio de inclusión del protocolo: estudiantes de la cohorte de ingreso
// (año de la matrícula = cohorte del estudio). Quien viene en la lista del
// curso con matrícula de otro año puede responder, pero queda fuera del
// análisis y de las exportaciones por defecto. Sin matrícula se asume dentro.
export function enCriterio(fila, cohorte) {
  if (!fila?.matricula || !cohorte) return true;
  return String(fila.matricula).trim().startsWith(String(cohorte));
}
export function fueraDeCriterio(nomina, cohorte) {
  return new Set((nomina || []).filter(n => !enCriterio(n, cohorte)).map(n => n.correo));
}

// Semilla para la aleatorización: 32 bits del generador criptográfico.
export function semillaNueva() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0];
  return Math.floor(Math.random() * 2 ** 32);
}

// "ListaDefinitiva_ITH129ASCT_3__2026_2_3.xlsx" → "ITH129ASCT-3"
export function seccionDesdeArchivo(nombre) {
  const m = String(nombre || '').match(/([A-Z]{3}\d{3}[A-Z]*)_(\d+)_/i);
  return m ? `${m[1].toUpperCase()}-${m[2]}` : null;
}
