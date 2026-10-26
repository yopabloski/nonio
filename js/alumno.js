// Nonio · app del alumno.
import { store, modo } from './services/store.js';
import { INSTRUMENTO, ESCALAS, NO_RESPONDE } from './domain/instrumentos.js';
import { claveRespuesta, instrumentosDe, estadoRespuesta, necesitaConsentimiento, bloqueDe } from './domain/modelo.js';
import { completitud } from './domain/puntajes.js';
import {
  correoValido, normalizarCorreo, rutValido, normalizarRut, formatearRut,
  normalizarCodigo, nombreValido, normalizarNombre
} from './domain/identidad.js';
import * as CI from './domain/consentimiento.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const S = {
  config: null,
  participante: null,
  momentoId: null,
  codigo: null,
  orden: null,
  docs: {},
  actual: null // { inst, clave, resp }
};

// ---------- Utilidades de UI ----------
const VISTAS = ['vIngreso', 'vConsentimiento', 'vRechazo', 'vMomento', 'vEncuesta', 'vCerrado', 'vCargando'];
function altoBarra() {
  document.documentElement.style.setProperty('--alto-barra', `${document.querySelector('.barra').getBoundingClientRect().height}px`);
}
window.addEventListener('resize', altoBarra);

function mostrar(id) {
  for (const v of VISTAS) $('#' + v).hidden = v !== id;
  window.scrollTo({ top: 0, behavior: 'instant' });
  $('#sesionChip').hidden = !S.participante || id === 'vIngreso';
  altoBarra();
}

let toastT;
function toast(msg, error = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('error', error);
  t.classList.add('visible');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('visible'), 3200);
}

const hora = iso => iso ? new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

// ---------- Ingreso ----------
function marcar(input, ayuda, msg) {
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  ayuda.textContent = msg || '';
  ayuda.classList.toggle('error', Boolean(msg));
}

function validarIngreso() {
  const correo = normalizarCorreo($('#inCorreo').value);
  const nombre = normalizarNombre($('#inNombre').value);
  const rut = $('#inRut').value;
  const codigo = normalizarCodigo($('#inCodigo').value);
  let ok = true;
  const m = (sel, ay, cond, msg) => { marcar($(sel), $(ay), cond ? '' : msg); ok = ok && cond; };
  m('#inCorreo', '#ayCorreo', correoValido(correo), 'Usa tu correo institucional @udd.cl.');
  m('#inNombre', '#ayNombre', nombreValido(nombre), 'Escribe tu nombre y al menos un apellido.');
  m('#inRut', '#ayRut', rutValido(rut), 'RUT no válido. Revisa el dígito verificador.');
  m('#inCodigo', '#ayCodigo', codigo.length >= 3, 'Escribe el código que te dio tu profesor.');
  return ok ? { correo, nombre, rut: normalizarRut(rut), codigo } : null;
}

function prepararIngreso() {
  const rut = $('#inRut');
  rut.addEventListener('input', () => {
    const limpio = rut.value.replace(/[^0-9kK]/g, '');
    if (limpio.length >= 2) rut.value = formatearRut(limpio);
  });
  $('#inCodigo').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });
  const params = new URLSearchParams(location.search);
  if (params.get('codigo')) $('#inCodigo').value = normalizarCodigo(params.get('codigo'));

  $('#formIngreso').addEventListener('submit', async e => {
    e.preventDefault();
    $('#errIngreso').textContent = '';
    const datos = validarIngreso();
    if (!datos) return;
    const btn = $('#btnIngresar');
    btn.disabled = true;
    btn.firstChild.textContent = 'Ingresando… ';
    try {
      const r = await store.ingresar(datos);
      S.participante = r.participante;
      S.momentoId = r.momentoId;
      S.codigo = datos.codigo;
      await continuar();
    } catch (err) {
      $('#errIngreso').textContent = err.message || 'No fue posible ingresar. Revisa tu conexión.';
      if (err.code === 'codigo-invalido') marcar($('#inCodigo'), $('#ayCodigo'), 'Código no válido.');
      if (err.code === 'rut-no-coincide') marcar($('#inRut'), $('#ayRut'), 'No coincide con el registrado.');
    } finally {
      btn.disabled = false;
      btn.firstChild.textContent = 'Ingresar ';
    }
  });
}

