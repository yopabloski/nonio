// Nonio · gráficos SVG sin dependencias.
// Reglas: marcas delgadas, un eje, grilla recesiva, texto en tinta (nunca en el
// color de la serie), tooltip en cada marca (atributo data-tip).

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const fmt = (v, d = 2) => v == null || Number.isNaN(v) ? '—' : Number(v).toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function rgbHex([r, g, b]) { return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join(''); }
export function mezcla(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A.map((x, i) => x + (B[i] - x) * t)); }

// Rampa secuencial de un solo tono: claro → color → oscuro.
export function rampa(color, k) {
  if (k === 1) return [color];
  return Array.from({ length: k }, (_, i) => {
    const t = i / (k - 1);
    return t < 0.7 ? mezcla('#E6EAE6', color, 0.18 + (t / 0.7) * 0.82) : mezcla(color, '#0F1D2B', ((t - 0.7) / 0.3) * 0.45);
  });
}

// Divergente: ámbar (negativo) · gris neutro · cobalto (positivo).
export function divergente(r) {
  if (r == null) return '#F4F5F2';
  const t = Math.max(-1, Math.min(1, r));
  return t >= 0 ? mezcla('#EEF1EC', '#2B4A9E', t) : mezcla('#EEF1EC', '#A65C08', -t);
}

// ---------- Columnas (conteo por día) ----------
export function columnas(datos, { color = '#0F1D2B', alto = 220 } = {}) {
  if (!datos.length) return '<p class="vacio">Aún no hay envíos.</p>';
  const W = 560, H = alto, m = { t: 14, r: 8, b: 30, l: 30 };
  const max = Math.max(...datos.map(d => d.y), 1);
  const paso = niceStep(max);
  const tope = Math.ceil(max / paso) * paso;
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const bw = iw / datos.length;
  const y = v => m.t + ih - (v / tope) * ih;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Envíos por día">`;
  for (let v = 0; v <= tope; v += paso) s += `<line class="grilla" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  const etiquetaCada = Math.ceil(datos.length / 10);
  datos.forEach((d, i) => {
    const x = m.l + i * bw + 1;
    const w = Math.max(2, bw - 2);
    const h = ih - (y(d.y) - m.t);
    if (d.y > 0) s += `<path d="${barra(x, y(d.y), w, h, 3)}" fill="${color}" data-tip="<b>${esc(d.label)}</b><br>${d.y} enviados"/>`;
    s += `<rect x="${x}" y="${m.t}" width="${w}" height="${ih}" fill="transparent" data-tip="<b>${esc(d.label)}</b><br>${d.y} enviados"/>`;
    if (i % etiquetaCada === 0) s += `<text x="${x + w / 2}" y="${H - 10}" text-anchor="middle">${esc(d.corto || d.label)}</text>`;
  });
  s += `<line class="eje" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}"/></svg>`;
  return s;
}

