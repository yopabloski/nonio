// Nonio · preparación de datos para el panel de análisis (funciones puras).
// No usa notas ni datos académicos: solo variables psicoeducativas.

import { fueraDeCriterio } from './nomina.js';
import { INSTRUMENTOS, INSTRUMENTO, ESCALAS, NO_RESPONDE, puntuaciones, varDim } from './instrumentos.js';
import { puntajesInstrumento } from './puntajes.js';
import { momentosOrdenados, cohorteDe } from './modelo.js';
import { idSeudonimo, normalizarRespuestas } from './exportar.js';
import * as E from './estadistica.js';

// Las cuatro variables generales (decisión del 24-09-2026).
export const VARIABLES_GENERALES = [
  { id: 'MOT', nombre: 'Motivación intrínseca', corto: 'Motivación', inst: 'eme', dim: 'MI_Global' },
  { id: 'AUTORREG', nombre: 'Autorregulación', corto: 'Autorregulación', inst: 'ipaa', dim: 'Total' },
  { id: 'AUTOEF', nombre: 'Autoeficacia', corto: 'Autoeficacia', inst: 'eapesa', dim: 'Total_10items' },
  { id: 'BIEN', nombre: 'Bienestar global', corto: 'Bienestar', inst: 'perma', dim: 'Global' }
].map(v => ({ ...v, variable: varDim(INSTRUMENTO[v.inst], v.dim), color: INSTRUMENTO[v.inst].color, ...rango(v.inst) }));

export function rango(instId) {
  const esc = ESCALAS[INSTRUMENTO[instId].escala];
  return { min: esc[0].valor, max: esc[esc.length - 1].valor };
}

// Dimensiones "base" (no compuestas ni redundantes) para correlaciones y red.
export const DIMENSIONES_BASE = [
  ...['Amotivacion', 'RegulacionExterna', 'RegulacionIntroyectada', 'RegulacionIdentificada', 'MI_Conocimiento', 'MI_Logro', 'MI_ExpEstimulantes'].map(d => ['eme', d]),
  ['ipaa', 'Planificacion'], ['ipaa', 'Ejecucion'], ['ipaa', 'Evaluacion'],
  ['eapesa', 'Total_10items'],
  ...['P', 'E', 'R', 'M', 'A', 'N', 'H'].map(d => ['perma', d])
].map(([i, d]) => {
  const inst = INSTRUMENTO[i];
  const p = puntuaciones(inst).find(x => x.id === d);
  return { inst: i, dim: d, variable: varDim(inst, d), nombre: p.nombre, corto: `${inst.sigla} ${corto(d)}`, color: inst.color };
});
function corto(d) {
  const m = { Amotivacion: 'AM', RegulacionExterna: 'RE', RegulacionIntroyectada: 'RIn', RegulacionIdentificada: 'RId', MI_Conocimiento: 'MI-C', MI_Logro: 'MI-L', MI_ExpEstimulantes: 'MI-E', Planificacion: 'Plan', Ejecucion: 'Ejec', Evaluacion: 'Eval', Total_10items: 'Total' };
  return m[d] || d;
}

// ---------------------------------------------------------------- calidad de respuesta
export const UMBRALES_CALIDAD = {
  segundosPorItem: 2,       // Huang et al. (2012): < 2 s por ítem = respuesta apresurada
  longstringProp: 0.8,      // misma opción en ≥ 80 % de ítems consecutivos (mínimo 8)
  omisionProp: 0.2          // > 20 % "Prefiero no responder"
};

export function calidadDe(doc) {
  const inst = INSTRUMENTO[doc.instrumentoId];
  const r = normalizarRespuestas(doc.respuestas);
  const vals = inst.items.map(i => r[i.n]);
  const k = inst.items.length;
  const validos = vals.filter(v => E.esNum(v) && v !== NO_RESPONDE);
  const omit = vals.filter(v => v === NO_RESPONDE).length;
  let largo = 0, run = 0, prev;
  for (const v of vals) { run = v === prev && v !== undefined ? run + 1 : 1; prev = v; largo = Math.max(largo, run); }
  const deIntra = validos.length > 1 ? Math.sqrt(E.varianza(validos)) : null;
  const seg = doc.inicio && doc.enviado ? (Date.parse(doc.enviado) - Date.parse(doc.inicio)) / 1000 : null;
  const spi = seg != null && seg > 0 ? seg / k : null;
  const motivos = [];
  if (spi != null && spi < UMBRALES_CALIDAD.segundosPorItem) motivos.push('rápida');
  if (deIntra === 0 && validos.length >= 4) motivos.push('misma opción en todo');
  else if (largo >= Math.max(8, Math.ceil(k * UMBRALES_CALIDAD.longstringProp))) motivos.push('secuencia repetida');
  if (omit / k > UMBRALES_CALIDAD.omisionProp) motivos.push('muchas omisiones');
  return { segundos: seg, segundosPorItem: spi, longstring: largo, deIntra, omisiones: omit, k, motivos };
}

