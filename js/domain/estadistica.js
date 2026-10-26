// Nonio · estadística sin dependencias (funciones puras).
// Cada función está validada contra R (psych, polycor, GPArotation) o scipy
// en tests/estadistica.test.mjs. Convención: valores faltantes = null.

// ---------------------------------------------------------------- básicos
export const esNum = v => typeof v === 'number' && Number.isFinite(v);
export const suma = xs => xs.reduce((a, b) => a + b, 0);
export const mediaSimple = xs => (xs.length ? suma(xs) / xs.length : null);

export function varianza(xs) {
  const n = xs.length;
  if (n < 2) return null;
  const m = mediaSimple(xs);
  return suma(xs.map(x => (x - m) ** 2)) / (n - 1);
}

// Cuantil tipo 7 (el de R por defecto).
export function cuantil(ordenados, p) {
  const n = ordenados.length;
  if (!n) return null;
  const h = (n - 1) * p;
  const lo = Math.floor(h), hi = Math.ceil(h);
  return ordenados[lo] + (h - lo) * (ordenados[hi] - ordenados[lo]);
}

// Asimetría y curtosis (exceso) muestrales ajustadas: tipo 2 de e1071 / SPSS.
export function asimetria(xs) {
  const n = xs.length;
  if (n < 3) return null;
  const m = mediaSimple(xs);
  const m2 = suma(xs.map(x => (x - m) ** 2)) / n;
  const m3 = suma(xs.map(x => (x - m) ** 3)) / n;
  if (!m2) return null;
  const g1 = m3 / m2 ** 1.5;
  return g1 * Math.sqrt(n * (n - 1)) / (n - 2);
}
export function curtosis(xs) {
  const n = xs.length;
  if (n < 4) return null;
  const m = mediaSimple(xs);
  const m2 = suma(xs.map(x => (x - m) ** 2)) / n;
  const m4 = suma(xs.map(x => (x - m) ** 4)) / n;
  if (!m2) return null;
  const g2 = m4 / m2 ** 2 - 3;
  return ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * g2 + 6);
}

export function resumen(valores) {
  const v = valores.filter(esNum).sort((a, b) => a - b);
  const n = v.length;
  if (!n) return { n: 0 };
  const q1 = cuantil(v, 0.25), q3 = cuantil(v, 0.75);
  const va = varianza(v);
  return {
    n, media: mediaSimple(v), de: va == null ? null : Math.sqrt(va),
    min: v[0], q1, mediana: cuantil(v, 0.5), q3, max: v[n - 1], ric: q3 - q1,
    asimetria: asimetria(v), curtosis: curtosis(v)
  };
}

// Rangos con empates promediados (1..n).
export function rangos(xs) {
  const idx = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(xs.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const prom = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = prom;
    i = j + 1;
  }
  return r;
}

function pares(xs, ys) {
  const a = [], b = [];
  for (let i = 0; i < xs.length; i++) if (esNum(xs[i]) && esNum(ys[i])) { a.push(xs[i]); b.push(ys[i]); }
  return [a, b];
}

export function pearsonPar(xs, ys) {
  const [a, b] = pares(xs, ys);
  const n = a.length;
  if (n < 3) return { r: null, n };
  const ma = mediaSimple(a), mb = mediaSimple(b);
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  if (!saa || !sbb) return { r: null, n };
  return { r: sab / Math.sqrt(saa * sbb), n };
}

export function spearmanPar(xs, ys) {
  const [a, b] = pares(xs, ys);
  if (a.length < 3) return { r: null, n: a.length };
  return pearsonPar(rangos(a), rangos(b));
}

// p bilateral de una correlación (t con n-2-k gl; k = variables controladas).
export function pCorrelacion(r, n, controladas = 0) {
  const gl = n - 2 - controladas;
  if (r == null || gl < 1) return null;
  if (Math.abs(r) >= 1) return 0;
  const t = r * Math.sqrt(gl / (1 - r * r));
  return 2 * (1 - tCDF(Math.abs(t), gl));
}

// ---------------------------------------------------------------- distribuciones
// Φ(x) con precisión doble (Hart 5666 / West 2005).
export function normalCDF(x) {
  const ax = Math.abs(x);
  let c;
  if (ax > 37) c = 0;
  else {
    const e = Math.exp(-ax * ax / 2);
    if (ax < 7.07106781186547) {
      let b = 3.52624965998911e-2 * ax + 0.700383064443688;
      b = b * ax + 6.37396220353165; b = b * ax + 33.912866078383; b = b * ax + 112.079291497871;
      b = b * ax + 221.213596169931; b = b * ax + 220.206867912376;
      c = e * b;
      b = 8.83883476483184e-2 * ax + 1.75566716318264;
      b = b * ax + 16.064177579207; b = b * ax + 86.7807322029461; b = b * ax + 296.564248779674;
      b = b * ax + 637.333633378831; b = b * ax + 793.826512519948; b = b * ax + 440.413735824752;
      c /= b;
    } else {
      let b = ax + 0.65;
      b = ax + 4 / b; b = ax + 3 / b; b = ax + 2 / b; b = ax + 1 / b;
      c = e / b / 2.506628274631;
    }
  }
  return x > 0 ? 1 - c : c;
}

