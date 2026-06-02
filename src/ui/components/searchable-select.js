/**
 * @module searchable-select
 * @description Motor de selects con búsqueda (SS engine).
 *   Maneja dropdowns con búsqueda en tiempo real para selección de un solo valor.
 *   Usado en: área, responsable, contratista, actividad — tanto en formulario
 *   desktop como móvil y en filtros de reportes y dashboard.
 *
 *   Convención de IDs en el HTML:
 *     ss-wrap-{id}   → contenedor principal
 *     ss-{id}        → input visible al usuario
 *     ss-drop-{id}   → dropdown con lista
 *     ss-list-{id}   → contenedor de opciones dentro del dropdown
 *     ss-search-{id} → input de búsqueda dentro del dropdown
 *     {id}           → input hidden con el valor seleccionado
 *
 * @dependencies
 *   (ninguna)
 *
 * @exports
 *   - ssLoad(id, lista): void — carga opciones en un select
 *   - ssOpen(id): void — abre el dropdown
 *   - ssBlur(id): void — maneja el blur del input (cierra con delay)
 *   - ssCloseOne(id): void — cierra un dropdown específico
 *   - ssCloseAll(): void — cierra todos los dropdowns abiertos
 *   - ssInputFilter(id, q): void — filtra al escribir en el input visible
 *   - ssFilter(id, q): void — filtra desde el input de búsqueda interno
 *   - ssRenderList(id, q): void — renderiza la lista filtrada
 *   - ssPick(id, val, onPick): void — selecciona un valor
 *   - ssClear(id, onPick): void — limpia la selección
 *   - ssReset(id): void — resetea completamente el select
 *   - ssGetValue(id): string — retorna el valor actualmente seleccionado
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 3)
 *               Lógica de negocio (saveDraft, renderInicio) extraída del componente
 *               y delegada al llamador vía callback onPick
 */

// ─────────────────────────────────────────────
// Estado interno del módulo
// ─────────────────────────────────────────────

/** @type {Object.<string, string[]>} Opciones cargadas por ID de select */
const _SS_DATA = {};

// ─────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────

/**
 * Carga la lista de opciones para un select.
 * Debe llamarse antes de abrir el dropdown.
 *
 * @param {string} id
 * @param {string[]} lista
 */
export function ssLoad(id, lista) {
  _SS_DATA[id] = lista;
}

/**
 * Retorna el valor actualmente seleccionado en un select.
 * @param {string} id
 * @returns {string}
 */
export function ssGetValue(id) {
  return document.getElementById(id)?.value || '';
}

/**
 * Resetea completamente un select: limpia valor, cierra dropdown, quita estilos.
 * @param {string} id
 */
export function ssReset(id) {
  const inp  = document.getElementById('ss-' + id);
  const hid  = document.getElementById(id);
  const wrap = document.getElementById('ss-wrap-' + id);
  if (inp) { inp.value = ''; inp.placeholder = '--Todos--'; }
  if (hid) hid.value = '';
  wrap?.classList.remove('ss-open', 'ss-has-value');
  document.getElementById('ss-drop-' + id)?.classList.remove('open');
}

/**
 * Abre el dropdown de un select.
 * Cierra todos los otros dropdowns abiertos antes de abrir este.
 * @param {string} id
 */
export function ssOpen(id) {
  const drop = document.getElementById('ss-drop-' + id);
  const wrap = document.getElementById('ss-wrap-' + id);
  const inp  = document.getElementById('ss-' + id);
  if (!drop) return;
  ssCloseAll();
  drop.classList.add('open');
  wrap?.classList.add('ss-open');
  const hid = document.getElementById(id);
  if (inp) {
    inp._prevVal   = hid?.value || '';
    inp.value      = '';
    inp.placeholder = 'Buscar…';
  }
  ssRenderList(id, '');
}

/**
 * Maneja el evento blur del input visible.
 * Cierra el dropdown con un delay para permitir que el click en una opción se registre.
 * @param {string} id
 */
export function ssBlur(id) {
  setTimeout(() => {
    const drop = document.getElementById('ss-drop-' + id);
    if (drop?.classList.contains('open')) ssCloseOne(id);
  }, 200);
}

