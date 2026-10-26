// Nonio · panel docente.
import { store, modo } from './services/store.js';
import { INSTRUMENTOS, INSTRUMENTO, ESCALAS, NO_RESPONDE, puntuaciones, varDim } from './domain/instrumentos.js';
import { momentosOrdenados, claveRespuesta, estadoRespuesta, nuevoMomentoId, codigoSugerido, ESTADOS_MOMENTO, ORDENES, esContrabalanceado, bloqueDe, instrumentosPara, sincronizarInstrumentos, BLOQUES_INICIALES, aleatorizarOrdenes } from './domain/modelo.js';
import { completitud } from './domain/puntajes.js';
import { leerNomina, textoATabla, semillaNueva, seccionDesdeArchivo } from './domain/nomina.js';
import { construirBases, aSalida, aCSV, libroDeCodigos, sintaxisSPSS, idSeudonimo, normalizarRespuestas, LEEME } from './domain/exportar.js';
import { columnas, activarTooltips, fmt } from './ui/graficos.js';
import { crearAnalisis } from './ui/analisis.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clon = x => JSON.parse(JSON.stringify(x));

const S = {
  docente: null,
  config: null,
  borrador: null,
  sucio: false,
  codigos: {},
  participantes: [],
  respuestas: [],
  nomina: [],
  ordenDe: new Map(),
  aleatorizaciones: [],
  seccion: 'resumen',
  an: { momento: null, inst: null }
};

// ---------- UI común ----------
let toastT;
function toast(msg, error = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('error', error);
  t.classList.add('visible');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('visible'), 3400);
}

function confirmar({ kicker = 'Confirmar', titulo, texto, si = 'Confirmar', peligro = false }) {
  const d = $('#dlgConfirmar');
  $('#dlgKicker').textContent = kicker;
  $('#dlgTitulo').textContent = titulo;
  $('#dlgTexto').innerHTML = texto;
  $('#dlgSi').textContent = si;
  $('#dlgSi').classList.toggle('peligro', peligro);
  d.showModal();
  return new Promise(res => d.addEventListener('close', () => res(d.returnValue === 'si'), { once: true }));
}

const fechaCorta = iso => iso ? new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '';

function irA(sec) {
  S.seccion = sec;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('activo', b.dataset.sec === sec));
  document.querySelectorAll('.seccion').forEach(s => { s.hidden = s.id !== `sec-${sec}`; });
  pintar();
  window.scrollTo({ top: 0 });
}

// ---------- Datos ----------
const partPorCorreo = () => new Map(S.participantes.map(p => [p.correo, p]));
const docsPorClave = () => new Map(S.respuestas.map(r => [`${r.correo}|${r.clave}`, r]));
const aceptan = () => S.participantes.filter(p => p.consentimiento?.acepta);

async function cargar() {
  $('#sync').textContent = 'Sincronizando…';
  try {
    const [config, codigos, participantes, respuestas, nomina, aleat] = await Promise.all([
      store.cargarConfig(), store.codigosVigentes(), store.listarParticipantes(), store.listarRespuestas(),
      store.listarNomina(), store.registrosAleatorizacion()
    ]);
    S.nomina = nomina;
    S.ordenDe = new Map(nomina.filter(n => n.orden).map(n => [n.correo, Number(n.orden)]));
    S.aleatorizaciones = aleat;
    S.config = config;
    if (!S.sucio) S.borrador = clon(config);
    S.codigos = codigos;
    S.participantes = participantes;
    S.respuestas = respuestas;
    ANALISIS?.invalidar();
    $('#sync').textContent = `Actualizado ${new Date().toLocaleTimeString('es-CL', { hour12: false })}`;
    pintar();
  } catch (err) {
    console.error(err);
    $('#sync').textContent = 'Error al sincronizar';
    toast(err.message || 'No se pudieron cargar los datos.', true);
  }
}

function pintar() {
  if (!S.config) return;
  ({ resumen: pintarResumen, momentos: pintarMomentos, nomina: pintarNomina, participantes: pintarParticipantes, analisis: pintarAnalisis, exportar: pintarExportar })[S.seccion]();
}