// Φ⁻¹(p): Acklam + un paso de Halley.
export function normalInv(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let x;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - pl) {
    const q = p - 0.5, r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const e = normalCDF(x) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
  return x - u / (1 + x * u / 2);
}

export function lgamma(x) {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// Beta incompleta regularizada I_x(a,b) (fracción continua de Lentz).
export function betaInc(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  const cf = (x, a, b) => {
    const tiny = 1e-300;
    let c = 1, d = 1 - (a + b) * x / (a + 1);
    if (Math.abs(d) < tiny) d = tiny;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
      c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
      d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny;
      c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
  };
  return x < (a + 1) / (a + b + 2) ? bt * cf(x, a, b) / a : 1 - bt * cf(1 - x, b, a) / b;
}

// Gamma incompleta regularizada inferior P(a,x).
export function gammaInc(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a, del = sum, ap = a;
    for (let n = 0; n < 500; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  const tiny = 1e-300;
  let b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}

export function tCDF(t, gl) {
  const x = gl / (gl + t * t);
  const p = 0.5 * betaInc(x, gl / 2, 0.5);
  return t >= 0 ? 1 - p : p;
}
export const fCDF = (f, d1, d2) => (f <= 0 ? 0 : betaInc(d1 * f / (d1 * f + d2), d1 / 2, d2 / 2));
export const chi2CDF = (x, gl) => gammaInc(gl / 2, x / 2);

// ---------------------------------------------------------------- Shapiro-Wilk (Royston 1995, AS R94)
function poly(cc, x) {
  let r = cc[0];
  if (cc.length > 1) {
    let p = x * cc[cc.length - 1];
    for (let j = cc.length - 2; j > 0; j--) p = (p + cc[j]) * x;
    r += p;
  }
  return r;
}

export function shapiroWilk(valores) {
  const x = valores.filter(esNum).sort((a, b) => a - b);
  const n = x.length;
  if (n < 3 || n > 5000) return { W: null, p: null, n };
  if (x[n - 1] - x[0] < 1e-19) return { W: null, p: null, n };
  const n2 = Math.floor(n / 2);
  const a = new Array(n2);
  if (n === 3) a[0] = Math.SQRT1_2;
  else {
    const c1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056];
    const c2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
    const m = [];
    const an25 = n + 0.25;
    let summ2 = 0;
    for (let i = 1; i <= n2; i++) { m[i - 1] = normalInv((i - 0.375) / an25); summ2 += m[i - 1] ** 2; }
    summ2 *= 2;
    const ssumm2 = Math.sqrt(summ2), rsn = 1 / Math.sqrt(n);
    const a1 = poly(c1, rsn) - m[0] / ssumm2;
    let i1, fac;
    if (n > 5) {
      i1 = 3;
      const a2 = -m[1] / ssumm2 + poly(c2, rsn);
      fac = Math.sqrt((summ2 - 2 * m[0] ** 2 - 2 * m[1] ** 2) / (1 - 2 * a1 ** 2 - 2 * a2 ** 2));
      a[1] = a2;
    } else {
      i1 = 2;
      fac = Math.sqrt((summ2 - 2 * m[0] ** 2) / (1 - 2 * a1 ** 2));
    }
    a[0] = a1;
    for (let i = i1; i <= n2; i++) a[i - 1] = -m[i - 1] / fac;
  }
  const media = mediaSimple(x);
  const ssq = suma(x.map(v => (v - media) ** 2));
  let num = 0;
  for (let i = 0; i < n2; i++) num += a[i] * (x[n - 1 - i] - x[i]);
  let W = Math.min(1, (num * num) / ssq);
  let p;
  if (n === 3) {
    p = Math.max(0, (6 / Math.PI) * (Math.asin(Math.sqrt(W)) - Math.PI / 3));
  } else {
    let w1 = Math.log(1 - W);
    const xx = Math.log(n);
    let mu, s;
    if (n <= 11) {
      const gamma = poly([-2.273, 0.459], n);
      if (w1 >= gamma) return { W, p: 1e-99, n };
      w1 = -Math.log(gamma - w1);
      mu = poly([0.544, -0.39978, 0.025054, -6.714e-4], n);
      s = Math.exp(poly([1.3822, -0.77857, 0.062767, -0.0020322], n));
    } else {
      mu = poly([-1.5861, -0.31082, -0.083751, 0.0038915], xx);
      s = Math.exp(poly([-0.4803, -0.082676, 0.0030302], xx));
    }
    p = 1 - normalCDF((w1 - mu) / s);
  }
  return { W, p, n };
}

// ---------------------------------------------------------------- álgebra lineal
export const identidad = k => Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? 1 : 0)));
export const transpuesta = A => A[0].map((_, j) => A.map(f => f[j]));
export function mult(A, B) {
  const n = A.length, m = B[0].length, k = B.length;
  const C = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++) for (let l = 0; l < k; l++) { const a = A[i][l]; if (a) for (let j = 0; j < m; j++) C[i][j] += a * B[l][j]; }
  return C;
}