/**
 * Cierra el dropdown de un select específico y restaura el estado visual.
 * @param {string} id
 */
export function ssCloseOne(id) {
  const wrap = document.getElementById('ss-wrap-' + id);
  const drop = document.getElementById('ss-drop-' + id);
  const inp  = document.getElementById('ss-' + id);
  const hid  = document.getElementById(id);
  drop?.classList.remove('open');
  wrap?.classList.remove('ss-open');
  if (inp) { inp.value = hid?.value || ''; inp.placeholder = '--Todos--'; }
}

/**
 * Cierra todos los dropdowns SS abiertos.
 */
export function ssCloseAll() {
  document.querySelectorAll('.ss-wrap.ss-open').forEach(w => {
    const id = w.id?.replace('ss-wrap-', '');
    if (id) ssCloseOne(id);
  });
}

/**
 * Filtra la lista al escribir en el input visible (antes de abrir el dropdown).
 * @param {string} id
 * @param {string} q — texto ingresado
 */
export function ssInputFilter(id, q) {
  const wrap = document.getElementById('ss-wrap-' + id);
  if (!wrap?.classList.contains('ss-open')) ssOpen(id);
  ssRenderList(id, q.toLowerCase().trim());
}

/**
 * Filtra la lista desde el input de búsqueda interno del dropdown.
 * @param {string} id
 * @param {string} q
 */
export function ssFilter(id, q) {
  ssRenderList(id, q.toLowerCase().trim());
}

/**
 * Renderiza la lista de opciones filtradas en el dropdown.
 * Usa DOM real (no innerHTML con datos de usuario) para prevenir XSS.
 *
 * @param {string} id
 * @param {string} q — query de filtro (ya en minúsculas)
 */
export function ssRenderList(id, q) {
  const list = document.getElementById('ss-list-' + id);
  if (!list) return;
  const data     = _SS_DATA[id] || [];
  const filtered = q ? data.filter(o => o.toLowerCase().includes(q)) : data;
  const cur      = document.getElementById(id)?.value;
  const todasLabel = id === 'fil-dash-act' ? 'Todas las actividades' : '--Todos--';

  list.innerHTML = '';

  if (!q) {
    const div = document.createElement('div');
    div.className = 'ss-opt' + (!cur ? ' selected' : '');
    div.textContent = todasLabel;
    div.addEventListener('mousedown', () => ssPick(id, ''));
    list.appendChild(div);
  }

  if (!filtered.length && q) {
    const div = document.createElement('div');
    div.className = 'ss-empty';
    div.textContent = 'Sin resultados';
    list.appendChild(div);
    return;
  }

  filtered.forEach(o => {
    const div = document.createElement('div');
    div.className = 'ss-opt' + (cur === o ? ' selected' : '');
    div.textContent = o;
    div.addEventListener('mousedown', () => ssPick(id, o));
    list.appendChild(div);
  });
}

/**
 * Selecciona un valor en el select.
 * El callback onPick permite al llamador ejecutar lógica de negocio
 * (guardar draft, re-renderizar) sin contaminar este componente.
 *
 * @param {string} id
 * @param {string} val — valor seleccionado ('' para limpiar)
 * @param {Function} [onPick] — callback opcional ejecutado después de seleccionar
 */
export function ssPick(id, val, onPick) {
  const inp  = document.getElementById('ss-' + id);
  const hid  = document.getElementById(id);
  const wrap = document.getElementById('ss-wrap-' + id);
  if (inp) { inp.value = val; inp.placeholder = '--Todos--'; }
  if (hid) hid.value = val;
  wrap?.classList.remove('ss-open');
  wrap?.classList.toggle('ss-has-value', !!val);
  document.getElementById('ss-drop-' + id)?.classList.remove('open');
  if (typeof onPick === 'function') onPick(id, val);
}

/**
 * Limpia la selección de un select.
 * @param {string} id
 * @param {Function} [onPick] — callback opcional
 */
export function ssClear(id, onPick) {
  ssPick(id, '', onPick);
}