// ---------- Consentimiento ----------
function prepararConsentimiento() {
  $('#ciVersion').textContent = `Versión ${CI.VERSION}`;
  $('#ciTitulo').textContent = CI.TITULO;
  $('#ciSub').textContent = CI.SUBTITULO;
  $('#ciTexto').innerHTML = CI.PARRAFOS.map(p => `<p>${p}</p>`).join('');
  $('#ciCierre').textContent = CI.CIERRE;
  $('#ciSi').textContent = CI.ACEPTO;
  $('#ciNo').textContent = CI.NO_ACEPTO;
  $('#ciExclusionTitulo').textContent = CI.EXCLUSION_TITULO;
  $('#ciExclusionTexto').textContent = CI.EXCLUSION;
  $('#ciDecision').addEventListener('change', () => {
    $('#btnConsentir').disabled = false;
    const si = document.querySelector('input[name="ci"]:checked')?.value === 'si';
    $('#ciExcluye').disabled = !si;
    if (!si) $('#ciExcluye').checked = false;
  });
  $('#btnConsentir').addEventListener('click', async () => {
    const valor = document.querySelector('input[name="ci"]:checked')?.value;
    if (!valor) return;
    const btn = $('#btnConsentir');
    btn.disabled = true;
    try {
      const reg = await store.guardarConsentimiento(S.participante.correo, valor === 'si', S.momentoId, { excluyeMayo: $('#ciExcluye').checked });
      S.participante.consentimiento = reg;
      S.participante.consentimientos = { ...(S.participante.consentimientos || {}), [S.momentoId]: reg };
      await continuar();
    } catch (err) {
      toast(err.message || 'No se pudo guardar tu decisión.', true);
      btn.disabled = false;
    }
  });
  $('#btnRevisarCi').addEventListener('click', () => verConsentimiento());
}

function verConsentimiento() {
  const p = S.participante;
  $('#ciFirma').textContent = `${p.correo} · ${new Date().toLocaleDateString('es-CL')}`;
  document.querySelectorAll('input[name="ci"]').forEach(r => { r.checked = false; });
  $('#ciExcluye').checked = false;
  $('#ciExcluye').disabled = true;
  $('#btnConsentir').disabled = true;
  mostrar('vConsentimiento');
}

// ---------- Flujo ----------

async function continuar() {
  const p = S.participante;
  $('#sesionCorreo').textContent = p.correo;
  S.config = await store.cargarConfig();
  const m = S.config.momentos?.[S.momentoId];
  if (!m || m.estado !== 'abierto') return verCerrado(m);
  // Consentimiento: siempre si nunca decidió; además, en los momentos
  // configurados para pedirlo, una vez por momento.
  if (necesitaConsentimiento(p, m, CI.VERSION)) return verConsentimiento();
  if (!p.consentimiento.acepta) return mostrar('vRechazo');
  // Diseño contrabalanceado: orden del estudiante (de la nómina o asignado al azar al entrar).
  S.orden = await store.asegurarOrden(p.correo);
  S.docs = await store.respuestasDe(p.correo);
  verMomento();
}

function verCerrado(m) {
  const borrador = m?.estado === 'borrador';
  $('#cerKicker').textContent = m ? m.nombre : 'Código sin momento';
  $('#cerTitulo').textContent = !m ? 'Este código no tiene un momento asociado.' : borrador ? 'Este momento todavía no abre.' : 'Este momento ya cerró.';
  $('#cerTexto').textContent = borrador
    ? 'Cuando tu profesor lo abra podrás ingresar con el mismo código. Tus datos ya quedaron registrados.'
    : 'Gracias. Si crees que es un error, avísale a tu profesor.';
  mostrar('vCerrado');
}