// Inversa y determinante (Gauss-Jordan con pivoteo parcial). null si es singular.
export function inversa(M) {
  const n = M.length;
  const A = M.map((f, i) => [...f, ...identidad(n)[i]]);
  let det = 1;
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (Math.abs(A[piv][c]) < 1e-12) return null;
    if (piv !== c) { [A[piv], A[c]] = [A[c], A[piv]]; det = -det; }
    const v = A[c][c];
    det *= v;
    for (let j = 0; j < 2 * n; j++) A[c][j] /= v;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; if (f) for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
  }
  return { inv: A.map(f => f.slice(n)), det };
}

// Autovalores/autovectores de una matriz simétrica (Jacobi cíclico), orden descendente.
export function eigenSim(S) {
  const n = S.length;
  const A = S.map(f => [...f]);
  const V = identidad(n);
  for (let barrido = 0; barrido < 100; barrido++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2;
    if (off < 1e-22) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) {
        const akp = A[k][p], akq = A[k][q];
        A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = A[p][k], aqk = A[q][k];
        A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < n; k++) {
        const vkp = V[k][p], vkq = V[k][q];
        V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq;
      }
    }
  }
  const orden = A.map((f, i) => [f[i], i]).sort((a, b) => b[0] - a[0]);
  return { valores: orden.map(o => o[0]), vectores: orden.map(o => V.map(f => f[o[1]])) };
}

// Aproxima una matriz de correlación definida positiva (si hace falta).
export function suavizarCorrelacion(R) {
  const { valores, vectores } = eigenSim(R);
  if (valores[valores.length - 1] > 1e-8) return { R, suavizada: false };
  const k = R.length;
  const vals = valores.map(v => Math.max(v, 1e-6));
  const escala = k / suma(vals);
  const S = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) =>
    suma(vectores.map((vec, l) => vec[i] * vec[j] * vals[l] * escala))));
  const d = S.map((f, i) => Math.sqrt(f[i]));
  return { R: S.map((f, i) => f.map((v, j) => (i === j ? 1 : v / (d[i] * d[j])))), suavizada: true };
}