// Barra con extremo superior redondeado y base recta.
function barra(x, y, w, h, r) {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function niceStep(max) {
  const bruto = max / 4;
  const p = 10 ** Math.floor(Math.log10(bruto || 1));
  const n = bruto / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

// ---------- Histograma pequeño ----------
export function histograma(valores, { min, max, color, bins = 10, etiqueta = '', anchoSvg = 220, alto = 96 }) {
  const W = anchoSvg, H = alto, m = { t: 6, r: 4, b: 18, l: 4 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const ancho = (max - min) / bins;
  const conteo = Array(bins).fill(0);
  for (const v of valores) {
    if (v == null) continue;
    conteo[Math.min(bins - 1, Math.max(0, Math.floor((v - min) / ancho)))]++;
  }
  const tope = Math.max(...conteo, 1);
  const bw = iw / bins;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Distribución ${esc(etiqueta)}">`;
  conteo.forEach((c, i) => {
    const h = (c / tope) * ih;
    const x = m.l + i * bw + 1;
    const desde = min + i * ancho, hasta = desde + ancho;
    const tip = `<b>${fmt(desde, 1)}–${fmt(hasta, 1)}</b><br>${c} participante${c === 1 ? '' : 's'}`;
    if (c) s += `<path d="${barra(x, m.t + ih - h, bw - 2, h, 2)}" fill="${color}" data-tip="${tip}"/>`;
    s += `<rect x="${x}" y="${m.t}" width="${bw - 2}" height="${ih}" fill="transparent" data-tip="${tip}"/>`;
  });
  s += `<line class="eje" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}"/>`;
  s += `<text x="${m.l}" y="${H - 4}">${fmt(min, 0)}</text><text x="${W - m.r}" y="${H - 4}" text-anchor="end">${fmt(max, 0)}</text>`;
  const med = media(valores);
  if (med != null) {
    const xm = m.l + ((med - min) / (max - min)) * iw;
    s += `<line x1="${xm}" x2="${xm}" y1="${m.t - 2}" y2="${m.t + ih}" stroke="#0F1D2B" stroke-width="1.5" stroke-dasharray="3 2"/>`;
  }
  return s + '</svg>';
}
const media = xs => { const v = xs.filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

// ---------- Barras 100 % apiladas por ítem ----------
export function apiladas(items, opciones, colores) {
  const W = 760, fila = 24, gap = 6, m = { t: 4, r: 8, b: 4, l: 48 };
  const H = m.t + m.b + items.length * (fila + gap);
  const iw = W - m.l - m.r;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Distribución de respuestas por ítem">`;
  items.forEach((it, k) => {
    const y = m.t + k * (fila + gap);
    const total = it.conteos.reduce((a, b) => a + b, 0) + it.noResponde;
    s += `<text x="${m.l - 8}" y="${y + fila / 2 + 4}" text-anchor="end">${esc(it.corto)}</text>`;
    if (!total) return;
    let x = m.l;
    it.conteos.forEach((c, i) => {
      if (!c) return;
      const w = (c / total) * iw;
      const tip = `<b>${esc(it.corto)} · ${esc(opciones[i].etiqueta || String(opciones[i].valor))}</b><br>${c} (${fmt((c / total) * 100, 0)} %)<br><span>${esc(it.texto)}</span>`;
      s += `<rect x="${x}" y="${y}" width="${Math.max(0, w - 2)}" height="${fila}" rx="3" fill="${colores[i]}" data-tip="${tip}"/>`;
      x += w;
    });
    if (it.noResponde) {
      const w = (it.noResponde / total) * iw;
      s += `<rect x="${x}" y="${y}" width="${Math.max(0, w - 2)}" height="${fila}" rx="3" fill="url(#rayado)" data-tip="<b>${esc(it.corto)} · Prefiero no responder</b><br>${it.noResponde}"/>`;
    }
  });
  s = s.replace('role="img"', 'role="img"') + `<defs><pattern id="rayado" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#E3E8E1"/><line x1="0" y1="0" x2="0" y2="6" stroke="#6A7888" stroke-width="2"/></pattern></defs>`;
  return s + '</svg>';
}

// ---------- Matriz de correlaciones ----------
export function matrizCorrelacion(vars, R, nPares) {
  const k = vars.length;
  const c = Math.max(26, Math.min(44, Math.floor(560 / Math.max(k, 1))));
  const m = { t: 8, l: 190 };
  const W = m.l + k * c + 10, H = m.t + k * c + 130;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Matriz de correlaciones">`;
  for (let i = 0; i < k; i++) {
    s += `<text x="${m.l - 8}" y="${m.t + i * c + c / 2 + 4}" text-anchor="end">${esc(vars[i].corto)}</text>`;
    s += `<text transform="translate(${m.l + i * c + c / 2 + 4},${m.t + k * c + 8}) rotate(60)">${esc(vars[i].corto)}</text>`;
    for (let j = 0; j <= i; j++) {
      const r = R[i][j];
      const x = m.l + j * c, y = m.t + i * c;
      const tip = `<b>${esc(vars[i].corto)} × ${esc(vars[j].corto)}</b><br>r = ${fmt(r)}${nPares ? ` · n = ${nPares[i][j]}` : ''}`;
      s += `<rect x="${x + 1}" y="${y + 1}" width="${c - 2}" height="${c - 2}" rx="3" fill="${i === j ? '#E3E8E1' : divergente(r)}" data-tip="${tip}"/>`;
      if (i !== j && r != null && c >= 30) {
        s += `<text x="${x + c / 2}" y="${y + c / 2 + 4}" text-anchor="middle" style="fill:${Math.abs(r) > 0.55 ? '#fff' : '#0F1D2B'};font-size:10px">${fmt(r, 2).replace(/^0/, '').replace(/^-0/, '−')}</text>`;
      }
    }
  }
  return s + '</svg>';
}

// ---------- Tooltip compartido ----------
export function activarTooltips(raiz, tip) {
  raiz.addEventListener('mousemove', e => {
    const el = e.target.closest('[data-tip]');
    if (!el) { tip.hidden = true; return; }
    tip.innerHTML = el.getAttribute('data-tip');
    tip.hidden = false;
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    const y = e.clientY + 16 + tip.offsetHeight > window.innerHeight ? e.clientY - tip.offsetHeight - 12 : e.clientY + 16;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  });
  raiz.addEventListener('mouseleave', () => { tip.hidden = true; });
}

// ================================================================ análisis v2

// ---------- Boxplots horizontales (una fila por variable, eje común) ----------
// filas: [{ nombre, sub, r: resumen(), valores, color }]
export function boxplots(filas, { min, max, alto = 34, etiqueta = 190, paso = 1, ancho = 760 } = {}) {
  if (!filas.length) return '';
  const W = ancho, m = { t: 8, r: 16, b: 26, l: etiqueta };
  const H = m.t + m.b + filas.length * alto;
  const iw = W - m.l - m.r;
  const x = v => m.l + ((v - min) / (max - min)) * iw;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagramas de caja">`;
  for (let v = min; v <= max + 1e-9; v += paso) s += `<line class="grilla" x1="${x(v)}" x2="${x(v)}" y1="${m.t}" y2="${H - m.b}"/><text x="${x(v)}" y="${H - 8}" text-anchor="middle">${fmt(v, 0)}</text>`;
  filas.forEach((f, i) => {
    const cy = m.t + i * alto + alto / 2;
    s += `<text x="${m.l - 10}" y="${cy + 4}" text-anchor="end" style="fill:#0F1D2B;font-family:var(--texto);font-size:12px">${esc(f.nombre)}</text>`;
    const r = f.r;
    if (!r || !r.n) return;
    const lo = Math.max(r.min, r.q1 - 1.5 * r.ric), hi = Math.min(r.max, r.q3 + 1.5 * r.ric);
    const bigoteLo = Math.min(...f.valores.filter(v => v >= lo)), bigoteHi = Math.max(...f.valores.filter(v => v <= hi));
    const tip = `<b>${esc(f.nombre)}</b><br>n = ${r.n} · M = ${fmt(r.media)} · DE = ${fmt(r.de)}<br>Mediana ${fmt(r.mediana)} · RIC ${fmt(r.q1)}–${fmt(r.q3)}<br>Rango ${fmt(r.min)}–${fmt(r.max)}`;
    s += `<line x1="${x(bigoteLo)}" x2="${x(r.q1)}" y1="${cy}" y2="${cy}" stroke="#34465A" stroke-width="1.5"/>`;
    s += `<line x1="${x(r.q3)}" x2="${x(bigoteHi)}" y1="${cy}" y2="${cy}" stroke="#34465A" stroke-width="1.5"/>`;
    s += `<line x1="${x(bigoteLo)}" x2="${x(bigoteLo)}" y1="${cy - 6}" y2="${cy + 6}" stroke="#34465A" stroke-width="1.5"/><line x1="${x(bigoteHi)}" x2="${x(bigoteHi)}" y1="${cy - 6}" y2="${cy + 6}" stroke="#34465A" stroke-width="1.5"/>`;
    s += `<rect x="${x(r.q1)}" y="${cy - alto * 0.3}" width="${Math.max(2, x(r.q3) - x(r.q1))}" height="${alto * 0.6}" rx="4" fill="${f.color}" fill-opacity=".22" stroke="${f.color}" stroke-width="1.5" data-tip="${tip}"/>`;
    s += `<line x1="${x(r.mediana)}" x2="${x(r.mediana)}" y1="${cy - alto * 0.3}" y2="${cy + alto * 0.3}" stroke="${f.color}" stroke-width="3"/>`;
    s += `<circle cx="${x(r.media)}" cy="${cy}" r="3.5" fill="#FBFBF8" stroke="#0F1D2B" stroke-width="1.5" data-tip="${tip}"/>`;
    f.valores.filter(v => v < lo || v > hi).forEach(v => { s += `<circle cx="${x(v)}" cy="${cy}" r="3" fill="none" stroke="#6A7888" stroke-width="1.2" data-tip="<b>${esc(f.nombre)}</b><br>Atípico: ${fmt(v)}"/>`; });
  });
  return s + '</svg>';
}

// ---------- Tela de araña ----------
// ejes: [{ nombre }]; series: [{ nombre, color, valores (0–100), punteada? }]; banda: { lo:[], hi:[] }
export function arana(ejes, series, { banda = null, tam = 360, anillo = v => `${v} %` } = {}) {
  const W = tam + 260, H = tam + 60, cx = W / 2, cy = H / 2 + 4, R = tam / 2 - 10;
  const k = ejes.length;
  const ang = i => -Math.PI / 2 + (2 * Math.PI * i) / k;
  const pt = (i, v) => [cx + Math.cos(ang(i)) * R * (v / 100), cy + Math.sin(ang(i)) * R * (v / 100)];
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Perfil en tela de araña">`;
  [25, 50, 75, 100].forEach(v => {
    s += `<polygon points="${ejes.map((_, i) => pt(i, v).join(',')).join(' ')}" fill="none" stroke="${v === 50 ? 'rgba(15,29,43,.28)' : 'rgba(15,29,43,.12)'}" stroke-dasharray="${v === 50 ? '4 3' : ''}"/>`;
    s += `<text x="${cx + 4}" y="${cy - R * v / 100 + 12}" style="font-size:9px">${anillo(v)}</text>`;
  });
  ejes.forEach((e, i) => {
    const [x, y] = pt(i, 100);
    const [lx, ly] = pt(i, 118);
    s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(15,29,43,.14)"/>`;
    s += `<text x="${lx}" y="${ly + 4}" text-anchor="${Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end'}" style="fill:#0F1D2B;font-family:var(--texto);font-size:12.5px;font-weight:600">${esc(e.nombre)}</text>`;
  });
  if (banda) {
    const ext = banda.hi.map((v, i) => pt(i, v).join(',')).join(' ');
    const int = banda.lo.map((v, i) => pt(i, v).join(',')).join(' ');
    s += `<polygon points="${ext}" fill="rgba(15,29,43,.08)" stroke="none"/><polygon points="${int}" fill="#FBFBF8" stroke="none"/>`;
  }
  series.forEach(se => {
    const pts = se.valores.map((v, i) => (v == null ? null : pt(i, v)));
    const hay = pts.filter(Boolean);
    s += `<polygon points="${hay.map(p => p.join(',')).join(' ')}" fill="${se.color}" fill-opacity="${se.punteada ? 0 : 0.14}" stroke="${se.color}" stroke-width="${se.punteada ? 1.5 : 2.5}" ${se.punteada ? 'stroke-dasharray="5 4"' : ''}/>`;
    pts.forEach((p, i) => { if (!p) return; s += `<circle cx="${p[0]}" cy="${p[1]}" r="${se.punteada ? 3 : 5}" fill="${se.color}" stroke="#FBFBF8" stroke-width="2" data-tip="<b>${esc(se.nombre)}</b><br>${esc(ejes[i].nombre)}: ${se.brutos ? fmt(se.brutos[i]) + ' · ' : ''}${fmt(se.valores[i], 0)} % de la escala"/>`; });
  });
  return s + '</svg>';
}

// ---------- Red de correlaciones parciales ----------
// nodos: [{ corto, color, grupo }]; P: matriz parcial; sig: matriz booleana
export function redParcial(nodos, P, sig, { umbral = 0.1 } = {}) {
  const W = 640, H = 560, cx = W / 2, cy = H / 2, R = 215;
  const k = nodos.length;
  const pos = nodos.map((_, i) => [cx + R * Math.cos(-Math.PI / 2 + 2 * Math.PI * i / k), cy + R * Math.sin(-Math.PI / 2 + 2 * Math.PI * i / k)]);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Red de correlaciones parciales">`;
  const aristas = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) if (P[i][j] != null && sig[i][j] && Math.abs(P[i][j]) >= umbral) aristas.push([i, j, P[i][j]]);
  aristas.sort((a, b) => Math.abs(a[2]) - Math.abs(b[2]));
  for (const [i, j, r] of aristas) {
    const w = 1 + Math.abs(r) * 10;
    s += `<line x1="${pos[i][0]}" y1="${pos[i][1]}" x2="${pos[j][0]}" y2="${pos[j][1]}" stroke="${r > 0 ? '#2B4A9E' : '#A65C08'}" stroke-opacity="${0.25 + Math.min(0.7, Math.abs(r))}" stroke-width="${w}" stroke-linecap="round" ${r < 0 ? 'stroke-dasharray="6 4"' : ''} data-tip="<b>${esc(nodos[i].corto)} — ${esc(nodos[j].corto)}</b><br>r parcial = ${fmt(r)}"/>`;
  }
  nodos.forEach((n, i) => {
    const [x, y] = pos[i];
    const grado = aristas.filter(a => a[0] === i || a[1] === i).length;
    s += `<circle cx="${x}" cy="${y}" r="21" fill="#FBFBF8" stroke="${n.color}" stroke-width="3" data-tip="<b>${esc(n.nombre || n.corto)}</b><br>${grado} conexiones"/>`;
    s += `<text x="${x}" y="${y + 4}" text-anchor="middle" style="fill:#0F1D2B;font-size:9.5px;font-weight:700;pointer-events:none">${esc(n.etiqueta || n.corto)}</text>`;
  });
  return s + '</svg>';
}

// ---------- Sedimentación con análisis paralelo ----------
export function sedimentacion(obs, ale) {
  const W = 560, H = 240, m = { t: 12, r: 12, b: 30, l: 36 };
  const k = obs.length;
  const max = Math.ceil(Math.max(...obs, ...ale, 1));
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const x = i => m.l + (k === 1 ? iw / 2 : (i / (k - 1)) * iw);
  const y = v => m.t + ih - (Math.max(v, 0) / max) * ih;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de sedimentación">`;
  for (let v = 0; v <= max; v += Math.max(1, Math.round(max / 5))) s += `<line class="grilla" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  const linea = (vals, color, dash) => `<polyline points="${vals.map((v, i) => `${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2" ${dash ? 'stroke-dasharray="5 4"' : ''}/>`;
  s += linea(ale, '#6A7888', true) + linea(obs, '#0F1D2B', false);
  obs.forEach((v, i) => { s += `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${v > ale[i] ? '#0F1D2B' : '#FBFBF8'}" stroke="#0F1D2B" stroke-width="1.5" data-tip="<b>Factor ${i + 1}</b><br>Observado ${fmt(v)} · aleatorio P95 ${fmt(ale[i])}"/>`; if (k <= 30) s += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${i + 1}</text>`; });
  return s + '</svg>';
}

// ---------- Barras simples (silueta por k) ----------
export function barrasSimples(datos, { max = 1, color = '#0F1D2B', destacar = null, decimales = 2 } = {}) {
  const W = 360, H = 170, m = { t: 18, r: 8, b: 28, l: 8 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b, bw = iw / datos.length;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Barras">`;
  datos.forEach((d, i) => {
    const h = Math.max(0, (d.y / max) * ih), xx = m.l + i * bw + 8;
    s += `<path d="${barra(xx, m.t + ih - h, bw - 16, h, 4)}" fill="${d.x === destacar ? color : '#C9D0CC'}" data-tip="<b>${esc(d.label)}</b><br>${fmt(d.y, decimales)}"/>`;
    s += `<text x="${xx + (bw - 16) / 2}" y="${m.t + ih - h - 5}" text-anchor="middle" style="fill:#0F1D2B;font-weight:600">${fmt(d.y, decimales)}</text>`;
    s += `<text x="${xx + (bw - 16) / 2}" y="${H - 9}" text-anchor="middle">${esc(d.label)}</text>`;
  });
  return s + `<line class="eje" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}"/></svg>`;
}

// ---------- Tendencia por cohorte (media ± IC 95 %) ----------
export function tendenciaCohortes(puntos, { min, max, color, nombre }) {
  const W = 440, H = 190, m = { t: 14, r: 14, b: 28, l: 30 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const k = puntos.length;
  const x = i => m.l + (k === 1 ? iw / 2 : (i / (k - 1)) * iw);
  const y = v => m.t + ih - ((v - min) / (max - min)) * ih;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tendencia ${esc(nombre)}">`;
  [min, (min + max) / 2, max].forEach(v => { s += `<line class="grilla" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 5}" y="${y(v) + 4}" text-anchor="end">${fmt(v, 0)}</text>`; });
  if (k > 1) s += `<polyline points="${puntos.map((p, i) => `${x(i)},${y(p.media)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`;
  puntos.forEach((p, i) => {
    if (p.lo != null) s += `<line x1="${x(i)}" x2="${x(i)}" y1="${y(p.lo)}" y2="${y(p.hi)}" stroke="${color}" stroke-width="1.5"/>`;
    s += `<circle cx="${x(i)}" cy="${y(p.media)}" r="5" fill="${color}" stroke="#FBFBF8" stroke-width="2" data-tip="<b>Cohorte ${esc(p.cohorte)}</b><br>M = ${fmt(p.media)} · n = ${p.n}${p.lo != null ? `<br>IC 95 % ${fmt(p.lo)}–${fmt(p.hi)}` : ''}"/>`;
    s += `<text x="${x(i)}" y="${H - 9}" text-anchor="middle">${esc(p.cohorte)}</text>`;
  });
  return s + '</svg>';
}