// ---------- 01 Resumen ----------
function pintarResumen() {
  const cfg = S.config;
  const N = cfg.cohorteN || 1;
  const reg = S.participantes.length;
  const si = aceptan().length;
  const no = S.participantes.filter(p => p.consentimiento && !p.consentimiento.acepta).length;
  const env = S.respuestas.filter(r => r.estado === 'enviado').length;
  const curso = S.respuestas.filter(r => r.estado !== 'enviado').length;
  const abiertos = momentosOrdenados(cfg).filter(m => m.estado === 'abierto');
  $('#resTitulo').textContent = cfg.titulo;
  $('#resNota').innerHTML = abiertos.length
    ? `<span class="pill abierto">Abierto: ${abiertos.map(m => esc(m.nombre)).join(', ')}</span>`
    : '<span class="pill">Ningún momento abierto</span>';

  const kpi = (k, b, sub, p, frac) => `<div class="kpi"><span class="kicker">${k}</span><b>${b}${sub ? `<small>${sub}</small>` : ''}</b><p>${p}</p>${frac != null ? `<div class="medidor"><i style="width:${Math.min(100, frac * 100)}%"></i></div>` : ''}</div>`;
  $('#kpis').innerHTML =
    kpi('Registrados', reg, `/ ${N}`, `${fmt((reg / N) * 100, 1)} % de la cohorte`, reg / N) +
    kpi('Aceptan participar', si, '', `${no} no acepta${no === 1 ? '' : 'n'} · ${reg - si - no} sin decisión`, reg ? si / reg : 0) +
    kpi('Cuestionarios enviados', env, '', 'Todos los momentos e instrumentos') +
    kpi('En curso', curso, '', 'Borradores con respuestas guardadas');

  const docs = docsPorClave();
  const barraInst = (inst, m, personas, den) => {
    let e = 0, c = 0;
    for (const p of personas) {
      const st = estadoRespuesta(docs.get(`${p.correo}|${claveRespuesta(m.id, inst.id)}`), inst);
      if (st === 'enviado') e++; else if (st === 'en-curso') c++;
    }
    const d = Math.max(den, 1);
    const we = (e / d) * 100, wc = (c / d) * 100;
    return `<div class="barra-inst" style="--c:${inst.color}">
        <span class="sigla" style="color:var(--tinta)">${inst.sigla}</span>
        <div class="riel">${e ? `<i style="width:${Math.min(100, we)}%;background:${inst.color}" data-tip="<b>${inst.sigla}</b> · ${e} enviados"></i>` : ''}${c ? `<i style="width:${Math.min(100, wc)}%;background:repeating-linear-gradient(45deg,${inst.color}55 0 4px,${inst.color}22 4px 8px)" data-tip="<b>${inst.sigla}</b> · ${c} en curso"></i>` : ''}</div>
        <span class="cifra">${e}/${den} · ${fmt(we, 0)} %</span>
      </div>`;
  };
  let html = '';
  const cruzado = esContrabalanceado(cfg);
  for (const m of momentosOrdenados(cfg)) {
    html += `<div class="avance-momento"><h3>${esc(m.nombre)} <span class="pill ${m.estado === 'abierto' ? 'abierto' : m.estado === 'cerrado' ? 'alerta' : ''}">${m.estado}</span></h3>`;
    if (cruzado) {
      for (const o of ORDENES) {
        const b = bloqueDe(cfg, m, o);
        const enNomina = S.nomina.filter(n => Number(n.orden) === o).length;
        const personas = S.participantes.filter(p => S.ordenDe.get(p.correo) === o);
        const den = enNomina || Math.round(N / 2);
        html += `<p class="avance-orden"><b>Orden ${o}</b> → ${esc(cfg.diseno.bloques[b]?.nombre || b)} · ${enNomina} en la nómina</p>`;
        html += instrumentosPara(cfg, m, o).map(id => barraInst(INSTRUMENTO[id], m, personas, den)).join('');
      }
    } else {
      html += INSTRUMENTOS.filter(i => m.instrumentos.includes(i.id)).map(inst => barraInst(inst, m, S.participantes, N)).join('');
    }
    html += '</div>';
  }
  html += `<div class="leyenda"><span><i style="background:var(--tinta)"></i>Enviado</span><span><i style="background:repeating-linear-gradient(45deg,#0F1D2B55 0 3px,#0F1D2B22 3px 6px)"></i>En curso</span><span><i style="background:var(--papel-2)"></i>Pendiente</span></div>`;
  $('#avance').innerHTML = html;

  // Envíos por día
  const porDia = new Map();
  for (const r of S.respuestas) {
    if (r.estado !== 'enviado' || !r.enviado) continue;
    const d = r.enviado.slice(0, 10);
    porDia.set(d, (porDia.get(d) || 0) + 1);
  }
  const dias = [...porDia.keys()].sort();
  const serie = [];
  if (dias.length) {
    for (let t = Date.parse(dias[0]); t <= Date.parse(dias[dias.length - 1]); t += 864e5) {
      const d = new Date(t).toISOString().slice(0, 10);
      const f = new Date(d + 'T12:00:00');
      serie.push({ label: f.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }), corto: f.toLocaleDateString('es-CL', { day: 'numeric', month: 'numeric' }), y: porDia.get(d) || 0 });
    }
  }
  $('#porDia').innerHTML = columnas(serie, { color: '#0F1D2B' });
}

// ---------- 02 Momentos ----------
function pintarDiseno() {
  const b = S.borrador;
  const cruz = esContrabalanceado(b);
  const bloques = cruz ? Object.values(b.diseno.bloques) : [];
  const items = bl => bl.instrumentos.reduce((a, id) => a + INSTRUMENTO[id].items.length, 0);
  $('#diseno').innerHTML = `
    <header class="diseno-cabeza"><div><h2>Diseño de aplicación</h2><p>${cruz
      ? 'Contrabalanceado (protocolo V7.0): cada estudiante tiene un orden. <b>Orden 1</b> responde el Bloque A en la sesión 1 y el B en la sesión 2; <b>Orden 2</b>, al revés. El orden sale de la nómina.'
      : 'Todos los estudiantes responden los mismos instrumentos en cada momento.'}</p></div>
      <div class="segmentado"><button type="button" data-tipo="contrabalanceado" aria-pressed="${cruz}">Contrabalanceado</button><button type="button" data-tipo="simple" aria-pressed="${!cruz}">Igual para todos</button></div></header>
    ${cruz ? `<div class="bloques">${bloques.map(bl => `<div class="bloque" data-bl="${bl.id}">
        <p class="kicker">${esc(bl.nombre)} · ${items(bl)} ítems · ~${bl.instrumentos.reduce((a, id) => a + INSTRUMENTO[id].minutos, 0)} min</p>
        <ol class="bloque-lista">${bl.instrumentos.map(id => `<li style="--c:${INSTRUMENTO[id].color}"><b>${INSTRUMENTO[id].sigla}</b> ${esc(INSTRUMENTO[id].nombre)} <small>${INSTRUMENTO[id].items.length} ítems</small></li>`).join('') || '<li class="vacio-b">Sin instrumentos</li>'}</ol>
        <div class="chips">${INSTRUMENTOS.map(i => `<button type="button" class="chip" style="--c:${i.color}" data-bl-inst="${i.id}" aria-pressed="${bl.instrumentos.includes(i.id)}">${i.sigla}</button>`).join('')}</div>
      </div>`).join('')}</div>
      <p class="sec-nota" style="margin:12px 0 0">Dentro de cada bloque los instrumentos se presentan en el orden de la lista (al activar uno, queda al final). Un instrumento solo puede estar en un bloque.</p>` : ''}`;
}