// ---------------------------------------------------------------- correlaciones policóricas
// Normal bivariada: P(X > dh, Y > dk) con correlación r (Genz, bvnu).
const GL = {
  6: { w: [0.1713244923791705, 0.3607615730481384, 0.4679139345726904], x: [0.9324695142031522, 0.6612093864662647, 0.238619186083197] },
  12: { w: [0.04717533638651177, 0.1069393259953183, 0.1600783285433464, 0.2031674267230659, 0.2334925365383547, 0.2491470458134029],
    x: [0.9815606342467191, 0.904117256370475, 0.769902674194305, 0.5873179542866171, 0.3678314989981802, 0.1252334085114692] },
  20: { w: [0.01761400713915212, 0.04060142980038694, 0.06267204833410906, 0.08327674157670475, 0.1019301198172404, 0.1181945319615184, 0.1316886384491766, 0.1420961093183821, 0.1491729864726037, 0.1527533871307259],
    x: [0.9931285991850949, 0.9639719272779138, 0.9122344282513259, 0.8391169718222188, 0.7463319064601508, 0.636053680726515, 0.5108670019508271, 0.3737060887154196, 0.2277858511416451, 0.07652652113349733] }
};
export function bvnu(dh, dk, r) {
  if (dh === Infinity || dk === Infinity) return 0;
  if (dh === -Infinity) return dk === -Infinity ? 1 : normalCDF(-dk);
  if (dk === -Infinity) return normalCDF(-dh);
  if (r === 0) return normalCDF(-dh) * normalCDF(-dk);
  const tp = 2 * Math.PI;
  let h = dh, k = dk, hk = h * k, bvn = 0;
  const g = Math.abs(r) < 0.3 ? GL[6] : Math.abs(r) < 0.75 ? GL[12] : GL[20];
  const w = [...g.w, ...g.w];
  const x = [...g.x.map(v => 1 - v), ...g.x.map(v => 1 + v)];
  if (Math.abs(r) < 0.925) {
    const hs = (h * h + k * k) / 2, asr = Math.asin(r) / 2;
    for (let i = 0; i < x.length; i++) {
      const sn = Math.sin(asr * x[i]);
      bvn += w[i] * Math.exp((sn * hk - hs) / (1 - sn * sn));
    }
    bvn = bvn * asr / tp + normalCDF(-h) * normalCDF(-k);
  } else {
    if (r < 0) { k = -k; hk = -hk; }
    if (Math.abs(r) < 1) {
      const as = 1 - r * r;
      let a = Math.sqrt(as);
      const bs = (h - k) ** 2;
      let asr = -(bs / as + hk) / 2;
      const c = (4 - hk) / 8, d = (12 - hk) / 80;
      if (asr > -100) bvn = a * Math.exp(asr) * (1 - c * (bs - as) * (1 - d * bs) / 3 + c * d * as * as);
      if (hk > -100) {
        const b = Math.sqrt(bs);
        const sp = Math.sqrt(tp) * normalCDF(-b / a);
        bvn -= Math.exp(-hk / 2) * sp * b * (1 - c * bs * (1 - d * bs) / 3);
      }
      a /= 2;
      let acc = 0;
      for (let i = 0; i < x.length; i++) {
        const xs = (a * x[i]) ** 2;
        const asr2 = -(bs / xs + hk) / 2;
        if (asr2 <= -100) continue;
        const sp = 1 + c * xs * (1 + 5 * d * xs);
        const rs = Math.sqrt(1 - xs);
        const ep = Math.exp(-(hk / 2) * xs / (1 + rs) ** 2) / rs;
        acc += w[i] * Math.exp(asr2) * (sp - ep);
      }
      bvn = (a * acc - bvn) / tp;
    }
    if (r > 0) bvn += normalCDF(-Math.max(h, k));
    else if (h >= k) bvn = -bvn;
    else {
      const L = h < 0 ? normalCDF(k) - normalCDF(h) : normalCDF(-h) - normalCDF(-k);
      bvn = L - bvn;
    }
  }
  return Math.max(0, Math.min(1, bvn));
}
// P(X ≤ h, Y ≤ k)
export const bvnCDF = (h, k, r) => bvnu(-h, -k, r);

function umbrales(conteos, n) {
  const t = [];
  let acc = 0;
  for (let i = 0; i < conteos.length - 1; i++) { acc += conteos[i]; t.push(normalInv(acc / n)); }
  return [-Infinity, ...t, Infinity];
}

// Policórica de dos pasos por máxima verosimilitud (igual que polycor::polychor por defecto).
export function policorica(xs, ys) {
  const [a, b] = pares(xs, ys);
  const n = a.length;
  if (n < 5) return { r: null, n };
  const ca = [...new Set(a)].sort((p, q) => p - q), cb = [...new Set(b)].sort((p, q) => p - q);
  if (ca.length < 2 || cb.length < 2) return { r: null, n };
  const ia = new Map(ca.map((v, i) => [v, i])), ib = new Map(cb.map((v, i) => [v, i]));
  const tabla = ca.map(() => cb.map(() => 0));
  for (let i = 0; i < n; i++) tabla[ia.get(a[i])][ib.get(b[i])]++;
  const ta = umbrales(tabla.map(f => suma(f)), n);
  const tb = umbrales(cb.map((_, j) => suma(tabla.map(f => f[j]))), n);
  const logL = rho => {
    let L = 0;
    for (let i = 0; i < ca.length; i++) for (let j = 0; j < cb.length; j++) {
      const nij = tabla[i][j];
      if (!nij) continue;
      const P = bvnCDF(ta[i + 1], tb[j + 1], rho) - bvnCDF(ta[i], tb[j + 1], rho) - bvnCDF(ta[i + 1], tb[j], rho) + bvnCDF(ta[i], tb[j], rho);
      L += nij * Math.log(Math.max(P, 1e-300));
    }
    return L;
  };
  // Búsqueda por sección áurea en (-0.9999, 0.9999), refinada.
  let lo = -0.9999, hi = 0.9999;
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = hi - gr * (hi - lo), d = lo + gr * (hi - lo), fc = logL(c), fd = logL(d);
  for (let it = 0; it < 80 && hi - lo > 1e-7; it++) {
    if (fc > fd) { hi = d; d = c; fd = fc; c = hi - gr * (hi - lo); fc = logL(c); }
    else { lo = c; c = d; fc = fd; d = lo + gr * (hi - lo); fd = logL(d); }
  }
  return { r: (lo + hi) / 2, n };
}

