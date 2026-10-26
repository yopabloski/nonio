// Validación de js/domain/estadistica.js contra R (psych 2.x, polycor, GPArotation).
// Datos sintéticos (150 casos, 8 ítems ordinales de 5 puntos). Referencias
// generadas con tests/fixtures/estadistica_ref.R.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../js/domain/estadistica.js';

const D = JSON.parse(fs.readFileSync(new URL('./fixtures/estadistica_datos.json', import.meta.url)));
const R = JSON.parse(fs.readFileSync(new URL('./fixtures/estadistica_ref_R.json', import.meta.url)));
const X = D.items;
const cerca = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${msg}: ${a} vs ${b}`);

test('Shapiro-Wilk = shapiro.test', () => {
  let s = E.shapiroWilk(D.cont); cerca(s.W, R.sw_cont[0], 1e-8, 'W'); cerca(s.p, R.sw_cont[1], 1e-6, 'p');
  s = E.shapiroWilk([2.1, 3.4, 1.9, 5.6, 4.4, 3.3, 2.8, 4.1, 3.9]); cerca(s.W, R.sw_small[0], 1e-8, 'W n=9'); cerca(s.p, R.sw_small[1], 1e-6, 'p n=9');
  assert.ok(E.shapiroWilk(D.skew).p < 1e-10);
});

test('correlaciones: Spearman, policórica y parcial', () => {
  cerca(E.spearmanPar(X[0], X[4]).r, R.spear, 1e-10, 'spearman');
  cerca(E.policorica(X[0], X[1]).r, R.poly12, 1e-4, 'policórica 1-2');
  cerca(E.policorica(X[0], X[4]).r, R.poly15, 1e-4, 'policórica 1-5');
  const { R: Rp } = E.matrizCorrelaciones(X, 'pearson');
  cerca(E.correlacionesParciales(Rp)[0][2], R.pcor13, 1e-10, 'parcial');
});

test('confiabilidad: α, α ordinal, ω', () => {
  const filas = X[0].map((_, i) => X.slice(0, 4).map(c => c[i]));
  cerca(E.alfaCronbach(filas), R.alpha_raw, 1e-10, 'α');
  const { R: P } = E.matrizCorrelaciones(X.slice(0, 4), 'policorica');
  cerca(E.alfaDeR(P), R.alpha_ord, 1e-4, 'α ordinal');
  const { R: Rp } = E.matrizCorrelaciones(X.slice(0, 4), 'pearson');
  cerca(E.omegaDeR(Rp), R.omega_pearson, 1e-3, 'ω');
});

test('KMO, Bartlett y AFE oblimin', () => {
  const { R: P } = E.matrizCorrelaciones(X, 'policorica');
  const kb = E.kmoBartlett(P, 150);
  cerca(kb.kmo, R.kmo, 1e-4, 'KMO'); cerca(kb.chi2, R.bartlett[0], 1e-4, 'Bartlett');
  const f = E.afe(P, 2);
  f.cargas.forEach((fila, i) => fila.forEach((v, j) => cerca(v, R.fa2[i][j], 0.01, `carga ${i},${j}`)));
  cerca(f.Phi[0][1], R.phi[0][1], 0.01, 'φ');
  const pa = E.analisisParalelo(P, 150, 50);
  assert.equal(pa.factores, 2);
});

test('regresión, Kruskal-Wallis, ANOVA y distribuciones', () => {
  const lm = E.regresion(D.cont, [X[0], X[4]], ['i1', 'i5']);
  lm.coef.forEach((c, j) => { cerca(c.b, R.lm_coef[j], 1e-9, 'b'); cerca(c.se, R.lm_se[j], 1e-9, 'se'); });
  cerca(lm.coef[2].p, R.lm_p[2], 1e-6, 'p'); cerca(lm.R2, R.lm_r2, 1e-10, 'R²');
  const grupos = [...new Set(X[7])].sort().map(g => D.cont.filter((_, i) => X[7][i] === g));
  const kw = E.kruskalWallis(grupos); cerca(kw.H, R.kw[0], 1e-9, 'H'); cerca(kw.p, R.kw[1], 1e-6, 'p KW');
  const av = E.anova1(grupos); cerca(av.F, R.anova[0], 1e-9, 'F');
  cerca(E.tCDF(2.1, 17), R.pt, 1e-10, 't'); cerca(E.fCDF(3.2, 3, 40), R.pf, 1e-10, 'F cdf'); cerca(E.chi2CDF(7.5, 4), R.pchi, 1e-10, 'χ²');
});

test('k-medias y silueta (sklearn: k=3 → 0,3707)', () => {
  const Z = E.zscores([D.cont, D.skew, X[0]]);
  const P = Z[0].map((_, i) => Z.map(c => c[i]));
  const r = E.kmedias(P, 3);
  cerca(r.inercia, 192.8284983, 1e-6, 'inercia');
  cerca(E.silueta(P, r.asignacion).media, 0.3707287048, 1e-6, 'silueta');
  cerca(E.asimetria(D.skew), 2.3472982758, 1e-8, 'asimetría'); cerca(E.curtosis(D.skew), 5.9135357439, 1e-8, 'curtosis');
});