function pintarMomentos() {
  pintarDiseno();
  const b = S.borrador;
  $('#cfgTitulo').value = b.titulo || '';
  $('#cfgCohorte').value = b.cohorteN || '';
  $('#cfgCohorteId').value = b.cohorte || '';
  $('#cfgOmitir').checked = b.permitirOmitir !== false;
  const base = location.href.replace(/panel\.html.*$/, '');
  $('#momentos').innerHTML = momentosOrdenados(b).map(m => {
    const codigo = S.codigos[m.id] || '';
    const enviados = S.respuestas.filter(r => r.momentoId === m.id && r.estado === 'enviado').length;
    return `<article class="momento-card ${m.estado}" data-m="${m.id}">
      <header>
        <input value="${esc(m.nombre)}" data-campo="nombre" aria-label="Nombre del momento">
        <div class="segmentado" role="group" aria-label="Estado">
          ${ESTADOS_MOMENTO.map(e => `<button type="button" data-estado="${e}" aria-pressed="${m.estado === e}">${e[0].toUpperCase() + e.slice(1)}</button>`).join('')}
        </div>
      </header>
      <div class="cuerpo">
        ${esContrabalanceado(b) ? `<div>
          <p class="kicker">Qué bloque responde cada orden</p>
          <div class="asignacion">
            <span class="mono">Orden 1</span>
            <div class="segmentado">${Object.values(b.diseno.bloques).map(bl => `<button type="button" data-bloque1="${bl.id}" aria-pressed="${m.bloquePorOrden?.[1] === bl.id}">${esc(bl.nombre)}</button>`).join('')}</div>
            <span class="asig-flecha">→ ${instrumentosPara(b, m, 1).map(id => INSTRUMENTO[id].sigla).join(' + ')}</span>
            <span class="mono">Orden 2</span>
            <span class="asig-auto">${esc(b.diseno.bloques[m.bloquePorOrden?.[2]]?.nombre || '—')} <small>(el otro bloque)</small></span>
            <span class="asig-flecha">→ ${instrumentosPara(b, m, 2).map(id => INSTRUMENTO[id].sigla).join(' + ')}</span>
          </div>
        </div>` : `<div>
          <p class="kicker">Instrumentos de este momento</p>
          <div class="chips">${INSTRUMENTOS.map(i => `<button type="button" class="chip" style="--c:${i.color}" data-inst="${i.id}" aria-pressed="${m.instrumentos.includes(i.id)}">${i.sigla}<small>${i.items.length} ít · ~${i.minutos}′</small></button>`).join('')}</div>
        </div>`}
        <label class="interruptor">
          <input type="checkbox" data-campo="pedirCI" ${m.pedirConsentimiento ? 'checked' : ''}>
          <span class="riel" aria-hidden="true"></span>
          <span><b>Pedir consentimiento en este momento</b><small>${m.pedirConsentimiento
            ? 'Todos verán el consentimiento al entrar a este momento, aunque ya lo hayan respondido antes. Queda registrado por momento.'
            : 'Solo lo verá quien aún no lo ha respondido. Quien ya aceptó entra directo a los cuestionarios.'}</small></span>
        </label>
        <div class="codigo-fila">
          <label class="campo"><span>Código de acceso</span><input value="${esc(codigo)}" data-campo="codigo" placeholder="Sin código" autocomplete="off"></label>
          <button class="btn sec chico" type="button" data-accion="generar">Generar</button>
          <button class="btn chico" type="button" data-accion="guardar-codigo">Guardar código</button>
        </div>
        ${codigo ? `<div class="enlace-alumno"><span>Enlace directo: ${esc(base)}?codigo=${esc(codigo)}</span><button class="mini" type="button" data-accion="copiar" data-url="${esc(base)}?codigo=${esc(codigo)}">Copiar</button></div>` : '<div class="enlace-alumno">Sin código, los alumnos no pueden entrar a este momento.</div>'}
      </div>
      <footer>
        <span>${enviados} cuestionarios enviados · ${esContrabalanceado(b) ? ORDENES.map(o => `orden ${o}: ~${instrumentosPara(b, m, o).reduce((a, id) => a + INSTRUMENTO[id].minutos, 0)} min`).join(' · ') : `${m.instrumentos.reduce((a, id) => a + INSTRUMENTO[id].minutos, 0)} min estimados`}</span>
        ${enviados ? '' : '<button class="btn-texto" type="button" data-accion="eliminar">Eliminar momento</button>'}
      </footer>
    </article>`;
  }).join('');
}

function marcarSucio() {
  S.sucio = true;
  $('#btnGuardarConfig').textContent = 'Guardar cambios •';
}

async function guardarConfig() {
  const b = S.borrador;
  b.titulo = $('#cfgTitulo').value.trim() || 'AMA·PERMA';
  b.cohorteN = Math.max(1, parseInt($('#cfgCohorte').value, 10) || 1);
  b.cohorte = $('#cfgCohorteId').value.trim() || b.cohorte || '2026';
  b.permitirOmitir = $('#cfgOmitir').checked;
  if (esContrabalanceado(b)) {
    for (const bl of Object.values(b.diseno.bloques)) if (!bl.instrumentos.length) { toast(`${bl.nombre} no tiene instrumentos.`, true); return false; }
    sincronizarInstrumentos(b);
  }
  for (const m of Object.values(b.momentos)) {
    if (!m.instrumentos.length) { toast(`${m.nombre} no tiene instrumentos.`, true); return false; }
  }
  try {
    await store.guardarConfig(b);
    S.config = clon(b);
    S.sucio = false;
    $('#btnGuardarConfig').textContent = 'Guardar cambios';
    toast('Configuración guardada.');
    return true;
  } catch (err) {
    toast(err.message || 'No se pudo guardar.', true);
    return false;
  }
}