// Matriz de correlaciones entre columnas. metodo: 'pearson' | 'spearman' | 'policorica'
export function matrizCorrelaciones(columnas, metodo = 'pearson') {
  const f = metodo === 'spearman' ? spearmanPar : metodo === 'policorica' ? policorica : pearsonPar;
  const k = columnas.length;
  const R = identidad(k), N = identidad(k).map(f => f.map(() => 0));
  for (let i = 0; i < k; i++) {
    N[i][i] = columnas[i].filter(esNum).length;
    for (let j = i + 1; j < k; j++) {
      const { r, n } = f(columnas[i], columnas[j]);
      R[i][j] = R[j][i] = r;
      N[i][j] = N[j][i] = n;
    }
  }
  return { R, N };
}

// ---------------------------------------------------------------- confiabilidad
// Casos completos de una matriz filas × ítems.
export const completos = filas => filas.filter(f => f.every(esNum));

export function alfaCronbach(filas) {
  const F = completos(filas);
  const k = F[0]?.length || 0;
  if (F.length < 3 || k < 2) return null;
  const vi = suma(Array.from({ length: k }, (_, j) => varianza(F.map(f => f[j]))));
  const vt = varianza(F.map(f => suma(f)));
  return vt ? (k / (k - 1)) * (1 - vi / vt) : null;
}

// α a partir de una matriz de correlaciones (α estandarizado; con policóricas = α ordinal).
export function alfaDeR(R) {
  const k = R.length;
  if (k < 2) return null;
  const s = suma(R.map(f => suma(f)));
  return (k / (k - 1)) * (1 - k / s);
}

// Factorización de ejes principales iterada (≈ minres/ULS). Devuelve cargas k × nf.
export function ejesPrincipales(R, nf = 1, iter = 500) {
  const k = R.length;
  const inv = inversa(R);
  let h2 = inv ? inv.inv.map((f, i) => Math.min(0.995, Math.max(0.005, 1 - 1 / f[i]))) : R.map(() => 0.5);
  let cargas = null;
  for (let it = 0; it < iter; it++) {
    const Rr = R.map((f, i) => f.map((v, j) => (i === j ? h2[i] : v)));
    const { valores, vectores } = eigenSim(Rr);
    cargas = Array.from({ length: k }, (_, i) => Array.from({ length: nf }, (_, f) => vectores[f][i] * Math.sqrt(Math.max(valores[f], 0))));
    const nuevo = cargas.map(f => Math.min(0.999, suma(f.map(v => v * v))));
    const cambio = Math.max(...nuevo.map((v, i) => Math.abs(v - h2[i])));
    h2 = nuevo;
    if (cambio < 1e-7) break;
  }
  // Signo: mayoría de cargas positivas en cada factor.
  for (let f = 0; f < nf; f++) if (suma(cargas.map(c => c[f])) < 0) cargas.forEach(c => { c[f] = -c[f]; });
  return { cargas, comunalidades: h2 };
}

// ω total de McDonald con un factor: (Σλ)² / ((Σλ)² + Σ(1-λ²)).
export function omegaDeR(R) {
  if (R.length < 3) return null;
  const { cargas } = ejesPrincipales(R, 1);
  const l = cargas.map(c => c[0]);
  const s = suma(l) ** 2;
  return s / (s + suma(l.map(v => 1 - v * v)));
}

// Correlación ítem-total corregida y α si se elimina el ítem.
export function analisisItems(filas) {
  const F = completos(filas);
  const k = F[0]?.length || 0;
  return Array.from({ length: k }, (_, j) => {
    const resto = F.map(f => suma(f) - f[j]);
    return {
      itemTotal: pearsonPar(F.map(f => f[j]), resto).r,
      alfaSinItem: k > 2 ? alfaCronbach(F.map(f => f.filter((_, i) => i !== j))) : null
    };
  });
}