function verMomento() {
  const m = S.config.momentos[S.momentoId];
  const insts = instrumentosDe(m, S.config, S.orden);
  const bloque = bloqueDe(S.config, m, S.orden);
  const minutos = insts.reduce((a, i) => a + i.minutos, 0);
  $('#momKicker').textContent = S.config.titulo;
  $('#momBloque').hidden = !bloque;
  if (bloque) $('#momBloque').innerHTML = `${esc(S.config.diseno.bloques[bloque].nombre)} <b>·</b> ${insts.map(i => esc(i.sigla)).join(' + ')}`;
  $('#momTitulo').textContent = m.nombre;
  $('#momBajada').textContent = `${insts.length} cuestionario${insts.length === 1 ? '' : 's'} · unos ${minutos} minutos en total. Puedes pausar y volver: tus respuestas se guardan solas.`;

  let enviados = 0;
  $('#momLista').innerHTML = insts.map((inst, idx) => {
    const clave = claveRespuesta(m.id, inst.id);
    const doc = S.docs[clave];
    const estado = estadoRespuesta(doc, inst);
    const { respondidas, total } = completitud(inst, doc?.respuestas);
    if (estado === 'enviado') enviados++;
    const pill = estado === 'enviado' ? '<span class="pill ok">Enviado</span>'
      : estado === 'en-curso' ? `<span class="pill curso">En curso · ${respondidas}/${total}</span>`
      : '<span class="pill">Pendiente</span>';
    const accion = estado === 'enviado' ? `Enviado ${doc.enviado ? '· ' + new Date(doc.enviado).toLocaleDateString('es-CL') : ''}`
      : estado === 'en-curso' ? 'Continuar <span class="flecha">→</span>' : 'Comenzar <span class="flecha">→</span>';
    return `<li class="inst ${estado}" style="--c:${inst.color};animation-delay:${idx * 60}ms">
      <div>
        <span class="inst-sigla">${esc(inst.sigla)} · ${esc(inst.constructo)}</span>
        <h2>${esc(inst.nombre)}</h2>
        <div class="inst-meta">${pill}<span class="mono">${total} preguntas · ~${inst.minutos} min</span></div>
        <div class="inst-barra" aria-hidden="true"><i style="width:${(respondidas / total) * 100}%"></i></div>
      </div>
      <button class="btn" type="button" data-inst="${inst.id}" ${estado === 'enviado' ? 'disabled aria-disabled="true"' : ''}>${accion}</button>
    </li>`;
  }).join('');

  const frac = insts.length ? enviados / insts.length : 0;
  $('#momAnillo .arco').style.strokeDashoffset = String(119.4 * (1 - frac));
  $('#momAnillo span').textContent = `${enviados}/${insts.length}`;
  $('#momFinal').hidden = !(insts.length && enviados === insts.length);
  mostrar('vMomento');
}

// ---------- Encuesta ----------
const bkKey = clave => `ama:bk:${S.participante.correo}:${clave}`;

function abrirInstrumento(instId) {
  const inst = INSTRUMENTO[instId];
  const clave = claveRespuesta(S.momentoId, instId);
  const doc = S.docs[clave];
  let resp = { ...(doc?.respuestas || {}) };
  try {
    const bk = JSON.parse(localStorage.getItem(bkKey(clave)));
    if (bk && (!doc?.actualizado || bk.t > Date.parse(doc.actualizado))) resp = { ...resp, ...bk.r };
  } catch {}
  // Claves numéricas
  resp = Object.fromEntries(Object.entries(resp).map(([k, v]) => [Number(k), v]));
  S.actual = { inst, clave, resp };

  const sec = $('#vEncuesta');
  sec.style.setProperty('--c', inst.color);
  $('#encKicker').textContent = `${inst.sigla} · ${inst.constructo}`;
  $('#encTitulo').textContent = inst.nombre;
  $('#encInstr').textContent = inst.instrucciones;
  $('#encEnunciado').textContent = inst.enunciado;
  $('#dlgSigla').textContent = inst.sigla;
  $('#encGuardado').textContent = doc?.actualizado ? `Guardado ${hora(doc.actualizado)}` : '';
  $('#encGuardado').classList.remove('error');
  renderItems();
  mostrar('vEncuesta');
}