function prepararMomentos() {
  $('#btnGuardarConfig').addEventListener('click', async () => { await guardarConfig(); pintar(); });
  ['#cfgTitulo', '#cfgCohorteId', '#cfgCohorte', '#cfgOmitir'].forEach(s => $(s).addEventListener('change', marcarSucio));
  $('#btnNuevoMomento').addEventListener('click', () => {
    const b = S.borrador;
    const id = nuevoMomentoId(b);
    const orden = Math.max(0, ...Object.values(b.momentos).map(m => m.orden || 0)) + 1;
    b.momentos[id] = { id, nombre: `Momento ${orden}`, orden, instrumentos: [], estado: 'borrador', pedirConsentimiento: false };
    marcarSucio();
    pintar();
  });

  $('#diseno').addEventListener('click', e => {
    const b = S.borrador;
    const t = e.target.closest('[data-tipo]');
    const bi = e.target.closest('[data-bl-inst]');
    if (t) {
      if (t.dataset.tipo === 'contrabalanceado') {
        b.diseno = b.diseno?.bloques ? { ...b.diseno, tipo: 'contrabalanceado' } : { tipo: 'contrabalanceado', bloques: BLOQUES_INICIALES() };
        Object.values(b.momentos).forEach((m, i) => { if (!m.bloquePorOrden) m.bloquePorOrden = i % 2 ? { 1: 'B', 2: 'A' } : { 1: 'A', 2: 'B' }; });
        sincronizarInstrumentos(b);
      } else {
        b.diseno = { ...(b.diseno || {}), tipo: 'simple' };
      }
    } else if (bi) {
      const bl = b.diseno.bloques[bi.closest('[data-bl]').dataset.bl];
      const id = bi.dataset.blInst;
      if (bl.instrumentos.includes(id)) bl.instrumentos = bl.instrumentos.filter(x => x !== id);
      else {
        Object.values(b.diseno.bloques).forEach(o => { o.instrumentos = o.instrumentos.filter(x => x !== id); });
        bl.instrumentos.push(id);
      }
      sincronizarInstrumentos(b);
    } else return;
    marcarSucio();
    pintar();
  });

  $('#momentos').addEventListener('change', e => {
    if (e.target.dataset.campo !== 'pedirCI') return;
    const m = S.borrador.momentos[e.target.closest('[data-m]').dataset.m];
    m.pedirConsentimiento = e.target.checked;
    marcarSucio();
    pintar();
  });

  $('#momentos').addEventListener('input', e => {
    const card = e.target.closest('[data-m]');
    if (e.target.dataset.campo === 'nombre') { S.borrador.momentos[card.dataset.m].nombre = e.target.value; marcarSucio(); }
  });

  $('#momentos').addEventListener('click', async e => {
    const card = e.target.closest('[data-m]');
    if (!card) return;
    const m = S.borrador.momentos[card.dataset.m];
    const b1 = e.target.closest('[data-bloque1]');
    if (b1) {
      const otro = Object.keys(S.borrador.diseno.bloques).find(k => k !== b1.dataset.bloque1);
      m.bloquePorOrden = { 1: b1.dataset.bloque1, 2: otro };
      sincronizarInstrumentos(S.borrador);
      marcarSucio();
      pintar();
      return;
    }
    const chip = e.target.closest('.chip');
    const est = e.target.closest('[data-estado]');
    const acc = e.target.closest('[data-accion]')?.dataset.accion;

    if (chip) {
      const id = chip.dataset.inst;
      if (m.estado === 'abierto' && !(await confirmar({ titulo: 'Momento abierto', texto: 'Cambiar los instrumentos de un momento abierto afecta a quienes ya están respondiendo. ¿Continuar?' }))) return;
      m.instrumentos = m.instrumentos.includes(id) ? m.instrumentos.filter(x => x !== id) : INSTRUMENTOS.map(i => i.id).filter(x => x === id || m.instrumentos.includes(x));
      marcarSucio();
      pintar();
    } else if (est) {
      const nuevo = est.dataset.estado;
      if (nuevo === m.estado) return;
      if (nuevo === 'abierto' && !S.codigos[m.id]) { toast('Define y guarda un código de acceso antes de abrir.', true); return; }
      const textos = {
        abierto: `Los alumnos con el código <b class="mono">${esc(S.codigos[m.id] || '')}</b> podrán responder ${m.instrumentos.map(i => INSTRUMENTO[i].sigla).join(', ')}.`,
        cerrado: 'Nadie podrá guardar ni enviar respuestas en este momento. Las respuestas ya guardadas se conservan.',
        borrador: 'El momento vuelve a preparación y los alumnos no podrán responder.'
      };
      if (!(await confirmar({ kicker: m.nombre, titulo: `¿Cambiar a “${nuevo}”?`, texto: textos[nuevo], si: 'Cambiar estado', peligro: nuevo === 'cerrado' }))) return;
      m.estado = nuevo;
      await guardarConfig();
      pintar();
    } else if (acc === 'generar') {
      card.querySelector('[data-campo="codigo"]').value = codigoSugerido(m);
    } else if (acc === 'guardar-codigo') {
      const valor = card.querySelector('[data-campo="codigo"]').value;
      try {
        if (S.sucio || !S.config.momentos[m.id]) await guardarConfig();
        await store.fijarCodigo(m.id, valor);
        S.codigos = await store.codigosVigentes();
        toast('Código guardado.');
        pintar();
      } catch (err) { toast(err.message, true); }
    } else if (acc === 'copiar') {
      try { await navigator.clipboard.writeText(e.target.dataset.url); toast('Enlace copiado.'); } catch { toast('No se pudo copiar.', true); }
    } else if (acc === 'eliminar') {
      if (!(await confirmar({ titulo: `¿Eliminar ${m.nombre}?`, texto: 'Se quita de la configuración al guardar.', si: 'Eliminar', peligro: true }))) return;
      delete S.borrador.momentos[m.id];
      marcarSucio();
      pintar();
    }
  });
}

// ---------- 03 Nómina ----------
const ORIGEN = { aleatorizacion: 'aleatorización', entrada: 'al entrar', manual: 'manual', importado: 'importado' };
let nominaPendiente = null;

function pintarNomina() {
  const total = S.nomina.length;
  const o1 = S.nomina.filter(n => Number(n.orden) === 1).length;
  const o2 = S.nomina.filter(n => Number(n.orden) === 2).length;
  const sin = total - o1 - o2;
  const entrada = S.nomina.filter(n => n.origen === 'entrada').length;
  const ult = S.aleatorizaciones[S.aleatorizaciones.length - 1];
  const kpi = (k, b, p) => `<div class="kpi"><span class="kicker">${k}</span><b>${b}</b><p>${p}</p></div>`;
  $('#nomKpis').innerHTML =
    kpi('En la nómina', total, `${S.config.cohorteN ? `cohorte declarada: ${S.config.cohorteN}` : ''}`) +
    kpi('Orden 1', o1, `A → B · ${total ? fmt((100 * o1) / total, 0) : 0} %`) +
    kpi('Orden 2', o2, `B → A · ${total ? fmt((100 * o2) / total, 0) : 0} %`) +
    kpi('Sin orden', sin, ult ? `Última aleatorización: ${fechaCorta(ult.fecha)} · semilla ${ult.semilla}` : `${entrada} asignados al entrar`);
  $('#btnAleatorizar').disabled = !sin;
  $('#btnAleatorizar').textContent = sin ? `Aleatorizar ${sin} sin orden` : 'Todos tienen orden';

  const q = $('#nomBuscar').value.trim().toLowerCase();
  const f = $('#nomFiltro').value;
  const reg = new Map(S.participantes.map(p => [p.correo, p]));
  const lista = S.nomina
    .filter(n => !q || `${n.correo} ${n.nombre || ''}`.toLowerCase().includes(q))
    .filter(n => f === 'todos' || (f === 'sin' ? !n.orden : f === 'entrada' ? n.origen === 'entrada' : f === 'noreg' ? !reg.has(n.correo) : Number(n.orden) === Number(f)))
    .sort((a, b) => a.correo.localeCompare(b.correo));
  if (!total) { $('#tablaNomina').innerHTML = '<tbody><tr><td class="vacio"><b>La nómina está vacía</b>Carga un Excel o pega los correos de la cohorte.</td></tr></tbody>'; return; }
  $('#tablaNomina').innerHTML = `<thead><tr><th>Correo</th><th>Nombre</th><th>Sección</th><th>Orden</th><th>Origen</th><th>Registro</th><th>Consentimiento</th><th></th></tr></thead><tbody>${lista.map(n => {
    const p = reg.get(n.correo);
    const ci = p?.consentimiento ? (p.consentimiento.acepta ? `<span class="pill ok">Acepta${p.consentimiento.excluyeMayo ? ' · excluye mayo' : ''}</span>` : '<span class="pill alerta">No acepta</span>') : '<span class="mono" style="color:var(--tinta-3)">—</span>';
    return `<tr><td class="mono">${esc(n.correo)}</td><td>${esc(n.nombre || p?.nombre || '')}${n.matricula && !String(n.matricula).startsWith(String(S.config.cohorte)) ? ` <span class="pill curso" title="Matrícula ${esc(n.matricula)}: fuera del criterio de inclusión; responde, pero no entra al análisis">ingreso ${esc(String(n.matricula).slice(0, 4))} · fuera de criterio</span>` : ''}</td><td class="mono">${esc(n.seccion || '')}</td>
      <td><select class="orden-sel" data-orden="${esc(n.correo)}"><option value="" ${!n.orden ? 'selected' : ''}>—</option><option value="1" ${Number(n.orden) === 1 ? 'selected' : ''}>1 · A→B</option><option value="2" ${Number(n.orden) === 2 ? 'selected' : ''}>2 · B→A</option></select></td>
      <td>${esc(ORIGEN[n.origen] || '—')}${n.asignado ? `<small> · ${fechaCorta(n.asignado)}</small>` : ''}</td>
      <td>${p ? `<span class="pill ok">${fechaCorta(p.creado)}</span>` : '<span class="pill">Sin registrarse</span>'}</td><td>${ci}</td>
      <td><button class="mini peligro" data-quitar="${esc(n.correo)}">Quitar</button></td></tr>`;
  }).join('') || '<tr><td colspan="8" class="vacio">Sin resultados.</td></tr>'}</tbody>`;
}

