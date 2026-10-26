// Nonio · recodificación, puntajes y estadística descriptiva.
// Funciones puras: sin DOM, sin Firebase. Probadas en tests/puntajes.test.mjs.

import { NO_RESPONDE, puntuaciones, varItem, varDim } from './instrumentos.js';

// Proporción máxima de ítems perdidos ("Prefiero no responder") que tolera una
// puntuación antes de quedar vacía. Protocolo V7.0: la dimensión se calcula si
// se respondió al menos el 75 % de sus ítems. Con 0,25: las de 3 ítems exigen
// todos; las de 4 y 5 toleran uno; los totales de 10–16 ítems toleran 2–4.
export const MAX_PERDIDOS = 0.25;

export const esValido = v => typeof v === 'number' && Number.isFinite(v) && v !== NO_RESPONDE;

export function media(xs) {
  const v = xs.filter(esValido);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function de(xs) {
  const v = xs.filter(esValido);
  if (v.length < 2) return null;
  const m = media(v);
  return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1));
}

// Puntuación de un conjunto de ítems con tolerancia a perdidos.
export function puntuar(respuestas, items) {
  const vals = items.map(n => respuestas?.[n]);
  const validos = vals.filter(esValido);
  const perdidos = items.length - validos.length;
  if (!validos.length || perdidos / items.length > MAX_PERDIDOS) return null;
  return media(validos);
}

// { EME_RegulacionExterna: 4.25, ... } para un instrumento.
export function puntajesInstrumento(inst, respuestas) {
  const out = {};
  const dims = {};
  for (const p of puntuaciones(inst)) {
    let valor;
    if (p.compuesto) {
      const partes = p.dimensiones.map(d => dims[d]);
      valor = partes.every(x => x != null) ? media(partes) : null;
    } else {
      valor = puntuar(respuestas, p.items);
    }
    dims[p.id] = valor;
    out[varDim(inst, p.id)] = valor;
  }
  return out;
}

// Ítems recodificados (numéricos) con perdidos como null.
export function itemsRecodificados(inst, respuestas) {
  const out = {};
  for (const item of inst.items) {
    const v = respuestas?.[item.n];
    out[varItem(inst, item.n)] = esValido(v) ? v : null;
  }
  return out;
}

export function completitud(inst, respuestas) {
  const total = inst.items.length;
  const respondidas = inst.items.filter(i => respuestas?.[i.n] !== undefined && respuestas?.[i.n] !== null).length;
  return { respondidas, total, completo: respondidas === total };
}

// Alfa de Cronbach sobre casos completos. matriz: filas = casos, columnas = ítems.
export function alfaCronbach(matriz) {
  const filas = matriz.filter(f => f.every(esValido));
  const k = filas[0]?.length || 0;
  if (filas.length < 3 || k < 2) return null;
  const varCol = j => de(filas.map(f => f[j])) ** 2;
  const sumaVarItems = Array.from({ length: k }, (_, j) => varCol(j)).reduce((a, b) => a + b, 0);
  const varTotal = de(filas.map(f => f.reduce((a, b) => a + b, 0))) ** 2;
  if (!varTotal) return null;
  return (k / (k - 1)) * (1 - sumaVarItems / varTotal);
}

// Omega de McDonald aproximado con un factor (primer componente de la matriz
// de correlaciones, método de potencias). Útil como referencia rápida; la
// estimación formal (AFC) se hace en JASP/R.
export function omegaAprox(matriz) {
  const filas = matriz.filter(f => f.every(esValido));
  const k = filas[0]?.length || 0;
  if (filas.length < 5 || k < 3) return null;
  const cols = Array.from({ length: k }, (_, j) => filas.map(f => f[j]));
  const R = cols.map(a => cols.map(b => pearson(a, b)));
  if (R.some(f => f.some(x => x == null))) return null;
  let v = Array(k).fill(1);
  let lambda = 0;
  for (let it = 0; it < 200; it++) {
    const w = R.map(f => f.reduce((a, x, j) => a + x * v[j], 0));
    lambda = Math.sqrt(w.reduce((a, x) => a + x * x, 0));
    v = w.map(x => x / lambda);
  }
  const cargas = v.map(x => Math.abs(x) * Math.sqrt(lambda));
  const suma = cargas.reduce((a, b) => a + b, 0);
  const unicidades = cargas.reduce((a, l) => a + (1 - Math.min(l * l, 0.999)), 0);
  return (suma ** 2) / (suma ** 2 + unicidades);
}

export function pearson(xs, ys) {
  const pares = xs.map((x, i) => [x, ys[i]]).filter(([a, b]) => esValido(a) && esValido(b));
  if (pares.length < 3) return null;
  const mx = media(pares.map(p => p[0]));
  const my = media(pares.map(p => p[1]));
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pares) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  if (!sxx || !syy) return null;
  return sxy / Math.sqrt(sxx * syy);
}

export function descriptivos(xs) {
  const v = xs.filter(esValido).sort((a, b) => a - b);
  if (!v.length) return { n: 0, media: null, de: null, min: null, max: null, mediana: null };
  const mid = Math.floor(v.length / 2);
  return {
    n: v.length,
    media: media(v),
    de: de(v),
    min: v[0],
    max: v[v.length - 1],
    mediana: v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
  };
}

// Frecuencia de cada opción de respuesta de un ítem (incluye "no responde").
export function frecuencias(valores, opciones) {
  const conteo = new Map(opciones.map(o => [o.valor, 0]));
  let noResponde = 0;
  for (const v of valores) {
    if (v === NO_RESPONDE) noResponde++;
    else if (conteo.has(v)) conteo.set(v, conteo.get(v) + 1);
  }
  return { conteo, noResponde };
}
