/**
 * @module toast
 * @description Componente de notificaciones temporales y estado de sincronización.
 *   Maneja los mensajes toast (ok, err, neutro) y el indicador de estado
 *   de conexión con Sheets en el topbar.
 *
 * @dependencies
 *   (ninguna)
 *
 * @exports
 *   - toast(msg, tipo): void — muestra notificación temporal
 *   - sync(estado, txt): void — actualiza indicador de sincronización
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 3)
 */

// ─────────────────────────────────────────────
// Estado interno
// ─────────────────────────────────────────────

/** @type {number|null} Timer del toast activo */
let _toastTimer = null;

// ─────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────

/**
 * Muestra una notificación temporal en pantalla.
 *
 * @param {string} msg — texto del mensaje
 * @param {'ok'|'err'|''} tipo — tipo de notificación (verde, rojo, neutro)
 *
 * @example
 * toast('Registro guardado', 'ok');
 * toast('Error al conectar', 'err');
 * toast('Sincronizando…');
 */
export function toast(msg, tipo = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className   = tipo ? `show ${tipo}` : 'show';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 2800);
}

/**
 * Actualiza el indicador de estado de sincronización en el topbar.
 *
 * @param {'ok'|'err'|'load'} estado
 * @param {string} txt — texto descriptivo del estado
 *
 * @example
 * sync('load', 'sincronizando…');
 * sync('ok',   'en línea');
 * sync('err',  'error de carga');
 */
export function sync(estado, txt) {
  const dot   = document.getElementById('sdot');
  const label = document.getElementById('stxt');
  if (dot)   dot.className    = `sdot ${estado}`;
  if (label) label.textContent = txt;
}