function vistaPrevia(resultados) {
  // resultados: [{ nombre, r: leerNomina() }]
  const vistos = new Set();
  const validos = [];
  let dupCruzados = 0;
  for (const { r } of resultados) for (const v of r.validos) { if (vistos.has(v.correo)) { dupCruzados++; continue; } vistos.add(v.correo); validos.push(v); }
  nominaPendiente = validos.length ? validos : null;
  const existentes = new Set(S.nomina.map(n => n.correo));
  const nuevos = validos.filter(v => !existentes.has(v.correo)).length;
  const conOrden = validos.filter(v => v.orden).length;
  const otrosAnios = validos.filter(v => v.matricula && !String(v.matricula).startsWith(String(S.config.cohorte))).length;
  const detalle = resultados.length > 1 ? `<br>${resultados.map(x => `${esc(x.r.validos[0]?.seccion || x.nombre)}: ${x.r.validos.length}`).join(' · ')}` : '';
  const invalidos = resultados.flatMap(x => x.r.invalidos);
  $('#nomVista').innerHTML = validos.length || invalidos.length
    ? `<b>${validos.length}</b> correos válidos (${nuevos} nuevos, ${validos.length - nuevos} ya estaban)${conOrden ? ` · ${conOrden} traen orden` : ''}${dupCruzados ? ` · ${dupCruzados} repetidos entre listas` : ''}${detalle}${otrosAnios ? `<br><span class="mal">${otrosAnios} con matrícula de otro año de ingreso</span> (no son de la cohorte ${esc(S.config.cohorte)}: pueden responder, pero quedan fuera del análisis y de las exportaciones)` : ''}${invalidos.length ? `<br><span class="mal">${invalidos.length} filas sin correo @udd.cl válido</span>` : ''}`
    : '';
  $('#btnNomAgregar').disabled = !nominaPendiente;
}

function prepararNomina() {
  $('#nomBuscar').addEventListener('input', pintarNomina);
  $('#nomFiltro').addEventListener('change', pintarNomina);
  $('#nomTexto').addEventListener('input', e => vistaPrevia([{ nombre: 'texto', r: leerNomina(textoATabla(e.target.value)) }]));
  $('#nomArchivo').addEventListener('change', async e => {
    const archivos = [...e.target.files];
    if (!archivos.length) return;
    $('#nomArchivo').nextElementSibling.textContent = archivos.length === 1 ? archivos[0].name : `${archivos.length} archivos`;
    try {
      const resultados = [];
      for (const f of archivos) {
        let tabla;
        if (/\.xlsx?$/i.test(f.name)) {
          if (!window.XLSX) throw new Error('No se pudo cargar la librería de Excel (revisa la conexión).');
          const wb = window.XLSX.read(await f.arrayBuffer(), { type: 'array' });
          tabla = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
        } else tabla = textoATabla(await f.text());
        resultados.push({ nombre: f.name, r: leerNomina(tabla, { seccion: seccionDesdeArchivo(f.name) }) });
      }
      vistaPrevia(resultados);
    } catch (err) { toast(err.message, true); }
  });
  $('#btnNomAgregar').addEventListener('click', async () => {
    if (!nominaPendiente) return;
    const r = await store.agregarNomina(nominaPendiente);
    toast(`${r.nuevos} estudiantes nuevos · ${r.total} en la nómina.`);
    nominaPendiente = null;
    $('#nomTexto').value = ''; $('#nomVista').innerHTML = ''; $('#btnNomAgregar').disabled = true;
    await cargar();
  });
  $('#btnAleatorizar').addEventListener('click', async () => {
    const sin = S.nomina.filter(n => !n.orden).length;
    if (!(await confirmar({ kicker: 'Aleatorización simple', titulo: `¿Asignar orden a ${sin} estudiantes?`, texto: 'Cada uno recibe Orden 1 u Orden 2 con probabilidad 1/2. Quienes ya tienen orden no cambian. Se guarda un registro con la fecha, la semilla y los totales.', si: 'Aleatorizar' }))) return;
    const reg = await store.aleatorizar(semillaNueva());
    toast(`Listo: ${reg.n1} en Orden 1 y ${reg.n2} en Orden 2 (semilla ${reg.semilla}).`);
    await cargar();
  });
  $('#btnRegistroAleat').addEventListener('click', () => {
    const filas = S.nomina.map(n => ({ CORREO: n.correo, NOMBRE: n.nombre || '', SECCION: n.seccion || '', MATRICULA: n.matricula || '', ORDEN: n.orden || '', SECUENCIA: n.orden ? (Number(n.orden) === 1 ? 'A->B' : 'B->A') : '', ORIGEN: n.origen || '', FECHA_ASIGNACION: n.asignado ? String(n.asignado).replace('T', ' ').slice(0, 19) : '', SEMILLA: n.semilla ?? '' }));
    const resumen = S.aleatorizaciones.map((a, i) => `# Aleatorización ${i + 1}: ${String(a.fecha).replace('T', ' ').slice(0, 19)} · método ${a.metodo} · semilla ${a.semilla} · n = ${a.n} (Orden 1: ${a.n1}, Orden 2: ${a.n2}) · por ${a.por || '—'}`).join('\r\n');
    descargar(`nonio_registro-aleatorizacion_${sello()}.csv`, (resumen ? '\uFEFF' + resumen + '\r\n' : '') + aCSV(filas, ['CORREO', 'NOMBRE', 'SECCION', 'MATRICULA', 'ORDEN', 'SECUENCIA', 'ORIGEN', 'FECHA_ASIGNACION', 'SEMILLA']).replace(/^\uFEFF/, resumen ? '' : '\uFEFF'), 'text/csv;charset=utf-8');
  });
  $('#tablaNomina').addEventListener('change', async e => {
    const sel = e.target.closest('[data-orden]');
    if (!sel) return;
    const correo = sel.dataset.orden;
    const yaRespondio = S.respuestas.some(r => r.correo === correo);
    if (!sel.value) { sel.value = S.ordenDe.get(correo) || ''; return; }
    if (!(await confirmar({ kicker: 'Cambio manual', titulo: `¿Asignar Orden ${sel.value}?`, texto: `${esc(correo)} quedará con origen "manual".${yaRespondio ? ' <b>Ya tiene respuestas guardadas:</b> cambiar su orden puede romper su secuencia de bloques.' : ''}`, si: 'Cambiar', peligro: yaRespondio }))) { sel.value = S.ordenDe.get(correo) || ''; return; }
    await store.fijarOrden(correo, Number(sel.value));
    toast('Orden actualizado.');
    await cargar();
  });
  $('#tablaNomina').addEventListener('click', async e => {
    const b = e.target.closest('[data-quitar]');
    if (!b) return;
    if (!(await confirmar({ titulo: '¿Quitar de la nómina?', texto: `${esc(b.dataset.quitar)} deja de estar en la nómina. Sus respuestas no se borran; si vuelve a entrar, recibirá un orden al azar.`, si: 'Quitar', peligro: true }))) return;
    await store.quitarDeNomina(b.dataset.quitar);
    await cargar();
  });
}

