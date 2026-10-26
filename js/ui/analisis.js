// Nonio · vistas de análisis del panel docente.
// A · Foto de la cohorte   B · Por instrumento   C · Relaciones
// D · Perfiles y grupos    E · Calidad de respuesta
// Solo variables psicoeducativas (sin notas ni datos académicos).

import { INSTRUMENTOS, INSTRUMENTO, ESCALAS, puntuaciones, varDim } from '../domain/instrumentos.js';
import * as E from '../domain/estadistica.js';
import {
  VARIABLES_GENERALES, DIMENSIONES_BASE, UMBRALES_CALIDAD, prepararDatos, docsDe, columna, matrizItems,
  decidirMetodo, tendencia, chequeoContinuo, rango
} from '../domain/analitica.js';
import { efectoOrden } from '../domain/analitica.js';
import { esContrabalanceado } from '../domain/modelo.js';
import { boxplots, arana, redParcial, sedimentacion, barrasSimples, tendenciaCohortes, histograma, apiladas, matrizCorrelacion, rampa, fmt } from './graficos.js';
import { aCSV } from '../domain/exportar.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fp = p => (p == null ? '—' : p < 0.001 ? '< 0,001' : fmt(p, 3));
const peq = p => (p == null ? 'p = —' : p < 0.001 ? 'p < 0,001' : `p = ${fmt(p, 3)}`);
const pomp = (v, min, max) => (E.esNum(v) ? (100 * (v - min)) / (max - min) : null);
export const COLORES_GRUPO = ['#2a78d6', '#d9571f', '#12996a', '#4a3aa7', '#c9467f'];

const TABS = {
  cohorte: 'Resumen de la cohorte con las cuatro variables generales, y resultados por instrumento y momento. Solo cuestionarios enviados por quienes aceptaron el consentimiento.',
  instrumento: 'Descriptivos, confiabilidad (α, α ordinal, ω), análisis de ítems, correlaciones entre ítems y estructura factorial del instrumento elegido.',
  relaciones: 'Relaciones entre dimensiones. El método (Pearson o Spearman) se elige según la normalidad de los datos. Incluye red psicométrica y regresión entre las variables generales.',
  perfiles: 'Grupos de estudiantes (k-medias sobre las cuatro variables generales) y perfil individual. Úsalo solo con fines de investigación: el consentimiento no autoriza intervenciones individuales.',
  calidad: `Detección de respuestas descuidadas: menos de ${UMBRALES_CALIDAD.segundosPorItem} s por ítem, la misma opción en secuencia o más del ${UMBRALES_CALIDAD.omisionProp * 100} % de omisiones. Con "Excluir baja calidad" se quitan de todas las vistas.`
};