// ---------------------------------------------------------------- adecuación y AFE
export function kmoBartlett(R, n) {
  const k = R.length;
  const inv = inversa(R);
  if (!inv) return null;
  const P = inv.inv.map((f, i) => f.map((v, j) => -v / Math.sqrt(inv.inv[i][i] * inv.inv[j][j])));
  let r2 = 0, p2 = 0;
  const msa = [];
  for (let i = 0; i < k; i++) {
    let ri = 0, pi = 0;
    for (let j = 0; j < k; j++) if (i !== j) { ri += R[i][j] ** 2; pi += P[i][j] ** 2; }
    msa.push(ri / (ri + pi));
    r2 += ri; p2 += pi;
  }
  const chi2 = -(n - 1 - (2 * k + 5) / 6) * Math.log(inv.det);
  const gl = k * (k - 1) / 2;
  return { kmo: r2 / (r2 + p2), msa, chi2, gl, p: 1 - chi2CDF(chi2, gl) };
}

// Generador pseudoaleatorio reproducible.
export function rngSemilla(semilla = 12345) {
  let s = semilla >>> 0;
  const u = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const normal = () => { let a = 0; while (a === 0) a = u(); return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * u()); };
  return { u, normal };
}

// Análisis paralelo (Horn). Compara autovalores observados con el percentil 95
// de datos normales simulados, en dos versiones:
//  - componentes: autovalores de R;
//  - factores: autovalores de R reducida (diagonal = CMC, correlación múltiple al cuadrado).
// Sugiere el número de factores con la versión de factores (como psych::fa.parallel).
const reducida = R => { const inv = inversa(R); return inv ? R.map((f, i) => f.map((v, j) => (i === j ? 1 - 1 / inv.inv[i][i] : v))) : R; };
export function analisisParalelo(R, n, reps = 100, semilla = 7) {
  const k = R.length;
  const obsC = eigenSim(R).valores, obsF = eigenSim(reducida(R)).valores;
  const rng = rngSemilla(semilla);
  const simC = Array.from({ length: k }, () => []), simF = Array.from({ length: k }, () => []);
  for (let r = 0; r < reps; r++) {
    const cols = Array.from({ length: k }, () => Array.from({ length: n }, rng.normal));
    const { R: Rs } = matrizCorrelaciones(cols, 'pearson');
    eigenSim(Rs).valores.forEach((v, i) => simC[i].push(v));
    eigenSim(reducida(Rs)).valores.forEach((v, i) => simF[i].push(v));
  }
  const p95 = sims => sims.map(v => cuantil(v.sort((a, b) => a - b), 0.95));
  const aleC = p95(simC), aleF = p95(simF);
  const cuenta = (o, a) => { let c = 0; while (c < k && o[c] > a[c]) c++; return c; };
  return {
    observados: obsC, aleatorios: aleC, componentes: Math.max(1, cuenta(obsC, aleC)),
    observadosF: obsF, aleatoriosF: aleF, factores: Math.max(1, cuenta(obsF, aleF))
  };
}

// Rotación oblimin (γ = 0, cuartimin directo) por gradiente proyectado (Jennrich 2002).
export function oblimin(A, eps = 1e-6, maxit = 1000) {
  const k = A[0].length;
  if (k < 2) return { cargas: A, Phi: [[1]] };
  const crit = L => {
    const L2 = L.map(f => f.map(v => v * v));
    const L2N = L2.map(f => f.map((_, j) => suma(f) - f[j]));
    return { f: suma(L2.map((f, i) => suma(f.map((v, j) => v * L2N[i][j])))) / 4, Gq: L.map((f, i) => f.map((v, j) => v * L2N[i][j])) };
  };
  let T = identidad(k);
  let L = mult(A, transpuesta(inversa(T).inv));
  let { f, Gq } = crit(L);
  let G = transpuesta(mult(mult(transpuesta(L), Gq), inversa(T).inv)).map(r => r.map(v => -v));
  let al = 1;
  for (let it = 0; it < maxit; it++) {
    const cs = Array.from({ length: k }, (_, j) => suma(T.map((f, i) => f[j] * G[i][j])));
    const Gp = G.map((f, i) => f.map((v, j) => v - T[i][j] * cs[j]));
    const s = Math.sqrt(suma(Gp.map(f => suma(f.map(v => v * v)))));
    if (s < eps) break;
    al *= 2;
    let Tt, Lt, ct;
    for (let i = 0; i <= 10; i++) {
      const X = T.map((f, r) => f.map((v, j) => v - al * Gp[r][j]));
      const nrm = Array.from({ length: k }, (_, j) => Math.sqrt(suma(X.map(f => f[j] ** 2))));
      Tt = X.map(f => f.map((v, j) => v / nrm[j]));
      Lt = mult(A, transpuesta(inversa(Tt).inv));
      ct = crit(Lt);
      if (ct.f < f - 0.5 * s * s * al) break;
      al /= 2;
    }
    T = Tt; L = Lt; f = ct.f; Gq = ct.Gq;
    G = transpuesta(mult(mult(transpuesta(L), Gq), inversa(T).inv)).map(r => r.map(v => -v));
  }
  const Phi = mult(transpuesta(T), T);
  // Signo positivo por factor.
  for (let j = 0; j < k; j++) if (suma(L.map(f => f[j])) < 0) { L.forEach(f => { f[j] = -f[j]; }); Phi.forEach((f, i) => { if (i !== j) { f[j] = -f[j]; Phi[j][i] = f[j]; } }); }
  return { cargas: L, Phi };
}