// ---------- 04 Participantes ----------
function pintarParticipantes() {
  const q = $('#buscar').value.trim().toLowerCase();
  const fci = $('#filtroCi').value;
  const docs = docsPorClave();
  const momentos = momentosOrdenados(S.config);
  const cruz = esContrabalanceado(S.config);
  // Contrabalanceado: una columna por instrumento; la sesión depende del orden de cada estudiante.
  const columnasMI = cruz
    ? Object.values(S.config.diseno.bloques).flatMap(bl => bl.instrumentos.map(id => ({ i: INSTRUMENTO[id], bl })))
    : momentos.flatMap(m => INSTRUMENTOS.filter(i => m.instrumentos.includes(i.id)).map(i => ({ m, i })));
  const momentoDe = (p, i) => momentos.find(m => instrumentosPara(S.config, m, S.ordenDe.get(p.correo)).includes(i.id));
  const lista = S.participantes
    .filter(p => !q || `${p.nombre} ${p.correo} ${p.rut}`.toLowerCase().includes(q))
    .filter(p => fci === 'todos' || (fci === 'acepta' ? p.consentimiento?.acepta : fci === 'rechaza' ? p.consentimiento && !p.consentimiento.acepta : !p.consentimiento))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  if (!S.participantes.length) {
    $('#tablaPart').innerHTML = '<tbody><tr><td class="vacio"><b>Aún no hay participantes</b>Aparecerán aquí apenas un alumno ingrese con un código.</td></tr></tbody>';
    $('#partNota').textContent = '';
    return;
  }
  const cab = `<thead><tr><th>Participante</th><th>RUT</th>${cruz ? '<th>Orden</th>' : ''}<th>Consentimiento</th>${columnasMI.map(({ m, i, bl }) => `<th style="box-shadow:inset 0 -3px 0 ${i.color}">${i.sigla}<span class="sub">${esc(bl ? bl.nombre : m.nombre)}</span></th>`).join('')}<th></th></tr></thead>`;
  const filas = lista.map(p => {
    const ci = p.consentimiento
      ? (p.consentimiento.acepta ? `<span class="pill ok" title="${esc(p.consentimiento.version)}">Acepta${p.consentimiento.excluyeMayo ? ' · excluye mayo' : ''} · ${fechaCorta(p.consentimiento.fecha)}</span>` : `<span class="pill alerta">No acepta · ${fechaCorta(p.consentimiento.fecha)}</span>`)
      : '<span class="pill">Sin decisión</span>';
    const celdas = columnasMI.map(({ m: m0, i }) => {
      const m = cruz ? momentoDe(p, i) : m0;
      if (!m) return '<td><span class="mono" style="color:var(--tinta-3)" title="Sin orden asignado">·</span></td>';
      const clave = claveRespuesta(m.id, i.id);
      const d = docs.get(`${p.correo}|${clave}`);
      const st = estadoRespuesta(d, i);
      if (st === 'enviado') return `<td><div class="celda-estado"><span class="pill ok" title="Enviado ${fechaCorta(d.enviado)}">${cruz ? esc(m.nombre.replace(/^Sesión /, 'S')) + ' · ' : ''}${fechaCorta(d.enviado)}</span><button class="mini" data-reabrir="${esc(p.correo)}|${clave}" title="Devolver a borrador">Reabrir</button></div></td>`;
      if (st === 'en-curso') { const c = completitud(i, d.respuestas); return `<td><span class="pill curso">${c.respondidas}/${c.total}</span></td>`; }
      return '<td><span class="mono" style="color:var(--tinta-3)">—</span></td>';
    }).join('');
    const o = S.ordenDe.get(p.correo);
    const ordenCelda = cruz ? `<td>${o ? `<span class="orden-pill o${o}" title="${o === 1 ? 'A → B' : 'B → A'}">${o}</span>` : '<span class="mono" style="color:var(--tinta-3)">—</span>'}</td>` : '';
    return `<tr><td><b>${esc(p.nombre)}</b><small>${esc(p.correo)}</small></td><td class="mono">${esc(p.rut)}</td>${ordenCelda}<td>${ci}</td>${celdas}<td><button class="mini peligro" data-eliminar="${esc(p.correo)}" title="Eliminar todos los datos de este participante">Eliminar datos</button></td></tr>`;
  }).join('');
  $('#tablaPart').innerHTML = cab + `<tbody>${filas || `<tr><td colspan="${(cruz ? 5 : 4) + columnasMI.length}" class="vacio">Sin resultados para el filtro.</td></tr>`}</tbody>`;
  $('#partNota').textContent = `${lista.length} de ${S.participantes.length} participantes. “Reabrir” devuelve un cuestionario enviado a borrador para que el alumno lo corrija; queda registrado quién y cuándo. “Eliminar datos” atiende una solicitud de retiro (consentimiento V4.0).`;
}