// ---------------------------------------------------------------- preparación
// Devuelve la estructura que usan todas las vistas del análisis.
export function prepararDatos({ config, participantes, respuestas, nomina = [], cohorte = 'todas', excluirBajaCalidad = false, incluirFueraCriterio = false }) {
  const fuera = incluirFueraCriterio ? new Set() : fueraDeCriterio(nomina, config.cohorte);
  const ordenDe = new Map(nomina.filter(n => n.orden).map(n => [n.correo, Number(n.orden)]));
  const acepta = new Map(participantes.filter(p => p.consentimiento?.acepta && !fuera.has(p.correo)).map(p => [p.correo, p]));
  const cohortes = [...new Set([...acepta.values()].map(p => cohorteDe(p, config)))].sort();
  const enviados = respuestas.filter(r => r.estado === 'enviado' && acepta.has(r.correo) && INSTRUMENTO[r.instrumentoId]);
  const calidad = new Map(enviados.map(r => [`${r.correo}|${r.clave}`, calidadDe(r)]));
  const usar = r => (cohorte === 'todas' || cohorteDe(acepta.get(r.correo), config) === cohorte)
    && (!excluirBajaCalidad || !calidad.get(`${r.correo}|${r.clave}`).motivos.length);
  const docs = enviados.filter(usar).map(r => {
    const inst = INSTRUMENTO[r.instrumentoId];
    const resp = normalizarRespuestas(r.respuestas);
    return { ...r, orden: ordenDe.get(r.correo) ?? null, id: idSeudonimo(r.correo), nombre: acepta.get(r.correo).nombre, cohorte: cohorteDe(acepta.get(r.correo), config), resp, puntajes: puntajesInstrumento(inst, resp) };
  });

  // Por participante: puntajes de cada instrumento en su envío más reciente.
  const porPersona = new Map();
  for (const d of [...docs].sort((a, b) => String(a.enviado).localeCompare(String(b.enviado)))) {
    const p = porPersona.get(d.correo) || { correo: d.correo, id: d.id, nombre: d.nombre, cohorte: d.cohorte, orden: ordenDe.get(d.correo) ?? null, puntajes: {} };
    Object.assign(p.puntajes, d.puntajes);
    porPersona.set(d.correo, p);
  }
  const personas = [...porPersona.values()].sort((a, b) => a.id.localeCompare(b.id));
  const momentos = momentosOrdenados(config);
  return { docs, personas, cohortes, momentos, fueraCriterio: participantes.filter(p => p.consentimiento?.acepta && fuera.has(p.correo)).length, calidad: enviados
    .filter(r => cohorte === 'todas' || cohorteDe(acepta.get(r.correo), config) === cohorte)
    .map(r => ({ doc: r, id: idSeudonimo(r.correo), ...calidad.get(`${r.correo}|${r.clave}`) })) };
}

// momentoId = 'todas': un documento por estudiante (el más reciente) del instrumento,
// sin importar la sesión. Es la vista natural en el diseño contrabalanceado.
export function docsDe(datos, momentoId, instId) {
  if (momentoId !== 'todas') return datos.docs.filter(d => d.momentoId === momentoId && d.instrumentoId === instId);
  const porCorreo = new Map();
  for (const d of datos.docs.filter(x => x.instrumentoId === instId).sort((a, b) => String(a.enviado).localeCompare(String(b.enviado)))) porCorreo.set(d.correo, d);
  return [...porCorreo.values()];
}