export function crearAnalisis({ raiz, nota, selCohorte, chkExcluir, tabs, obtener }) {
  // obtener() → { config, participantes, respuestas, nomina }
  const st = { tab: 'cohorte', cohorte: null, excluir: false, momento: null, inst: null, nf: null, k: null, persona: null, nombres: false, dep: 'BIEN', preds: null };
  const cache = new Map();
  let version = 0;

  const datos = () => {
    const { config, participantes, respuestas, nomina } = obtener();
    return prepararDatos({ config, participantes, respuestas, nomina, cohorte: st.cohorte || 'todas', excluirBajaCalidad: st.excluir });
  };
  const memo = (clave, fn) => {
    const k = `${version}|${st.cohorte}|${st.excluir}|${clave}`;
    if (!cache.has(k)) cache.set(k, fn());
    return cache.get(k);
  };
  const asincrono = (id, clave, fn, pintar) => {
    const k = `${version}|${st.cohorte}|${st.excluir}|${clave}`;
    if (cache.has(k)) return pintar(cache.get(k));
    setTimeout(() => {
      let r;
      try { r = fn(); } catch (e) { console.error(e); r = { error: e.message }; }
      cache.set(k, r);
      const el = raiz.querySelector(`#${id}`);
      if (el) el.innerHTML = pintar(r);
    }, 30);
    return '<div class="calculando">Calculando…</div>';
  };

  // ---------------------------------------------------------------- A · Cohorte
  function vistaCohorte(D) {
    const P = D.personas;
    if (!P.length) return vacio();
    const filas = VARIABLES_GENERALES.map(v => {
      const col = columna(P, v.variable).filter(E.esNum);
      return { v, col, r: E.resumen(col), sw: E.shapiroWilk(col) };
    });
    const tabla = `<table class="tabla-est"><thead><tr><th>Variable</th><th>Escala</th><th>n</th><th>M</th><th>DE</th><th>Md</th><th>RIC</th><th>Mín–Máx</th><th>Asim.</th><th>Curt.</th><th>S-W W</th><th>p</th><th>Distribución</th></tr></thead><tbody>
      ${filas.map(({ v, r, sw }) => `<tr><td>${esc(v.nombre)}<small>${v.variable}</small></td><td>${v.min}–${v.max}</td><td>${r.n || 0}</td><td>${fmt(r.media)}</td><td>${fmt(r.de)}</td><td>${fmt(r.mediana)}</td><td>${fmt(r.ric)}</td><td>${r.n ? `${fmt(r.min, 1)}–${fmt(r.max, 1)}` : '—'}</td><td>${fmt(r.asimetria)}</td><td>${fmt(r.curtosis)}</td><td>${fmt(sw.W, 3)}</td><td>${fp(sw.p)}</td><td>${sw.p == null ? '—' : sw.p >= 0.05 ? '<span class="pill ok">Normal</span>' : '<span class="pill curso">No normal</span>'}</td></tr>`).join('')}
    </tbody></table>`;
    const cajas = filas.map(({ v, col, r }) => `<div class="mini-card grafico"><h4><i style="background:${v.color}"></i>${esc(v.nombre)}</h4><p>n = ${r.n || 0} · M = ${fmt(r.media)} · Md = ${fmt(r.mediana)}</p>${boxplots([{ nombre: '', valores: col, r, color: v.color }], { min: v.min, max: v.max, etiqueta: 8, alto: 40, ancho: 480 })}</div>`).join('');

    // Por instrumento (contrabalanceado: ambas sesiones juntas) o por momento
    const { config: cfg } = obtener();
    const cruz = esContrabalanceado(cfg);
    let porInst = '';
    const unidades = cruz ? [{ id: 'todas', nombre: 'ambas sesiones', instrumentos: INSTRUMENTOS.map(i => i.id) }] : D.momentos;
    for (const m of unidades) {
      const bloques = INSTRUMENTOS.filter(i => m.instrumentos.includes(i.id)).map(inst => {
        const docs = docsDe(D, m.id, inst.id);
        if (!docs.length) return '';
        const { min, max } = rango(inst.id);
        const fl = puntuaciones(inst).map(p => {
          const vals = docs.map(d => d.puntajes[varDim(inst, p.id)]).filter(E.esNum);
          return { nombre: p.nombre, valores: vals, r: E.resumen(vals), color: inst.color };
        });
        return `<div class="mini-card grafico"><h4><i style="background:${inst.color}"></i>${inst.sigla} · ${esc(m.nombre)}</h4><p>${docs.length} cuestionarios enviados · escala ${min}–${max} · ○ media, | mediana</p>${boxplots(fl, { min, max, alto: 28, etiqueta: 170, paso: inst.escala === 'perma11' ? 2 : 1, ancho: 520 })}</div>`;
      }).join('');
      if (bloques) porInst += bloques;
    }

    // Efecto de orden (diseño contrabalanceado)
    let orden = '';
    if (cruz) {
      const filasO = VARIABLES_GENERALES.map(v => {
        const e = efectoOrden(P, v.variable);
        const bl = Object.values(cfg.diseno.bloques).find(b => b.instrumentos.includes(v.inst));
        const pos = bl ? `${bl.nombre}: sesión 1 en Orden ${bl.id === 'A' ? 1 : 2}` : '';
        return `<tr><td>${esc(v.nombre)}<small>${esc(pos)}</small></td><td>${e.n[0]}</td><td>${fmt(e.medias?.[0])}</td><td>${e.n[1]}</td><td>${fmt(e.medias?.[1])}</td>
          <td style="font-family:var(--texto)">${e.prueba ? (e.prueba === 't' ? `t(${e.gl}) = ${fmt(e.estadistico)}` : `Mann-Whitney (H = ${fmt(e.estadistico)})`) : '—'}</td><td class="${e.p != null && e.p < 0.05 ? 'mal' : ''}">${fp(e.p)}</td><td>${fmt(e.d)}</td></tr>`;
      }).join('');
      const nO = [1, 2].map(o => P.filter(p => p.orden === o).length);
      orden = `<article class="panel-card"><header><h2>Efecto de orden</h2><p>¿Cambian los puntajes según si el instrumento se respondió en la primera o en la segunda sesión? Orden 1: ${nO[0]} estudiantes · Orden 2: ${nO[1]}.</p></header>
        <table class="tabla-est"><thead><tr><th>Variable</th><th>n O1</th><th>M O1</th><th>n O2</th><th>M O2</th><th>Prueba</th><th>p</th><th>d</th></tr></thead><tbody>${filasO}</tbody></table>
        <p class="explica">El contrabalanceo reparte el efecto de orden (fatiga, aprendizaje) entre ambos grupos. Si una variable muestra diferencias significativas entre órdenes (p &lt; 0,05, en rojo), conviene incluir <b>ORDEN</b> como covariable en los modelos. Se usa t de Student si ambos grupos son compatibles con normalidad y Mann-Whitney si no. d = diferencia de medias estandarizada (O1 − O2).</p></article>`;
    }

    // Tendencias entre cohortes (siempre con todas las cohortes)
    const { config, participantes, respuestas, nomina } = obtener();
    const todas = prepararDatos({ config, participantes, respuestas, nomina, cohorte: 'todas', excluirBajaCalidad: st.excluir });
    const tend = todas.cohortes.length < 2
      ? `<p class="sec-nota" style="margin:0">Hay una sola cohorte (${esc(todas.cohortes[0] || '—')}). Cuando existan datos de otra cohorte, aquí aparecerá la comparación de medias con su intervalo de confianza del 95 %. Este es un análisis <b>transversal</b>: compara cohortes distintas, no a las mismas personas en el tiempo.</p>`
      : `<div class="an-4">${VARIABLES_GENERALES.map(v => { const t = tendencia(todas.personas, v.variable); const comp = compararCohortes(todas.personas, v.variable); return `<div class="mini-card grafico"><h4><i style="background:${v.color}"></i>${esc(v.nombre)}</h4><p>${comp}</p>${tendenciaCohortes(t, { min: v.min, max: v.max, color: v.color, nombre: v.nombre })}</div>`; }).join('')}</div>
         <p class="explica">Comparación <b>transversal</b> entre cohortes (grupos distintos de estudiantes). Las diferencias pueden deberse a la cohorte, no a un cambio en las personas.</p>`;

    return `<div class="an-grid">
      <article class="panel-card"><header><h2>Variables generales</h2><p>${P.length} estudiantes con al menos un instrumento enviado. Cada variable usa su escala original. Shapiro-Wilk: p ≥ 0,05 → compatible con normalidad.</p></header>
        <div class="tabla-scroll">${tabla}</div>
        <div class="an-4" style="margin-top:16px">${cajas}</div>
        <p class="explica"><b>Cómo leer las cajas:</b> la caja va del percentil 25 al 75, la línea gruesa es la mediana, el círculo blanco es la media y los bigotes llegan hasta 1,5 veces el rango intercuartílico. Los círculos vacíos son valores atípicos.</p>
      </article>
      ${orden}
      <article class="panel-card"><header><h2>${cruz ? 'Resultados por instrumento' : 'Resultados por instrumento y momento'}</h2><p>Distribución de cada dimensión${cruz ? ', juntando ambas sesiones (cada estudiante responde cada instrumento una vez)' : ''}.</p></header><div class="an-3" style="grid-template-columns:repeat(auto-fill,minmax(420px,1fr))">${porInst || '<p class="vacio">Sin cuestionarios enviados.</p>'}</div></article>
      <article class="panel-card"><header><h2>Tendencias entre cohortes</h2><p>Media e intervalo de confianza del 95 % por cohorte.</p></header>${tend}</article>
    </div>`;
  }

  function compararCohortes(personas, variable) {
    const grupos = [...new Set(personas.map(p => p.cohorte))].sort().map(c => personas.filter(p => p.cohorte === c).map(p => p.puntajes[variable]).filter(E.esNum));
    if (grupos.filter(g => g.length >= 3).length < 2) return 'Datos insuficientes para comparar.';
    const normal = grupos.every(g => (E.shapiroWilk(g).p ?? 0) >= 0.05);
    if (normal) { const a = E.anova1(grupos); return `ANOVA: F(${a.gl.join(', ')}) = ${fmt(a.F)}, ${peq(a.p)}, η² = ${fmt(a.eta2)}`; }
    const k = E.kruskalWallis(grupos);
    return `Kruskal-Wallis: H(${k.gl}) = ${fmt(k.H)}, ${peq(k.p)}, ε² = ${fmt(k.epsilon2)}`;
  }

  // ---------------------------------------------------------------- B · Instrumento
  function vistaInstrumento(D) {
    const { config: cfgI } = obtener();
    const momentos = [
      ...(esContrabalanceado(cfgI) ? [{ id: 'todas', nombre: 'Ambas sesiones', instrumentos: INSTRUMENTOS.map(i => i.id) }] : []),
      ...D.momentos.filter(m => m.instrumentos.length)
    ];
    if (!momentos.length) return vacio();
    if (!momentos.find(m => m.id === st.momento)) st.momento = momentos[0].id;
    const m = momentos.find(x => x.id === st.momento);
    const insts = INSTRUMENTOS.filter(i => m.instrumentos.includes(i.id));
    if (!insts.find(i => i.id === st.inst)) st.inst = insts[0].id;
    const inst = INSTRUMENTO[st.inst];
    const docs = docsDe(D, m.id, inst.id);
    const selector = `<div class="an-sub"><span class="kicker">Momento</span><div class="segmentado">${momentos.map(x => `<button type="button" data-momento="${x.id}" aria-pressed="${x.id === m.id}">${esc(x.nombre)}</button>`).join('')}</div>
      <span class="kicker" style="margin-left:14px">Instrumento</span><div class="segmentado">${insts.map(i => `<button type="button" data-inst="${i.id}" aria-pressed="${i.id === inst.id}">${i.sigla}</button>`).join('')}</div></div>`;
    if (docs.length < 5) return selector + `<div class="panel-card vacio"><b>Pocos datos</b>${docs.length} cuestionarios de ${inst.sigla} en ${esc(m.nombre)}. Se necesitan al menos 5 para los análisis.</div>`;

    const { min, max } = rango(inst.id);
    const escala = ESCALAS[inst.escala];
    const punts = puntuaciones(inst);

    // Descriptivos
    const desc = punts.map(p => {
      const vals = docs.map(d => d.puntajes[varDim(inst, p.id)]).filter(E.esNum);
      return { p, vals, r: E.resumen(vals), sw: E.shapiroWilk(vals) };
    });
    const tDesc = `<table class="tabla-est"><thead><tr><th>Puntuación</th><th>n</th><th>M</th><th>DE</th><th>Md</th><th>RIC</th><th>Asim.</th><th>Curt.</th><th>S-W p</th></tr></thead><tbody>
      ${desc.map(({ p, r, sw }) => `<tr><td>${esc(p.nombre)}<small>${varDim(inst, p.id)}</small></td><td>${r.n}</td><td>${fmt(r.media)}</td><td>${fmt(r.de)}</td><td>${fmt(r.mediana)}</td><td>${fmt(r.ric)}</td><td>${fmt(r.asimetria)}</td><td>${fmt(r.curtosis)}</td><td class="${sw.p != null && sw.p < 0.05 ? 'mal' : ''}">${fp(sw.p)}</td></tr>`).join('')}</tbody></table>`;
    const cajas = boxplots(desc.map(d => ({ nombre: d.p.nombre, valores: d.vals, r: d.r, color: inst.color })), { min, max, paso: inst.escala === 'perma11' ? 1 : 1, etiqueta: 220 });

    // Ítems
    const escalaItem = n => {
      if (inst.id === 'eapesa') return inst.items.map(i => i.n);
      const d = inst.dimensiones.find(x => x.id !== 'Global' && x.items.includes(n));
      return d && d.items.length > 1 ? d.items : null;
    };
    const dimNombre = n => (inst.id === 'eapesa' ? 'Autoeficacia' : inst.dimensiones.find(x => x.id !== 'Global' && x.items.includes(n))?.nombre || '—');
    const filasItems = inst.items.map(it => {
      const vals = docs.map(d => d.resp[it.n]).filter(v => E.esNum(v) && v >= min);
      const r = E.resumen(vals);
      const piso = vals.length ? vals.filter(v => v === min).length / vals.length : null;
      const techo = vals.length ? vals.filter(v => v === max).length / vals.length : null;
      const esc2 = escalaItem(it.n);
      let rit = null, aSin = null;
      if (esc2) {
        const M = matrizItems(docs, esc2);
        const a = E.analisisItems(M);
        const j = esc2.indexOf(it.n);
        rit = a[j]?.itemTotal; aSin = a[j]?.alfaSinItem;
      }
      return { it, r, piso, techo, rit, aSin, dim: dimNombre(it.n) };
    });
    const tItems = `<table class="tabla-est"><thead><tr><th>Ítem</th><th>Dimensión</th><th>M</th><th>DE</th><th>% piso</th><th>% techo</th><th>r ítem-total</th><th>α sin ítem</th></tr></thead><tbody>
      ${filasItems.map(f => `<tr><td>${f.it.codigo || 'Í' + String(f.it.n).padStart(2, '0')}<small title="${esc(f.it.texto)}">${esc(f.it.texto.slice(0, 60))}${f.it.texto.length > 60 ? '…' : ''}</small></td><td style="text-align:left;font-family:var(--texto)">${esc(f.dim)}</td><td>${fmt(f.r.media)}</td><td>${fmt(f.r.de)}</td>
        <td class="${f.piso > 0.15 ? 'mal' : ''}">${fmt(f.piso * 100, 0)}</td><td class="${f.techo > 0.15 ? 'mal' : ''}">${fmt(f.techo * 100, 0)}</td><td class="${f.rit != null && f.rit < 0.3 ? 'mal' : ''}">${fmt(f.rit)}</td><td>${fmt(f.aSin)}</td></tr>`).join('')}</tbody></table>`;
    const colores = rampa(inst.color, escala.length);
    const dist = apiladas(inst.items.map(it => {
      const f = new Map(escala.map(o => [o.valor, 0]));
      let nr = 0;
      docs.forEach(d => { const v = d.resp[it.n]; if (v === -99) nr++; else if (f.has(v)) f.set(v, f.get(v) + 1); });
      return { corto: it.codigo || `Í${String(it.n).padStart(2, '0')}`, texto: it.texto, conteos: escala.map(o => f.get(o.valor)), noResponde: nr };
    }), escala, colores);
    const leyenda = `<div class="leyenda">${escala.map((o, i) => `<span><i style="background:${colores[i]}"></i>${inst.escala === 'perma11' || !o.etiqueta ? o.valor : esc(`${o.valor} · ${o.etiqueta}`)}</span>`).join('')}<span><i style="background:repeating-linear-gradient(45deg,#6A7888 0 2px,#E3E8E1 2px 5px)"></i>Prefiero no responder</span></div>`;

    // Correlaciones entre ítems (Spearman: datos ordinales)
    const cols = inst.items.map(it => docs.map(d => { const v = d.resp[it.n]; return E.esNum(v) && v >= min ? v : null; }));
    const { R: Rs, N: Ns } = memo(`sp-items-${m.id}-${inst.id}`, () => E.matrizCorrelaciones(cols, 'spearman'));
    const heat = matrizCorrelacion(inst.items.map(it => ({ corto: it.codigo || `Í${String(it.n).padStart(2, '0')}` })), Rs, Ns);

    const idConf = `conf-${inst.id}`, idAfe = `afe-${inst.id}`;
    const conf = asincrono(idConf, `conf-${m.id}-${inst.id}`, () => confiabilidad(inst, docs), pintarConfiabilidad);
    const afeHtml = asincrono(idAfe, `afe-${m.id}-${inst.id}-${st.nf}`, () => factorial(inst, cols, docs.length), r => pintarFactorial(inst, r));

    const continuo = inst.id === 'eme' ? pintarContinuo(memo(`cont-${m.id}`, () => chequeoContinuo(docs))) : '';

    return selector + `<div class="an-grid">
      <article class="panel-card"><header><h2>${esc(inst.nombre)} · ${esc(m.nombre)}</h2><p>${docs.length} cuestionarios enviados · escala ${min}–${max}</p></header>
        <div class="tabla-scroll">${tDesc}</div><div class="grafico" style="margin-top:16px">${cajas}</div></article>
      <article class="panel-card"><header><h2>Confiabilidad</h2><p>α de Cronbach (Pearson) y α ordinal (sobre correlaciones policóricas, recomendado para escalas Likert). ω de McDonald con un factor. Rojo = bajo 0,70.</p></header><div id="${idConf}">${conf}</div></article>
      <article class="panel-card"><header><h2>Análisis de ítems</h2><p>Piso/techo = % en el valor mínimo/máximo (rojo sobre 15 %). Correlación ítem-total corregida dentro de su dimensión (rojo bajo 0,30).</p></header><div class="tabla-scroll">${tItems}</div></article>
      <article class="panel-card grafico"><header><h2>Respuestas por ítem</h2><p>Proporción de cada opción.</p></header>${dist}${leyenda}</article>
      <article class="panel-card grafico"><header><h2>Correlaciones entre ítems</h2><p>ρ de Spearman (las respuestas son ordinales). Cobalto = positiva · ámbar = negativa.</p></header>${heat}</article>
      <article class="panel-card"><header><h2>Estructura factorial exploratoria</h2><p>Sobre correlaciones policóricas: KMO, Bartlett, análisis paralelo y ejes principales con rotación oblimin. Es exploratorio; el AFC se hace en JASP o R.</p></header><div id="${idAfe}">${afeHtml}</div></article>
      ${continuo}
    </div>`;
  }

  function confiabilidad(inst, docs) {
    return puntuaciones(inst).filter(p => !p.compuesto && p.items.length >= 2).map(p => {
      const M = matrizItems(docs, p.items);
      const completos = E.completos(M);
      const colsP = p.items.map((_, j) => completos.map(f => f[j]));
      const Rp = E.matrizCorrelaciones(colsP, 'pearson').R;
      let Rpoly = E.matrizCorrelaciones(colsP, 'policorica').R;
      const valido = Rpoly.every(f => f.every(v => v != null));
      if (valido) Rpoly = E.suavizarCorrelacion(Rpoly).R;
      return {
        nombre: p.nombre, variable: varDim(inst, p.id), k: p.items.length, n: completos.length,
        alfa: E.alfaCronbach(completos), alfaOrd: valido ? E.alfaDeR(Rpoly) : null,
        omega: p.items.length >= 3 ? E.omegaDeR(Rp) : null, omegaOrd: valido && p.items.length >= 3 ? E.omegaDeR(Rpoly) : null
      };
    });
  }
  function pintarConfiabilidad(filas) {
    if (filas.error) return `<p class="vacio">${esc(filas.error)}</p>`;
    const c = v => (v == null ? '' : v < 0.7 ? 'mal' : 'ok');
    return `<table class="tabla-est"><thead><tr><th>Dimensión</th><th>Ítems</th><th>n</th><th>α</th><th>α ordinal</th><th>ω</th><th>ω ordinal</th></tr></thead><tbody>
      ${filas.map(f => `<tr><td>${esc(f.nombre)}<small>${f.variable}</small></td><td>${f.k}</td><td>${f.n}</td><td class="${c(f.alfa)}">${fmt(f.alfa)}</td><td class="${c(f.alfaOrd)}">${fmt(f.alfaOrd)}</td><td class="${c(f.omega)}">${fmt(f.omega)}</td><td class="${c(f.omegaOrd)}">${fmt(f.omegaOrd)}</td></tr>`).join('')}</tbody></table>
      <p class="explica">Con 2 ítems no se calcula ω. El α ordinal suele ser algo mayor que el α clásico porque no subestima la relación entre ítems con pocas opciones de respuesta.</p>`;
  }

  function factorial(inst, cols, n) {
    const k = cols.length;
    const idx = cols[0].map((_, i) => i).filter(i => cols.every(c => E.esNum(c[i])));
    const comp = cols.map(c => idx.map(i => c[i]));
    if (idx.length < Math.max(30, k + 5)) return { error: `Solo ${idx.length} casos completos; se necesitan al menos ${Math.max(30, k + 5)} para un análisis factorial.` };
    let { R } = E.matrizCorrelaciones(comp, 'policorica');
    if (R.some(f => f.some(v => v == null))) return { error: 'Algún ítem no tiene variabilidad suficiente.' };
    const sm = E.suavizarCorrelacion(R);
    R = sm.R;
    const kb = E.kmoBartlett(R, idx.length);
    const pa = E.analisisParalelo(R, idx.length, 100);
    const teorico = inst.id === 'eapesa' ? 1 : inst.dimensiones.filter(d => d.id !== 'Global' && d.items.length > 1).length;
    const nf = Math.min(st.nf || pa.factores, k - 1, 8);
    const f = E.afe(R, nf);
    return { n: idx.length, kb, pa, nf, teorico, afe: f, suavizada: sm.suavizada };
  }
  function pintarFactorial(inst, r) {
    if (r.error) return `<p class="sec-nota" style="margin:0">${esc(r.error)}</p>`;
    const { kb, pa, nf, afe: f } = r;
    const kmoTxt = kb.kmo >= 0.8 ? 'meritorio' : kb.kmo >= 0.7 ? 'aceptable' : kb.kmo >= 0.6 ? 'mediocre' : 'inadecuado';
    const dimDe = n => (inst.id === 'eapesa' ? 'Autoeficacia' : inst.dimensiones.find(x => x.id !== 'Global' && x.items.includes(n))?.nombre || '—');
    const cab = Array.from({ length: nf }, (_, j) => `<th>F${j + 1}</th>`).join('');
    const filas = inst.items.map((it, i) => `<tr><td>${it.codigo || 'Í' + String(it.n).padStart(2, '0')}</td><td style="text-align:left;font-family:var(--texto)">${esc(dimDe(it.n))}</td>${f.cargas[i].map(v => `<td class="${Math.abs(v) >= 0.3 ? 'fuerte' : 'debil'}">${fmt(v)}</td>`).join('')}<td>${fmt(f.comunalidades[i])}</td></tr>`).join('');
    const phi = nf > 1 ? `<p class="sec-nota" style="margin:10px 0 0">Correlaciones entre factores: ${f.Phi.flatMap((fila, i) => fila.slice(i + 1).map((v, j) => `F${i + 1}–F${i + j + 2} = ${fmt(v)}`)).join(' · ')}</p>` : '';
    const botones = Array.from({ length: Math.min(6, inst.items.length - 1) }, (_, j) => j + 1).map(v => `<button type="button" data-nf="${v}" aria-pressed="${v === nf}">${v}</button>`).join('');
    return `<div class="dos-col">
      <div>
        <table class="tabla-est"><tbody>
          <tr><td>Casos completos</td><td>${r.n}</td></tr>
          <tr><td>KMO</td><td class="${kb.kmo < 0.6 ? 'mal' : 'ok'}">${fmt(kb.kmo)} · ${kmoTxt}</td></tr>
          <tr><td>Bartlett</td><td>χ²(${kb.gl}) = ${fmt(kb.chi2, 1)}, p ${kb.p < 0.001 ? '< 0,001' : '= ' + fmt(kb.p, 3)}</td></tr>
          <tr><td>Análisis paralelo</td><td><b>${pa.factores}</b> factor${pa.factores === 1 ? '' : 'es'} · ${pa.componentes} componente${pa.componentes === 1 ? '' : 's'}</td></tr>
          <tr><td>Estructura teórica</td><td>${r.teorico} dimensión${r.teorico === 1 ? '' : 'es'}</td></tr>
        </tbody></table>
        <div class="an-sub" style="margin-top:14px"><span class="kicker">Factores a extraer</span><div class="segmentado">${botones}</div></div>
        <div class="grafico">${sedimentacion(pa.observadosF, pa.aleatoriosF)}</div>
        <div class="leyenda"><span><i style="background:#0F1D2B"></i>Observado (matriz reducida)</span><span><i style="background:repeating-linear-gradient(90deg,#6A7888 0 4px,transparent 4px 7px)"></i>Aleatorio, percentil 95</span></div>
      </div>
      <div class="tabla-scroll"><table class="tabla-est"><thead><tr><th>Ítem</th><th>Dimensión teórica</th>${cab}<th>h²</th></tr></thead><tbody>${filas}</tbody></table>${phi}</div>
    </div>
    <p class="explica"><b>Cómo leerlo:</b> KMO ≥ 0,70 y Bartlett significativo indican que tiene sentido factorizar. El análisis paralelo sugiere retener los factores cuyo autovalor supera al de datos aleatorios. Las cargas ≥ 0,30 van en negrita: si los ítems de una misma dimensión teórica cargan juntos, la estructura se replica en esta cohorte.${r.suavizada ? ' La matriz policórica se suavizó para hacerla definida positiva.' : ''}</p>`;
  }

  function pintarContinuo(c) {
    if (c.n < 10) return '';
    const nombres = { Amotivacion: 'Amotivación', RegulacionExterna: 'Reg. externa', RegulacionIntroyectada: 'Reg. introyectada', RegulacionIdentificada: 'Reg. identificada', MI_Conocimiento: 'MI conocimiento', MI_Logro: 'MI logro', MI_ExpEstimulantes: 'MI exp. estimulantes' };
    const clase = c.veredicto === 'se cumple' ? 'si' : c.veredicto === 'no se cumple' ? 'no' : 'parcial';
    return `<article class="panel-card"><header><h2>Continuo de autodeterminación</h2><p>Si la EME-E funciona como continuo, las subescalas vecinas correlacionan más que las lejanas y la amotivación correlaciona negativamente con la motivación intrínseca. Correlación: ${c.metodo === 'spearman' ? 'Spearman' : 'Pearson'}.</p></header>
      <div class="dos-col"><div>
        <p><span class="veredicto ${clase}">El patrón ${c.veredicto}</span></p>
        <table class="tabla-est"><thead><tr><th>Distancia en el continuo</th><th>r promedio</th></tr></thead><tbody>
          ${c.porLag.map(l => `<tr><td>${l.lag} ${l.lag === 1 ? 'paso (vecinas)' : 'pasos'}</td><td>${fmt(l.r)}</td></tr>`).join('')}
          <tr><td>ρ entre distancia y r (esperado: negativo)</td><td class="${c.rho != null && c.rho < 0 ? 'ok' : 'mal'}">${fmt(c.rho)}</td></tr>
          <tr><td>Amotivación con MI (esperado ≤ 0)</td><td>${c.amMI.map(v => fmt(v)).join(' · ')}</td></tr>
        </tbody></table></div>
        <div class="grafico">${matrizCorrelacion(Object.keys(nombres).map(k => ({ corto: nombres[k] })), c.R)}</div></div>
      <p class="explica">En mayo el patrón no se cumplió (la amotivación correlacionó positivo con MI a experiencias estimulantes), por eso no se calcula un índice de autodeterminación. Si en esta cohorte se cumple, se podría evaluar usarlo.</p></article>`;
  }

  // ---------------------------------------------------------------- C · Relaciones
  function vistaRelaciones(D) {
    const P = D.personas;
    if (P.length < 10) return vacio(10);
    const vars = DIMENSIONES_BASE;
    const cols = vars.map(v => columna(P, v.variable));
    const dec = decidirMetodo(cols.filter(c => c.filter(E.esNum).length >= 3));
    const noNorm = vars.filter((v, i) => { const p = E.shapiroWilk(cols[i]).p; return p != null && p < 0.05; });
    const { R, N } = memo(`rel-${dec.metodo}`, () => E.matrizCorrelaciones(cols, dec.metodo));
    const heat = matrizCorrelacion(vars.map(v => ({ corto: v.corto })), R, N);

    // Red: casos completos
    const idx = P.map((_, i) => i).filter(i => cols.every(c => E.esNum(c[i])));
    let red = '';
    if (idx.length < vars.length + 10) red = `<p class="sec-nota" style="margin:0">La red requiere estudiantes con los cuatro instrumentos respondidos: hay ${idx.length} y se necesitan al menos ${vars.length + 10}.</p>`;
    else {
      const comp = cols.map(c => idx.map(i => c[i]));
      const { R: Rc } = E.matrizCorrelaciones(comp, dec.metodo);
      const Pc = E.correlacionesParciales(E.suavizarCorrelacion(Rc).R);
      const sig = Pc.map((f, i) => f.map((v, j) => i !== j && (E.pCorrelacion(v, idx.length, vars.length - 2) ?? 1) < 0.05));
      const nodos = vars.map(v => ({ ...v, etiqueta: v.corto.replace(/^(EME-E|IPAA|EAPESA|PERMA) /, '') }));
      red = `<div class="grafico" style="max-width:720px;margin:0 auto">${redParcial(nodos, Pc, sig)}</div>
        <div class="leyenda">${INSTRUMENTOS.map(i => `<span><i style="background:${i.color};border-radius:50%"></i>${i.sigla}</span>`).join('')}<span><i style="background:#2B4A9E"></i>Positiva</span><span><i style="background:repeating-linear-gradient(90deg,#A65C08 0 4px,transparent 4px 7px)"></i>Negativa</span></div>
        <p class="explica">Cada línea es una <b>correlación parcial</b>: la relación entre dos dimensiones descontando todas las demás. Solo se dibujan las significativas (p < 0,05) y de magnitud ≥ 0,10; el grosor indica la fuerza. n = ${idx.length} estudiantes con los cuatro instrumentos.</p>`;
    }

    // Regresión
    const gen = VARIABLES_GENERALES;
    if (!st.preds) st.preds = gen.filter(v => v.id !== st.dep).map(v => v.id);
    st.preds = st.preds.filter(id => id !== st.dep);
    const dep = gen.find(v => v.id === st.dep);
    const predsV = gen.filter(v => st.preds.includes(v.id));
    let reg = '<p class="sec-nota">Elige al menos un predictor.</p>';
    if (predsV.length) {
      const y = columna(P, dep.variable);
      const X = predsV.map(v => columna(P, v.variable));
      const r = E.regresion(y, X, predsV.map(v => v.nombre));
      if (!r) reg = '<p class="sec-nota">Datos insuficientes para la regresión.</p>';
      else {
        const boot = memo(`boot-${st.dep}-${st.preds.join(',')}`, () => bootstrapRegresion(y, X, 1000));
        reg = `<table class="tabla-est"><thead><tr><th>Predictor</th><th>B</th><th>EE</th><th>β</th><th>t</th><th>p</th><th>IC 95 % B (bootstrap)</th><th>VIF</th></tr></thead><tbody>
          ${r.coef.map((c, j) => `<tr><td>${esc(c.nombre)}</td><td>${fmt(c.b, 3)}</td><td>${fmt(c.se, 3)}</td><td>${c.beta == null ? '—' : fmt(c.beta)}</td><td>${fmt(c.t)}</td><td class="${c.p < 0.05 ? 'ok' : ''}">${fp(c.p)}</td><td>${boot[j] ? `${fmt(boot[j][0], 3)} a ${fmt(boot[j][1], 3)}` : '—'}</td><td class="${c.vif > 5 ? 'mal' : ''}">${c.vif == null ? '—' : fmt(c.vif)}</td></tr>`).join('')}
        </tbody></table>
        <p class="sec-nota" style="margin:10px 0 0">n = ${r.n} · R² = ${fmt(r.R2)} · R² ajustado = ${fmt(r.R2aj)} · F(${r.glF.join(', ')}) = ${fmt(r.F)}, ${peq(r.pF)} · Normalidad de residuos (Shapiro-Wilk): ${peq(r.normalidadResiduos.p)}</p>
        <p class="explica">${r.normalidadResiduos.p != null && r.normalidadResiduos.p < 0.05
          ? '<b>Los residuos no son normales:</b> los coeficientes siguen siendo válidos, pero los p-valores son aproximados. Usa el <b>intervalo bootstrap</b> (1.000 remuestreos), que no supone normalidad: si no incluye 0, el efecto es robusto.'
          : '<b>Los residuos son compatibles con la normalidad</b>, así que los p-valores del modelo son adecuados. El intervalo bootstrap sirve de confirmación.'}
          β = coeficiente estandarizado (compara la fuerza de cada predictor). Un VIF > 5 indica colinealidad.</p>`;
      }
    }

    const tablaNorm = `<table class="tabla-est"><thead><tr><th>Dimensión</th><th>n</th><th>S-W p</th><th>Asim.</th></tr></thead><tbody>${vars.map((v, i) => { const sw = E.shapiroWilk(cols[i]); return `<tr><td>${esc(v.corto)}</td><td>${sw.n}</td><td class="${sw.p != null && sw.p < 0.05 ? 'mal' : ''}">${fp(sw.p)}</td><td>${fmt(E.asimetria(cols[i].filter(E.esNum)))}</td></tr>`; }).join('')}</tbody></table>`;

    return `<div class="an-grid">
      <article class="panel-card"><header><h2>¿Paramétrico o no paramétrico?</h2><p>Decisión automática según Shapiro-Wilk (α = 0,05) de cada dimensión.</p></header>
        <div class="dos-col"><div>
          <p><span class="veredicto ${dec.parametrico ? 'si' : 'parcial'}">${dec.parametrico ? 'Todas compatibles con normalidad → Pearson' : `${noNorm.length} de ${vars.length} no normales → Spearman`}</span></p>
          <p class="explica"><b>Criterio:</b> las respuestas a cada ítem son <b>ordinales y discretas</b>, así que a nivel de ítem siempre se usa Spearman o policóricas. Los puntajes de dimensión promedian varios ítems y se tratan como aproximadamente continuos <b>solo si</b> su distribución es compatible con la normalidad; si alguna no lo es, se usan pruebas no paramétricas (Spearman, Kruskal-Wallis). Con n > 100, Shapiro-Wilk detecta desvíos pequeños: revisa también la asimetría (|asim.| < 1 es moderada).</p>
        </div><div class="tabla-scroll" style="max-height:380px">${tablaNorm}</div></div></article>
      <article class="panel-card grafico"><header><h2>Correlaciones entre dimensiones</h2><p>${dec.metodo === 'spearman' ? 'ρ de Spearman' : 'r de Pearson'} a nivel estudiante, cruzando instrumentos (pares completos). Pasa el cursor para ver n.</p></header>${heat}</article>
      <article class="panel-card"><header><h2>Red psicométrica</h2><p>Qué dimensiones se relacionan directamente entre sí.</p></header>${red}</article>
      <article class="panel-card"><header><h2>Qué variables explican otras</h2><p>Regresión lineal múltiple entre las cuatro variables generales.</p></header>
        <div class="an-sub"><span class="kicker">Variable a explicar</span><div class="segmentado">${gen.map(v => `<button type="button" data-dep="${v.id}" aria-pressed="${v.id === st.dep}">${esc(v.corto)}</button>`).join('')}</div>
        <span class="kicker" style="margin-left:14px">Predictores</span><div class="chk-lista">${gen.filter(v => v.id !== st.dep).map(v => `<label><input type="checkbox" data-pred="${v.id}" ${st.preds.includes(v.id) ? 'checked' : ''}>${esc(v.corto)}</label>`).join('')}</div></div>
        ${reg}</article>
    </div>`;
  }

  function bootstrapRegresion(y, X, reps) {
    const idx = y.map((_, i) => i).filter(i => E.esNum(y[i]) && X.every(c => E.esNum(c[i])));
    const rng = E.rngSemilla(99);
    const coefs = [];
    for (let r = 0; r < reps; r++) {
      const m = idx.map(() => idx[Math.floor(rng.u() * idx.length)]);
      const fit = E.regresion(m.map(i => y[i]), X.map(c => m.map(i => c[i])), X.map((_, j) => String(j)));
      if (fit) coefs.push(fit.coef.map(c => c.b));
    }
    if (coefs.length < reps * 0.9) return [];
    return coefs[0].map((_, j) => { const v = coefs.map(c => c[j]).sort((a, b) => a - b); return [E.cuantil(v, 0.025), E.cuantil(v, 0.975)]; });
  }

  // ---------------------------------------------------------------- D · Perfiles
  function vistaPerfiles(D) {
    const P = D.personas;
    const gen = VARIABLES_GENERALES;
    const completos = P.filter(p => gen.every(v => E.esNum(p.puntajes[v.variable])));
    const ejes = gen.map(v => ({ nombre: v.corto }));
    let clusters = '';
    if (completos.length < 20) clusters = `<p class="sec-nota" style="margin:0">Se necesitan al menos 20 estudiantes con los cuatro instrumentos respondidos (hay ${completos.length}).</p>`;
    else {
      const cols = gen.map(v => completos.map(p => p.puntajes[v.variable]));
      const Z = E.zscores(cols);
      const puntos = completos.map((_, i) => Z.map(c => c[i]));
      const sol = memo('kmeans', () => [2, 3, 4, 5].map(k => { const r = E.kmedias(puntos, k, { reinicios: 40 }); return { k, ...r, sil: E.silueta(puntos, r.asignacion).media }; }));
      const mejor = sol.reduce((a, b) => (b.sil > a.sil ? b : a));
      const k = st.k || mejor.k;
      const s = sol.find(x => x.k === k);
      const grupos = Array.from({ length: k }, (_, g) => completos.filter((_, i) => s.asignacion[i] === g));
      const series = grupos.map((g, j) => ({
        nombre: `Grupo ${j + 1} (n = ${g.length})`, color: COLORES_GRUPO[j],
        valores: gen.map(v => pomp(E.mediaSimple(g.map(p => p.puntajes[v.variable])), v.min, v.max)),
        brutos: gen.map(v => E.mediaSimple(g.map(p => p.puntajes[v.variable])))
      }));
      const pruebas = gen.map((v, c) => {
        const gs = grupos.map(g => g.map(p => p.puntajes[v.variable]));
        const normal = gs.every(x => x.length < 3 || (E.shapiroWilk(x).p ?? 0) >= 0.05);
        const t = normal ? E.anova1(gs) : E.kruskalWallis(gs);
        return normal ? `ANOVA F = ${fmt(t.F)}, ${peq(t.p)}, η² = ${fmt(t.eta2)}` : `K-W H = ${fmt(t.H)}, ${peq(t.p)}, ε² = ${fmt(t.epsilon2)}`;
      });
      clusters = `<div class="dos-col">
        <div>
          <div class="an-sub"><span class="kicker">Número de grupos</span><div class="segmentado">${sol.map(x => `<button type="button" data-k="${x.k}" aria-pressed="${x.k === k}">${x.k}</button>`).join('')}</div></div>
          <div class="grafico">${barrasSimples(sol.map(x => ({ x: x.k, label: `k = ${x.k}`, y: x.sil })), { max: Math.max(0.6, ...sol.map(x => x.sil)), destacar: k })}</div>
          <p class="sec-nota" style="margin:4px 0 0">Silueta media (más alto = grupos mejor separados). Sugerido: <b>k = ${mejor.k}</b>. Bajo 0,25 la estructura de grupos es débil.</p>
          <div class="tabla-scroll" style="margin-top:14px"><table class="tabla-est"><thead><tr><th>Grupo</th><th>n</th>${gen.map(v => `<th>${esc(v.corto)}</th>`).join('')}</tr></thead><tbody>
            ${grupos.map((g, j) => `<tr><td><span style="color:${COLORES_GRUPO[j]}">●</span> Grupo ${j + 1}</td><td>${g.length}</td>${gen.map(v => `<td>${fmt(E.mediaSimple(g.map(p => p.puntajes[v.variable])))}</td>`).join('')}</tr>`).join('')}
            <tr class="sub"><td colspan="2">Diferencia entre grupos</td>${pruebas.map(t => `<td style="font-size:10.5px;white-space:normal">${t}</td>`).join('')}</tr>
          </tbody></table></div>
          <button class="btn sec chico" type="button" data-accion="bajar-grupos" style="margin-top:12px">Descargar asignación (ID ↔ grupo, CSV)</button>
        </div>
        <div><div class="grafico">${arana(ejes, series)}</div><div class="leyenda-grupos">${series.map(se => `<span><i style="background:${se.color}"></i>${esc(se.nombre)}</span>`).join('')}</div></div>
      </div>
      <p class="explica">k-medias sobre las cuatro variables estandarizadas (puntaje z), con 40 inicios aleatorios. La araña muestra la media de cada grupo como <b>% de la escala</b> (0 = mínimo posible, 100 = máximo), para comparar escalas distintas. Solo entran los ${completos.length} estudiantes con los cuatro instrumentos.</p>`;
      st._grupos = completos.map((p, i) => ({ ID: p.id, COHORTE: p.cohorte, GRUPO: s.asignacion[i] + 1, K: k, ...Object.fromEntries(gen.map(v => [v.id, p.puntajes[v.variable]])) }));
    }

    // Perfil individual
    const nDatos = p => gen.filter(v => E.esNum(p.puntajes[v.variable])).length;
    const conDatos = P.filter(p => nDatos(p) > 0).sort((a, b) => nDatos(b) - nDatos(a) || a.id.localeCompare(b.id));
    if (!conDatos.find(p => p.id === st.persona)) st.persona = conDatos[0]?.id;
    const per = conDatos.find(p => p.id === st.persona);
    let individual = '<p class="sec-nota">Sin datos.</p>';
    if (per) {
      const cuart = gen.map(v => { const c = columna(P, v.variable).filter(E.esNum).sort((a, b) => a - b); return { q1: E.cuantil(c, 0.25), md: E.cuantil(c, 0.5), q3: E.cuantil(c, 0.75), c }; });
      const banda = { lo: gen.map((v, i) => pomp(cuart[i].q1, v.min, v.max)), hi: gen.map((v, i) => pomp(cuart[i].q3, v.min, v.max)) };
      const series = [
        { nombre: 'Mediana de la cohorte', color: '#6A7888', punteada: true, valores: gen.map((v, i) => pomp(cuart[i].md, v.min, v.max)), brutos: cuart.map(c => c.md) },
        { nombre: st.nombres ? per.nombre : per.id, color: '#0F1D2B', valores: gen.map(v => pomp(per.puntajes[v.variable], v.min, v.max)), brutos: gen.map(v => per.puntajes[v.variable]) }
      ];
      const opciones = conDatos.map(p => `<option value="${p.id}" ${p.id === per.id ? 'selected' : ''}>${esc(st.nombres ? `${p.nombre} · ${p.id}` : p.id)}${nDatos(p) < 4 ? ` (${nDatos(p)}/4 variables)` : ''}</option>`).join('');
      individual = `<div class="an-sub"><select class="selector ancho" data-persona>${opciones}</select>
        <label class="chk-lista"><label><input type="checkbox" data-nombres ${st.nombres ? 'checked' : ''}>Mostrar nombres</label></label></div>
        <div class="dos-col"><div class="grafico">${arana(ejes, series, { banda })}</div>
        <div><table class="tabla-est"><thead><tr><th>Variable</th><th>Puntaje</th><th>% escala</th><th>Percentil en la cohorte</th></tr></thead><tbody>
          ${gen.map((v, i) => { const x = per.puntajes[v.variable]; return `<tr><td>${esc(v.nombre)}</td><td>${fmt(x)}</td><td>${fmt(pomp(x, v.min, v.max), 0)}</td><td>${E.esNum(x) ? 'P' + fmt(E.percentilDe(x, cuart[i].c), 0) : '—'}</td></tr>`; }).join('')}
        </tbody></table>
        <div class="leyenda" style="margin-top:12px"><span><i style="background:#0F1D2B"></i>Estudiante</span><span><i style="background:repeating-linear-gradient(90deg,#6A7888 0 4px,transparent 4px 7px)"></i>Mediana de la cohorte</span><span><i style="background:rgba(15,29,43,.12)"></i>50 % central (P25–P75)</span></div>
        <p class="explica">Uso exclusivo del equipo investigador. El consentimiento V4.0 excluye el uso de los datos para identificar o intervenir a estudiantes individuales.</p></div></div>`;
    }

    return `<div class="an-grid">
      <article class="panel-card"><header><h2>Grupos de estudiantes</h2><p>Motivación intrínseca (EME MI Global), autorregulación (IPAA total), autoeficacia (EAPESA 10 ítems) y bienestar (PERMA global).</p></header>${clusters}</article>
      <article class="panel-card"><header><h2>Perfil individual</h2><p>Identificado por ID seudónimo. Los nombres se muestran solo si activas la opción.</p></header>${individual}</article>
    </div>`;
  }

  // ---------------------------------------------------------------- E · Calidad
  function vistaCalidad(D) {
    const q = D.calidad;
    if (!q.length) return vacio();
    const marcadas = q.filter(x => x.motivos.length);
    const cuenta = m => q.filter(x => x.motivos.includes(m)).length;
    const spi = q.map(x => x.segundosPorItem).filter(E.esNum).map(v => Math.min(v, 30));
    const kpi = (t, v, s) => `<div class="kpi"><span class="kicker">${t}</span><b>${v}</b><p>${s}</p></div>`;
    const nomM = id => D.momentos.find(m => m.id === id)?.nombre || id;
    const filas = marcadas.sort((a, b) => b.motivos.length - a.motivos.length).map(x => `<tr><td class="mono">${x.id}</td><td>${esc(nomM(x.doc.momentoId))}</td><td>${INSTRUMENTO[x.doc.instrumentoId].sigla}</td>
      <td>${x.segundos == null ? '—' : `${Math.floor(x.segundos / 60)}:${String(Math.round(x.segundos % 60)).padStart(2, '0')}`}</td><td class="${x.segundosPorItem != null && x.segundosPorItem < UMBRALES_CALIDAD.segundosPorItem ? 'mal' : ''}">${fmt(x.segundosPorItem, 1)}</td>
      <td>${x.longstring}/${x.k}</td><td class="${x.deIntra === 0 ? 'mal' : ''}">${fmt(x.deIntra)}</td><td>${x.omisiones}</td><td style="text-align:left;font-family:var(--texto)">${x.motivos.map(m => `<span class="pill alerta">${m}</span>`).join(' ')}</td></tr>`).join('');
    return `<div class="an-grid">
      <div class="kpis">${kpi('Cuestionarios revisados', q.length, 'Enviados, de quienes aceptaron')}${kpi('Marcados', marcadas.length, `${fmt((100 * marcadas.length) / q.length, 1)} % del total`)}${kpi('Rápidos', cuenta('rápida'), `< ${UMBRALES_CALIDAD.segundosPorItem} s por ítem`)}${kpi('Planos o repetidos', cuenta('misma opción en todo') + cuenta('secuencia repetida'), `${cuenta('muchas omisiones')} con muchas omisiones`)}</div>
      <article class="panel-card grafico"><header><h2>Segundos por ítem</h2><p>Tiempo entre el primer guardado y el envío, dividido por el número de ítems (valores sobre 30 s se muestran en 30).</p></header>${spi.length ? histograma(spi, { min: 0, max: 30, color: '#0F1D2B', bins: 30, etiqueta: 'segundos por ítem', anchoSvg: 900, alto: 220 }) : '<p class="vacio">Sin tiempos registrados.</p>'}</article>
      <article class="panel-card"><header><h2>Cuestionarios marcados</h2><p>Revísalos antes de decidir si se excluyen. El filtro "Excluir baja calidad" los quita de todos los análisis, pero no de la exportación.</p></header>
        ${filas ? `<div class="tabla-scroll"><table class="tabla-est"><thead><tr><th>ID</th><th>Momento</th><th>Instrumento</th><th>Duración</th><th>s/ítem</th><th>Secuencia máx.</th><th>DE intra</th><th>Omitidas</th><th>Motivo</th></tr></thead><tbody>${filas}</tbody></table></div>` : '<p class="vacio">Ningún cuestionario marcado.</p>'}
        <p class="explica"><b>Criterios:</b> apresurada = menos de ${UMBRALES_CALIDAD.segundosPorItem} s por ítem (Huang et al., 2012); secuencia repetida = la misma opción en ≥ ${UMBRALES_CALIDAD.longstringProp * 100} % de ítems seguidos (mínimo 8); plana = desviación estándar 0 dentro del cuestionario; omisiones = más del ${UMBRALES_CALIDAD.omisionProp * 100} % con "Prefiero no responder". El tiempo empieza a contar desde la primera respuesta guardada, así que la lectura de instrucciones no se incluye.</p></article>
    </div>`;
  }

  const vacio = (min = 1) => `<div class="panel-card vacio"><b>Sin datos suficientes</b>Se necesitan al menos ${min} cuestionario${min === 1 ? '' : 's'} enviado${min === 1 ? '' : 's'} en la cohorte elegida.</div>`;

  // ---------------------------------------------------------------- pintar y eventos
  function pintar() {
    const { config, participantes } = obtener();
    const coh = [...new Set(participantes.filter(p => p.consentimiento?.acepta).map(p => String(p.cohorte || config.cohorte || 'sin cohorte')))].sort();
    if (st.cohorte == null) st.cohorte = coh.includes(String(config.cohorte)) ? String(config.cohorte) : 'todas';
    selCohorte.innerHTML = `<option value="todas" ${st.cohorte === 'todas' ? 'selected' : ''}>Todas</option>` + coh.map(c => `<option value="${esc(c)}" ${c === st.cohorte ? 'selected' : ''}>${esc(c)}</option>`).join('');
    chkExcluir.checked = st.excluir;
    tabs.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === st.tab)));
    const D = datos();
    nota.textContent = TABS[st.tab] + (D.fueraCriterio ? ` · Se excluyen ${D.fueraCriterio} estudiante${D.fueraCriterio === 1 ? '' : 's'} fuera de criterio (matrícula de otro año).` : '');
    const vista = { cohorte: vistaCohorte, instrumento: vistaInstrumento, relaciones: vistaRelaciones, perfiles: vistaPerfiles, calidad: vistaCalidad }[st.tab];
    try { raiz.innerHTML = vista(D); } catch (e) { console.error(e); raiz.innerHTML = `<div class="panel-card vacio"><b>No se pudo calcular</b>${esc(e.message)}</div>`; }
  }

  tabs.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { st.tab = b.dataset.tab; pintar(); } });
  selCohorte.addEventListener('change', () => { st.cohorte = selCohorte.value; st.k = null; pintar(); });
  chkExcluir.addEventListener('change', () => { st.excluir = chkExcluir.checked; st.k = null; pintar(); });
  raiz.addEventListener('click', e => {
    const t = e.target.closest('[data-momento],[data-inst],[data-nf],[data-k],[data-dep],[data-accion]');
    if (!t) return;
    if (t.dataset.momento) { st.momento = t.dataset.momento; st.nf = null; }
    else if (t.dataset.inst) { st.inst = t.dataset.inst; st.nf = null; }
    else if (t.dataset.nf) st.nf = Number(t.dataset.nf);
    else if (t.dataset.k) st.k = Number(t.dataset.k);
    else if (t.dataset.dep) { st.dep = t.dataset.dep; st.preds = VARIABLES_GENERALES.filter(v => v.id !== st.dep).map(v => v.id); }
    else if (t.dataset.accion === 'bajar-grupos' && st._grupos) {
      const cols = Object.keys(st._grupos[0]);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([aCSV(st._grupos, cols)], { type: 'text/csv;charset=utf-8' }));
      a.download = `nonio_grupos_k${st._grupos[0].K}.csv`;
      document.body.append(a); a.click(); a.remove();
      return;
    }
    pintar();
  });
  raiz.addEventListener('change', e => {
    if (e.target.matches('[data-pred]')) {
      st.preds = [...raiz.querySelectorAll('[data-pred]:checked')].map(i => i.dataset.pred);
      pintar();
    } else if (e.target.matches('[data-persona]')) { st.persona = e.target.value; pintar(); }
    else if (e.target.matches('[data-nombres]')) { st.nombres = e.target.checked; pintar(); }
  });

  return {
    pintar,
    invalidar() { version++; cache.clear(); }
  };
}