export function afe(R, nf) {
  const { cargas, comunalidades } = ejesPrincipales(R, nf);
  const rot = nf > 1 ? oblimin(cargas) : { cargas, Phi: [[1]] };
  return { cargas: rot.cargas, Phi: rot.Phi, comunalidades };
}

// ---------------------------------------------------------------- correlaciones parciales
export function correlacionesParciales(R) {
  const inv = inversa(R);
  if (!inv) return null;
  const P = inv.inv;
  return P.map((f, i) => f.map((v, j) => (i === j ? 1 : -v / Math.sqrt(P[i][i] * P[j][j]))));
}

// ---------------------------------------------------------------- regresión lineal (MCO)
export function regresion(y, X, nombres) {
  const filas = [];
  for (let i = 0; i < y.length; i++) if (esNum(y[i]) && X.every(c => esNum(c[i]))) filas.push(i);
  const n = filas.length, p = X.length;
  if (n < p + 3) return null;
  const Y = filas.map(i => y[i]);
  const D = filas.map(i => [1, ...X.map(c => c[i])]);
  const Dt = transpuesta(D);
  const XtXi = inversa(mult(Dt, D));
  if (!XtXi) return null;
  const B = mult(XtXi.inv, mult(Dt, Y.map(v => [v]))).map(f => f[0]);
  const yhat = D.map(f => suma(f.map((v, j) => v * B[j])));
  const res = Y.map((v, i) => v - yhat[i]);
  const my = mediaSimple(Y);
  const sst = suma(Y.map(v => (v - my) ** 2)), sse = suma(res.map(v => v * v));
  const gl = n - p - 1;
  const s2 = sse / gl;
  const R2 = 1 - sse / sst;
  const F = ((sst - sse) / p) / s2;
  const sy = Math.sqrt(varianza(Y));
  const coef = B.map((b, j) => {
    const se = Math.sqrt(s2 * XtXi.inv[j][j]);
    const t = b / se;
    const sx = j ? Math.sqrt(varianza(filas.map(i => X[j - 1][i]))) : null;
    return { nombre: j ? nombres[j - 1] : '(Intercepto)', b, se, t, p: 2 * (1 - tCDF(Math.abs(t), gl)), beta: j ? b * sx / sy : null };
  });
  // VIF de cada predictor
  const vif = X.map((_, j) => {
    if (p < 2) return 1;
    const otros = X.filter((__, l) => l !== j);
    const r = regresionR2(filas.map(i => X[j][i]), otros.map(c => filas.map(i => c[i])));
    return r == null ? null : 1 / (1 - r);
  });
  coef.slice(1).forEach((c, j) => { c.vif = vif[j]; });
  return { n, R2, R2aj: 1 - (1 - R2) * (n - 1) / gl, F, glF: [p, gl], pF: 1 - fCDF(F, p, gl), coef, residuos: res, normalidadResiduos: shapiroWilk(res) };
}
function regresionR2(y, X) {
  const n = y.length;
  const D = y.map((_, i) => [1, ...X.map(c => c[i])]);
  const inv = inversa(mult(transpuesta(D), D));
  if (!inv) return null;
  const B = mult(inv.inv, mult(transpuesta(D), y.map(v => [v]))).map(f => f[0]);
  const my = mediaSimple(y);
  const sse = suma(y.map((v, i) => (v - suma(D[i].map((d, j) => d * B[j]))) ** 2));
  const sst = suma(y.map(v => (v - my) ** 2));
  return 1 - sse / sst;
}

// ---------------------------------------------------------------- comparación de grupos
export function kruskalWallis(grupos) {
  const g = grupos.map(x => x.filter(esNum)).filter(x => x.length);
  const todos = g.flat();
  const N = todos.length;
  if (g.length < 2 || N < 3) return null;
  const r = rangos(todos);
  let pos = 0, H = 0;
  for (const x of g) { const ri = r.slice(pos, pos + x.length); pos += x.length; H += suma(ri) ** 2 / x.length; }
  H = (12 / (N * (N + 1))) * H - 3 * (N + 1);
  // corrección por empates
  const cuenta = new Map();
  todos.forEach(v => cuenta.set(v, (cuenta.get(v) || 0) + 1));
  const T = suma([...cuenta.values()].map(t => t ** 3 - t));
  const C = 1 - T / (N ** 3 - N);
  if (C > 0) H /= C;
  const gl = g.length - 1;
  return { H, gl, p: 1 - chi2CDF(H, gl), epsilon2: H / (N - 1) };
}