function renderItems() {
  const { inst, resp } = S.actual;
  const escala = ESCALAS[inst.escala];
  const omitir = S.config.permitirOmitir !== false;
  $('#encItems').innerHTML = inst.items.map(item => {
    const v = resp[item.n];
    // Escalas numéricas: PERMA (0–10, anclas por ítem) y escalas con solo
    // algunos puntos rotulados (EME-E de Núñez: 1, 4 y 7).
    const numerica = inst.escala === 'perma11' || escala.some(o => !o.etiqueta);
    const ops = escala.map(o => `<button type="button" role="radio" class="op" data-v="${o.valor}" aria-checked="${v === o.valor}"
        aria-label="${esc(o.etiqueta && inst.escala !== 'perma11' ? `${o.valor}: ${o.etiqueta}` : String(o.valor))}">${numerica ? o.valor : `<span class="mono">${o.valor}</span>${esc(o.etiqueta)}`}</button>`).join('');
    const grupo = inst.escala === 'perma11'
      ? `<div class="escala11" role="radiogroup" aria-labelledby="t${item.n}">${ops}</div><div class="anclas" aria-hidden="true"><span>${esc(item.anclas[0])}</span><span>${esc(item.anclas[1])}</span></div>`
      : numerica
        ? `<div class="escala11 escala-num" style="--n:${escala.length}" role="radiogroup" aria-labelledby="t${item.n}">${ops}</div><div class="anclas anclas-num" aria-hidden="true">${escala.filter(o => o.etiqueta).map(o => `<span><b>${o.valor}</b> ${esc(o.etiqueta)}</span>`).join('')}</div>`
        : `<div class="likert" role="radiogroup" aria-labelledby="t${item.n}">${ops}</div>`;
    return `<li class="item ${v !== undefined ? 'respondido' : ''}" id="it${item.n}" data-n="${item.n}">
      <span class="item-num">${String(item.n).padStart(2, '0')} / ${inst.items.length}</span>
      <p class="item-texto" id="t${item.n}">${esc(item.texto)}</p>
      ${grupo}
      ${omitir ? `<button type="button" class="omitir" aria-pressed="${v === NO_RESPONDE}">Prefiero no responder</button>` : ''}
    </li>`;
  }).join('');
  progreso();
}

function progreso() {
  const { inst, resp } = S.actual;
  const { respondidas, total } = completitud(inst, resp);
  $('#encFill').style.width = `${(respondidas / total) * 100}%`;
  $('#encCuenta').textContent = `${respondidas}/${total}`;
}

let guardarT = null;
function programarGuardado() {
  const { clave, resp } = S.actual;
  try { localStorage.setItem(bkKey(clave), JSON.stringify({ t: Date.now(), r: resp })); } catch {}
  $('#encGuardado').textContent = 'Guardando…';
  $('#encGuardado').classList.remove('error');
  clearTimeout(guardarT);
  guardarT = setTimeout(guardarAhora, 900);
}

async function guardarAhora() {
  clearTimeout(guardarT);
  guardarT = null;
  if (!S.actual) return;
  const { inst, clave, resp } = S.actual;
  try {
    await store.guardarRespuestas(S.participante.correo, S.momentoId, inst.id, resp, { primera: !S.docs[clave] });
    const t = new Date().toISOString();
    S.docs[clave] = { ...(S.docs[clave] || {}), respuestas: { ...resp }, estado: 'borrador', actualizado: t };
    $('#encGuardado').textContent = `Guardado ${hora(t)}`;
  } catch (err) {
    $('#encGuardado').textContent = navigator.onLine ? (err.message || 'No se pudo guardar') : 'Sin conexión · guardado en este dispositivo';
    $('#encGuardado').classList.add('error');
  }
}