function prepararParticipantes() {
  $('#buscar').addEventListener('input', pintarParticipantes);
  $('#filtroCi').addEventListener('change', pintarParticipantes);
  $('#tablaPart').addEventListener('click', async e => {
    const r = e.target.closest('[data-reabrir]');
    const d = e.target.closest('[data-eliminar]');
    if (r) {
      const [correo, clave] = r.dataset.reabrir.split('|');
      const [mId, iId] = clave.split('__');
      if (!(await confirmar({ kicker: 'Reabrir', titulo: `¿Reabrir ${INSTRUMENTO[iId].sigla}?`, texto: `<b>${esc(correo)}</b> podrá modificar sus respuestas de ${esc(S.config.momentos[mId]?.nombre || mId)} y deberá volver a enviarlas. Solo funciona si el momento está abierto.`, si: 'Reabrir' }))) return;
      await store.reabrir(correo, clave);
      toast('Cuestionario reabierto.');
      await cargar();
    } else if (d) {
      const correo = d.dataset.eliminar;
      if (!(await confirmar({ kicker: 'Retiro de datos', titulo: '¿Eliminar todos sus datos?', texto: `Se borran el registro, el consentimiento y todas las respuestas de <b>${esc(correo)}</b>. No se puede deshacer. Descarga un respaldo antes si lo necesitas.`, si: 'Eliminar definitivamente', peligro: true }))) return;
      await store.eliminarParticipante(correo);
      toast('Datos eliminados.');
      await cargar();
    }
  });
}

// ---------- 04 Análisis ----------
// La lógica vive en js/ui/analisis.js; aquí solo se conecta.
let ANALISIS = null;
function pintarAnalisis() {
  if (!ANALISIS) {
    ANALISIS = crearAnalisis({
      raiz: $('#analisis'), nota: $('#anNota'), selCohorte: $('#anCohorte'), chkExcluir: $('#anExcluir'), tabs: $('#anTabs'),
      obtener: () => ({ config: S.config, participantes: S.participantes, respuestas: S.respuestas, nomina: S.nomina })
    });
  }
  ANALISIS.pintar();
}

// ---------- 05 Exportar ----------
function opcionesExport() {
  const momentoIds = [...document.querySelectorAll('#exMomentos .chip[aria-pressed="true"]')].map(b => b.dataset.m);
  return { momentoIds, soloEnviados: $('#exEnviados').checked, seudonimizar: $('#exSeud').checked, porEstudiante: $('#exPorEst').checked, incluirFueraCriterio: $('#exFuera').checked, nomina: S.nomina };
}

function pintarExportar() {
  const previos = new Set([...document.querySelectorAll('#exMomentos .chip')].filter(b => b.getAttribute('aria-pressed') === 'false').map(b => b.dataset.m));
  $('#exMomentos').innerHTML = momentosOrdenados(S.config).map(m => `<button type="button" class="chip" data-m="${m.id}" aria-pressed="${!previos.has(m.id)}">${esc(m.nombre)}<small>${m.instrumentos.map(i => INSTRUMENTO[i].sigla).join(' · ')}</small></button>`).join('');
  actualizarCuenta();
}

function actualizarCuenta() {
  const o = opcionesExport();
  const b = construirBases({ config: S.config, participantes: S.participantes, respuestas: S.respuestas, ...o });
  $('#exCuenta').textContent = `${b.recod.length} filas (${o.porEstudiante ? 'una por estudiante' : 'estudiante × sesión'}) · ${b.colsRec.length} columnas recodificadas · ${b.insts.map(i => i.sigla).join(', ') || 'sin instrumentos'}${o.seudonimizar ? ' · seudonimizado' : ''}`;
  document.querySelectorAll('.descarga').forEach(btn => { btn.disabled = !b.recod.length; });
  return b;
}