// Efecto de orden (contrabalanceo): compara Orden 1 vs Orden 2 en una variable.
// Prueba t (ANOVA de 2 grupos, F = t²) si ambos grupos son compatibles con
// normalidad; si no, Mann-Whitney (Kruskal-Wallis con 2 grupos).
export function efectoOrden(personas, variable) {
  const g = [1, 2].map(o => personas.filter(p => p.orden === o).map(p => p.puntajes[variable]).filter(E.esNum));
  if (g.some(x => x.length < 3)) return { n: g.map(x => x.length), prueba: null };
  const normal = g.every(x => (E.shapiroWilk(x).p ?? 0) >= 0.05);
  const r = g.map(x => E.resumen(x));
  const sp = Math.sqrt(((r[0].n - 1) * r[0].de ** 2 + (r[1].n - 1) * r[1].de ** 2) / (r[0].n + r[1].n - 2));
  const d = sp ? (r[0].media - r[1].media) / sp : null;
  if (normal) {
    const a = E.anova1(g);
    return { n: g.map(x => x.length), medias: r.map(x => x.media), prueba: 't', estadistico: Math.sign(r[0].media - r[1].media) * Math.sqrt(a.F), gl: a.gl[1], p: a.p, d };
  }
  const k = E.kruskalWallis(g);
  return { n: g.map(x => x.length), medias: r.map(x => x.media), medianas: r.map(x => x.mediana), prueba: 'Mann-Whitney', estadistico: k.H, gl: 1, p: k.p, d };
}

// Columna de una variable (puntaje) para todas las personas.
export const columna = (personas, variable) => personas.map(p => (E.esNum(p.puntajes[variable]) ? p.puntajes[variable] : null));

// Matriz ítems (filas = casos) con "no responde" como null.
export function matrizItems(docs, items) {
  return docs.map(d => items.map(n => { const v = d.resp[n]; return E.esNum(v) && v !== NO_RESPONDE ? v : null; }));
}

// Decide el método según normalidad (Shapiro-Wilk, α = .05) de las variables involucradas.
export function decidirMetodo(columnas) {
  const pruebas = columnas.map(c => E.shapiroWilk(c));
  const normales = pruebas.every(p => p.p != null && p.p >= 0.05);
  return { parametrico: normales, pruebas, metodo: normales ? 'pearson' : 'spearman' };
}

// Tendencia entre cohortes: media e IC 95 % por cohorte para una variable.
export function tendencia(personasTodas, variable) {
  const porCohorte = new Map();
  for (const p of personasTodas) {
    const v = p.puntajes[variable];
    if (!E.esNum(v)) continue;
    if (!porCohorte.has(p.cohorte)) porCohorte.set(p.cohorte, []);
    porCohorte.get(p.cohorte).push(v);
  }
  return [...porCohorte.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([cohorte, v]) => {
    const r = E.resumen(v);
    const t = r.n > 1 ? tInv975(r.n - 1) : null;
    const me = t && r.de != null ? t * r.de / Math.sqrt(r.n) : null;
    return { cohorte, n: r.n, media: r.media, lo: me != null ? r.media - me : null, hi: me != null ? r.media + me : null };
  });
}
function tInv975(gl) {
  let lo = 0, hi = 50;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (E.tCDF(m, gl) < 0.975) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

// Continuo de autodeterminación (EME): posición teórica de cada subescala.
export const CONTINUO_EME = [
  ['Amotivacion', 0], ['RegulacionExterna', 1], ['RegulacionIntroyectada', 2], ['RegulacionIdentificada', 3],
  ['MI_Conocimiento', 4], ['MI_Logro', 4], ['MI_ExpEstimulantes', 4]
];

export function chequeoContinuo(docsEme) {
  const inst = INSTRUMENTO.eme;
  const cols = CONTINUO_EME.map(([d]) => docsEme.map(x => x.puntajes[varDim(inst, d)] ?? null));
  const metodo = decidirMetodo(cols).metodo;
  const { R } = E.matrizCorrelaciones(cols, metodo);
  const pares = [];
  for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++) {
    const lag = Math.abs(CONTINUO_EME[i][1] - CONTINUO_EME[j][1]);
    if (lag > 0 && R[i][j] != null) pares.push({ a: CONTINUO_EME[i][0], b: CONTINUO_EME[j][0], lag, r: R[i][j] });
  }
  const porLag = [1, 2, 3, 4].map(l => ({ lag: l, r: E.mediaSimple(pares.filter(p => p.lag === l).map(p => p.r)) }));
  const rho = E.spearmanPar(pares.map(p => p.lag), pares.map(p => p.r)).r;
  const amMI = pares.filter(p => p.a === 'Amotivacion' && p.lag === 4).map(p => p.r);
  const amNeg = amMI.every(r => r <= 0.1);
  const decrece = porLag.every((x, i) => i === 0 || x.r == null || porLag[i - 1].r == null || x.r <= porLag[i - 1].r + 0.02);
  const veredicto = decrece && amNeg && rho != null && rho < -0.3 ? 'se cumple' : (rho != null && rho < 0 ? 'se cumple parcialmente' : 'no se cumple');
  return { R, metodo, porLag, rho, amMI, veredicto, n: docsEme.length };
}