function prepararEncuesta() {
  $('#encItems').addEventListener('click', e => {
    const li = e.target.closest('.item');
    if (!li) return;
    const n = Number(li.dataset.n);
    const { resp, inst } = S.actual;
    const antes = resp[n];
    const op = e.target.closest('.op');
    if (op) resp[n] = Number(op.dataset.v);
    else if (e.target.closest('.omitir')) resp[n] = resp[n] === NO_RESPONDE ? undefined : NO_RESPONDE;
    else return;
    if (resp[n] === undefined) delete resp[n];
    li.querySelectorAll('.op').forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.v) === resp[n])));
    const om = li.querySelector('.omitir');
    if (om) om.setAttribute('aria-pressed', String(resp[n] === NO_RESPONDE));
    li.classList.toggle('respondido', resp[n] !== undefined);
    li.classList.remove('falta');
    progreso();
    programarGuardado();
    // Avanza solo si era la primera vez que respondía este ítem.
    if (antes === undefined && resp[n] !== undefined) {
      const siguiente = inst.items.find(i => i.n > n && resp[i.n] === undefined);
      if (siguiente) setTimeout(() => $('#it' + siguiente.n)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 220);
    }
  });

  $('#btnVolver').addEventListener('click', async () => {
    if (guardarT) await guardarAhora();
    S.actual = null;
    verMomento();
  });

  $('#btnEnviar').addEventListener('click', () => {
    const { inst, resp } = S.actual;
    const faltan = inst.items.filter(i => resp[i.n] === undefined);
    document.querySelectorAll('.item').forEach(li => li.classList.toggle('falta', resp[Number(li.dataset.n)] === undefined));
    if (faltan.length) {
      toast(`Te falta${faltan.length === 1 ? '' : 'n'} ${faltan.length} pregunta${faltan.length === 1 ? '' : 's'}.`, true);
      $('#it' + faltan[0].n).scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    $('#dlgEnviar').showModal();
  });

  $('#dlgEnviar').addEventListener('close', async () => {
    if ($('#dlgEnviar').returnValue !== 'si') return;
    const { inst, clave, resp } = S.actual;
    clearTimeout(guardarT);
    guardarT = null;
    const btn = $('#btnEnviar');
    btn.disabled = true;
    try {
      await store.enviarRespuestas(S.participante.correo, S.momentoId, inst.id, resp, { primera: !S.docs[clave] });
      const t = new Date().toISOString();
      S.docs[clave] = { ...(S.docs[clave] || {}), respuestas: { ...resp }, estado: 'enviado', actualizado: t, enviado: t };
      try { localStorage.removeItem(bkKey(clave)); } catch {}
      S.actual = null;
      toast(`${inst.sigla} enviado. ¡Gracias!`);
      verMomento();
    } catch (err) {
      toast(err.message || 'No se pudo enviar. Intenta de nuevo.', true);
    } finally {
      btn.disabled = false;
    }
  });

  // Guardar antes de salir de la página
  document.addEventListener('visibilitychange', () => { if (document.hidden && guardarT) guardarAhora(); });
  window.addEventListener('online', () => { if (S.actual) programarGuardado(); });
}

// ---------- Arranque ----------
async function arrancar() {
  $('#bandaDemo').hidden = modo !== 'demo';
  prepararIngreso();
  prepararConsentimiento();
  prepararEncuesta();
  $('#momLista').addEventListener('click', e => {
    const b = e.target.closest('button[data-inst]');
    if (b && !b.disabled) abrirInstrumento(b.dataset.inst);
  });
  $('#btnSalir').addEventListener('click', async () => {
    if (guardarT) await guardarAhora();
    await store.salir();
    Object.assign(S, { participante: null, momentoId: null, orden: null, docs: {}, actual: null });
    $('#formIngreso').reset();
    mostrar('vIngreso');
  });
  $('#btnReintentar').addEventListener('click', () => continuar().catch(fallo));

  try {
    const ses = await store.sesionActual();
    const codUrl = normalizarCodigo(new URLSearchParams(location.search).get('codigo') || '');
    if (ses && codUrl && codUrl !== ses.codigo) {
      // Llega con el enlace de otra sesión: se vuelve a ingresar con el código nuevo.
      await store.salir();
      $('#inCorreo').value = ses.participante.correo || '';
      $('#inNombre').value = ses.participante.nombre || '';
      mostrar('vIngreso');
    } else if (ses) {
      S.participante = ses.participante;
      S.momentoId = ses.momentoId;
      S.codigo = ses.codigo;
      await continuar();
    } else {
      mostrar('vIngreso');
    }
  } catch (err) { fallo(err); }
}

function fallo(err) {
  console.error(err);
  mostrar('vIngreso');
  $('#errIngreso').textContent = 'No fue posible conectar. Revisa tu conexión e intenta de nuevo.';
}

arrancar();