const sello = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
function descargar(nombre, contenido, tipo) {
  const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function filasParticipantes(seud) {
  return S.participantes.map(p => ({
    ID: idSeudonimo(p.correo),
    ...(seud ? {} : { CORREO: p.correo, NOMBRE: p.nombre, RUT: p.rut }),
    CONSENTIMIENTO: p.consentimiento ? (p.consentimiento.acepta ? 'Sí' : 'No') : 'Sin decisión',
    CONSENTIMIENTO_FECHA: p.consentimiento?.fecha ? String(p.consentimiento.fecha).replace('T', ' ').slice(0, 19) : '',
    CONSENTIMIENTO_VERSION: p.consentimiento?.version || '',
    CI_EXCLUYE_MAYO: p.consentimiento?.acepta ? (p.consentimiento.excluyeMayo ? 'Sí' : 'No') : '',
    ORDEN: S.ordenDe.get(p.correo) ?? '',
    REGISTRO: p.creado ? String(p.creado).replace('T', ' ').slice(0, 19) : ''
  }));
}

function prepararExportar() {
  $('#exMomentos').addEventListener('click', e => {
    const c = e.target.closest('.chip');
    if (!c) return;
    c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
    actualizarCuenta();
  });
  $('#exEnviados').addEventListener('change', actualizarCuenta);
  $('#exSeud').addEventListener('change', actualizarCuenta);
  $('#exPorEst').addEventListener('change', actualizarCuenta);
  $('#exFuera').addEventListener('change', actualizarCuenta);

  $('#dlExcel').addEventListener('click', () => {
    if (!window.XLSX) { toast('No se pudo cargar la librería de Excel (revisa la conexión).', true); return; }
    const o = opcionesExport();
    const b = construirBases({ config: S.config, participantes: S.participantes, respuestas: S.respuestas, ...o });
    const X = window.XLSX;
    const wb = X.utils.book_new();
    const hoja = (filas, cols, nombre) => {
      const ws = X.utils.json_to_sheet(filas.map(f => Object.fromEntries(cols.map(c => [c, f[c] ?? '']))), { header: cols });
      ws['!cols'] = cols.map(c => ({ wch: Math.min(38, Math.max(8, c.length + 2)) }));
      ws['!freeze'] = { xSplit: 1, ySplit: 1 };
      X.utils.book_append_sheet(wb, ws, nombre);
    };
    const rec = aSalida(b.recod, b.colsRec, 'excel');
    hoja(b.cruda, b.colsCruda, 'Cruda');
    hoja(rec, b.colsRec, 'Recodificada');
    const colsP = b.colsRec.filter(c => !/_\d{2}$/.test(c) && !/_(ESTADO|INICIO|ENVIO)$/.test(c));
    hoja(rec, colsP, 'Puntajes');
    const part = filasParticipantes(o.seudonimizar);
    hoja(part, Object.keys(part[0] || { ID: '' }), 'Participantes');
    const libro = libroDeCodigos(b.insts).filter(f => b.colsRec.includes(f.variable));
    hoja(libro, ['variable', 'etiqueta', 'instrumento', 'tipo', 'valores', 'perdido'], 'Libro_de_codigos');
    const notas = [
      ['Nonio · estudio AMA·PERMA · exportación', new Date().toLocaleString('es-CL')],
      ['Momentos', b.momentos.map(m => m.nombre).join(', ')],
      ['Solo enviados', o.soloEnviados ? 'Sí' : 'No'],
      ['Seudonimizado', o.seudonimizar ? 'Sí' : 'No'],
      ['Perdidos', 'Vacío = sin respuesta o "Prefiero no responder" (en la hoja Cruda se ve el texto).'],
      ['Puntajes', 'Promedio simple de los ítems. Vacío si se respondió menos del 75 % de los ítems de la puntuación (protocolo V7.0).'],
      ['Participantes', 'Solo quienes aceptaron el consentimiento aparecen en Cruda/Recodificada.']
    ];
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(notas), 'Notas');
    X.writeFile(wb, `ama-perma_${sello()}.xlsx`, { compression: true });
  });

  $('#dlCsv').addEventListener('click', () => {
    const b = construirBases({ config: S.config, participantes: S.participantes, respuestas: S.respuestas, ...opcionesExport() });
    descargar(`ama-perma_recodificada_${sello()}.csv`, aCSV(aSalida(b.recod, b.colsRec, 'jasp'), b.colsRec), 'text/csv;charset=utf-8');
  });

  $('#dlCruda').addEventListener('click', () => {
    const b = construirBases({ config: S.config, participantes: S.participantes, respuestas: S.respuestas, ...opcionesExport() });
    descargar(`ama-perma_cruda_${sello()}.csv`, aCSV(b.cruda, b.colsCruda), 'text/csv;charset=utf-8');
  });

  $('#dlSpss').addEventListener('click', async () => {
    if (!window.JSZip) { toast('No se pudo cargar la librería ZIP (revisa la conexión).', true); return; }
    const b = construirBases({ config: S.config, participantes: S.participantes, respuestas: S.respuestas, ...opcionesExport() });
    const zip = new window.JSZip();
    zip.file('datos_jasp.csv', aCSV(aSalida(b.recod, b.colsRec, 'jasp'), b.colsRec));
    zip.file('datos_spss.csv', aCSV(aSalida(b.recod, b.colsRec, 'spss'), b.colsRec).replace(/^﻿/, ''));
    zip.file('importar_spss.sps', sintaxisSPSS(b.colsRec));
    const libro = libroDeCodigos(b.insts).filter(f => b.colsRec.includes(f.variable));
    zip.file('libro_de_codigos.csv', aCSV(libro, ['variable', 'etiqueta', 'instrumento', 'tipo', 'valores', 'perdido']));
    zip.file('LEEME.txt', LEEME);
    descargar(`ama-perma_jasp-spss_${sello()}.zip`, await zip.generateAsync({ type: 'blob' }));
  });

  $('#dlLlave').addEventListener('click', () => {
    const filas = S.participantes.map(p => ({ ID: idSeudonimo(p.correo), CORREO: p.correo, NOMBRE: p.nombre, RUT: p.rut }));
    descargar(`ama-perma_llave_${sello()}.csv`, aCSV(filas, ['ID', 'CORREO', 'NOMBRE', 'RUT']), 'text/csv;charset=utf-8');
  });
  $('#dlLibro').addEventListener('click', () => {
    descargar('ama-perma_libro_de_codigos.csv', aCSV(libroDeCodigos(), ['variable', 'etiqueta', 'instrumento', 'tipo', 'valores', 'perdido']), 'text/csv;charset=utf-8');
  });
  $('#dlJson').addEventListener('click', () => {
    descargar(`ama-perma_respaldo_${sello()}.json`, JSON.stringify({ exportado: new Date().toISOString(), config: S.config, participantes: S.participantes, respuestas: S.respuestas }, null, 1), 'application/json');
  });
}

// ---------- Arranque ----------
async function abrirPanel(docente) {
  S.docente = docente;
  $('#puerta').hidden = true;
  $('#shell').hidden = false;
  $('#usuario').textContent = docente.email || '';
  $('#demoTools').hidden = modo !== 'demo';
  await cargar();
  store.suscribir(() => { if (!S.sucio) cargar(); });
}

async function arrancar() {
  $('#nav').addEventListener('click', e => { const b = e.target.closest('button[data-sec]'); if (b) irA(b.dataset.sec); });
  $('#btnRefrescar').addEventListener('click', cargar);
  $('#btnSalirDocente').addEventListener('click', async () => { await store.salirDocente(); location.reload(); });
  $('#btnSembrar').addEventListener('click', async () => { await store.sembrarDemo(150); toast('Datos de ejemplo cargados.'); cargar(); });
  $('#btnVaciar').addEventListener('click', async () => {
    if (!(await confirmar({ titulo: '¿Vaciar la demo?', texto: 'Se borra todo lo guardado en este navegador.', si: 'Vaciar', peligro: true }))) return;
    await store.vaciarDemo(); S.sucio = false; cargar();
  });
  window.addEventListener('beforeunload', e => { if (S.sucio) { e.preventDefault(); e.returnValue = ''; } });
  prepararMomentos();
  prepararNomina();
  prepararParticipantes();
  prepararExportar();
  activarTooltips(document.querySelector('.principal'), $('#tip'));

  if (modo === 'demo') return abrirPanel(await store.restaurarDocente());

  const msg = $('#puertaMsg');
  msg.textContent = 'Comprobando sesión…';
  $('#puerta').hidden = false;
  const previo = await store.restaurarDocente().catch(() => null);
  if (previo) return abrirPanel(previo);
  msg.textContent = '';
  $('#btnGoogle').addEventListener('click', async () => {
    $('#btnGoogle').disabled = true;
    msg.classList.remove('error');
    msg.textContent = 'Abriendo Google…';
    try {
      abrirPanel(await store.entrarDocente());
    } catch (err) {
      msg.textContent = err.message || 'No fue posible iniciar sesión.';
      msg.classList.add('error');
      $('#btnGoogle').disabled = false;
    }
  });
}

arrancar();
