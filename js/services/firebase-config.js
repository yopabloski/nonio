// Nonio · configuración Firebase del cliente.
//
// Pegue aquí la configuración web del proyecto Firebase NUEVO y dedicado
// (Consola Firebase → Configuración del proyecto → Tus apps → SDK config).
// Mientras apiKey esté vacío la app funciona en MODO DEMO: todo se guarda en
// localStorage de este navegador y el panel docente se abre sin login.
//
// Estos valores no son secretos: viajan al navegador por diseño. La protección
// real está en firestore.rules y en los dominios autorizados de Authentication.

export const firebaseConfig = {
  apiKey: 'AIzaSyD-nTKSVysxgd7EywZ-jazm48JFcERG09Y',
  authDomain: 'nonio-udd-pgb.firebaseapp.com',
  projectId: 'nonio-udd-pgb',
  appId: '1:955385819572:web:de1c4c399e8a327cec82e1'
};

if (typeof window !== 'undefined' && window.__AMA_FIREBASE__) {
  Object.assign(firebaseConfig, window.__AMA_FIREBASE__);
}

export const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';

export const enabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// ?emu=1 activa los emuladores locales (auth 9099, firestore 8080).
export const useEmulators = (() => {
  if (typeof window === 'undefined') return false;
  const p = new URLSearchParams(window.location.search).get('emu');
  try {
    if (p === '1') localStorage.setItem('ama:emu', '1');
    if (p === '0') localStorage.removeItem('ama:emu');
    return localStorage.getItem('ama:emu') === '1';
  } catch { return p === '1'; }
})();

export const emulatorPorts = { auth: 9099, firestore: 8080 };

export const paths = {
  config: 'amaConfig',          // amaConfig/estudio: pública (sin datos personales ni códigos)
  privado: 'amaPrivado',        // amaPrivado/codigos: códigos vigentes por momento (solo docentes)
  codigos: 'amaCodigos',        // amaCodigos/{CODIGO} → { momentoId } (get público, sin list)
  admins: 'amaAdmins',          // amaAdmins/{uid}: padrón docente (solo Admin SDK / consola)
  participantes: 'amaParticipantes', // amaParticipantes/{correo}
  nomina: 'amaNomina',          // amaNomina/{correo} → { orden: 1|2, origen } (diseño contrabalanceado)
  aleatorizaciones: 'amaAleatorizaciones', // registro de cada aleatorización (solo docentes)
  respuestas: 'respuestas'      // amaParticipantes/{correo}/respuestas/{momentoId__instrumentoId}
};