export function anova1(grupos) {
  const g = grupos.map(x => x.filter(esNum)).filter(x => x.length);
  const todos = g.flat();
  const N = todos.length, k = g.length;
  if (k < 2 || N <= k) return null;
  const m = mediaSimple(todos);
  const ssb = suma(g.map(x => x.length * (mediaSimple(x) - m) ** 2));
  const ssw = suma(g.map(x => { const mx = mediaSimple(x); return suma(x.map(v => (v - mx) ** 2)); }));
  const F = (ssb / (k - 1)) / (ssw / (N - k));
  return { F, gl: [k - 1, N - k], p: 1 - fCDF(F, k - 1, N - k), eta2: ssb / (ssb + ssw) };
}

// ---------------------------------------------------------------- k-medias
export function zscores(columnas) {
  return columnas.map(c => {
    const v = c.filter(esNum);
    const m = mediaSimple(v), s = Math.sqrt(varianza(v));
    return c.map(x => (esNum(x) && s ? (x - m) / s : null));
  });
}

const dist2 = (a, b) => suma(a.map((v, i) => (v - b[i]) ** 2));

export function kmedias(puntos, k, { reinicios = 30, semilla = 11, iter = 200 } = {}) {
  const n = puntos.length;
  if (n < k) return null;
  const rng = rngSemilla(semilla);
  let mejor = null;
  for (let r = 0; r < reinicios; r++) {
    // k-means++
    const cent = [puntos[Math.floor(rng.u() * n)]];
    while (cent.length < k) {
      const d = puntos.map(p => Math.min(...cent.map(c => dist2(p, c))));
      let u = rng.u() * suma(d), i = 0;
      while (i < n - 1 && (u -= d[i]) > 0) i++;
      cent.push(puntos[i]);
    }
    let asig = new Array(n).fill(-1);
    let C = cent.map(c => [...c]);
    for (let it = 0; it < iter; it++) {
      let cambio = false;
      const nueva = puntos.map(p => { let b = 0, bd = Infinity; C.forEach((c, j) => { const d = dist2(p, c); if (d < bd) { bd = d; b = j; } }); return b; });
      nueva.forEach((v, i) => { if (v !== asig[i]) cambio = true; });
      asig = nueva;
      C = C.map((c, j) => {
        const m = puntos.filter((_, i) => asig[i] === j);
        return m.length ? c.map((_, d) => mediaSimple(m.map(p => p[d]))) : c;
      });
      if (!cambio) break;
    }
    const inercia = suma(puntos.map((p, i) => dist2(p, C[asig[i]])));
    if (!mejor || inercia < mejor.inercia) mejor = { asignacion: asig, centroides: C, inercia };
  }
  // Etiquetas ordenadas por tamaño (grupo 1 = el más grande) para estabilidad visual.
  const tam = Array.from({ length: k }, (_, j) => mejor.asignacion.filter(a => a === j).length);
  const orden = tam.map((t, j) => [t, j]).sort((a, b) => b[0] - a[0]).map(o => o[1]);
  const mapa = new Map(orden.map((j, i) => [j, i]));
  return { asignacion: mejor.asignacion.map(a => mapa.get(a)), centroides: orden.map(j => mejor.centroides[j]), inercia: mejor.inercia };
}

export function silueta(puntos, asignacion) {
  const n = puntos.length;
  const k = Math.max(...asignacion) + 1;
  const s = puntos.map((p, i) => {
    const prom = Array.from({ length: k }, (_, j) => {
      const otros = puntos.filter((_, l) => asignacion[l] === j && l !== i);
      return otros.length ? mediaSimple(otros.map(q => Math.sqrt(dist2(p, q)))) : null;
    });
    const a = prom[asignacion[i]];
    if (a == null) return 0;
    const b = Math.min(...prom.filter((v, j) => j !== asignacion[i] && v != null));
    return (b - a) / Math.max(a, b);
  });
  return { media: mediaSimple(s), porPunto: s };
}

// Percentil (0–100) de un valor dentro de una distribución (rango medio).
export function percentilDe(valor, distribucion) {
  const v = distribucion.filter(esNum);
  if (!v.length || !esNum(valor)) return null;
  const menores = v.filter(x => x < valor).length, iguales = v.filter(x => x === valor).length;
  return 100 * (menores + iguales / 2) / v.length;
}
