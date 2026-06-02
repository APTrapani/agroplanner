/**
 * @module utils
 * @description Funciones utilitarias puras. No tienen estado interno ni efectos
 *   secundarios. Pueden ser importadas por cualquier módulo sin riesgo de
 *   crear dependencias circulares.
 *
 * @dependencies
 *   (ninguna)
 *
 * @exports
 *   - isoHoy(): string — fecha actual en formato YYYY-MM-DD
 *   - horaAhora(): string — hora actual en formato HH:MM
 *   - fechaLarga(): string — fecha en formato largo localizado (es-PE)
 *   - fechaCorta(iso: string): string — convierte YYYY-MM-DD a DD/MM/YYYY
 *   - initials(nombre: string): string — extrae iniciales de un nombre
 *   - limpiarFecha(val: any): string — normaliza formatos de fecha de Google Sheets
 *   - limpiarHora(val: any): string — normaliza formatos de hora de Google Sheets
 *   - parseGoogleFecha(v: any): string — parsea formato Date() de gviz
 *   - parseGoogleHora(v: any): string — parsea formato Date() de gviz para horas
 *   - sanitizeHTML(str: string): string — escapa HTML para prevenir XSS
 *   - debounce(fn: Function, ms: number): Function — limita frecuencia de ejecución
 *
 * @changelog
 *   - 2025-06-01 · Creación inicial, extraído de monolito (Fase 1)
 */

// ─────────────────────────────────────────────
// Fechas y horas
// ─────────────────────────────────────────────

/**
 * Retorna la fecha actual en formato ISO YYYY-MM-DD.
 * @returns {string}
 */
export function isoHoy() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Retorna la hora actual en formato HH:MM.
 * @returns {string}
 */
export function horaAhora() {
  return new Date().toTimeString().slice(0, 5);
}

/**
 * Retorna la fecha actual en formato largo localizado para Perú.
 * Ejemplo: "lunes, 01 de junio de 2025"
 * @returns {string}
 */
export function fechaLarga() {
  return new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day:     '2-digit',
    month:   'long',
    year:    'numeric',
  });
}

/**
 * Convierte una fecha ISO (YYYY-MM-DD) a formato corto (DD/MM/YYYY).
 * @param {string} iso
 * @returns {string}
 */
export function fechaCorta(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─────────────────────────────────────────────
// Normalización de datos de Google Sheets
// ─────────────────────────────────────────────

/**
 * Normaliza cualquier representación de fecha que devuelve Google Sheets
 * a formato ISO YYYY-MM-DD.
 *
 * Soporta:
 *   - DD/MM/YYYY
 *   - DD-MM-YYYY
 *   - YYYY-MM-DD (pasa sin cambios)
 *   - ISO datetime string (extrae parte UTC)
 *   - Número serial de Excel (días desde 1899-12-30)
 *
 * @param {any} val
 * @returns {string}
 */
export function limpiarFecha(val) {
  if (!val) return '';
  const s = String(val).trim();

  // DD/MM/YYYY
  const dmY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmY) return `${dmY[3]}-${dmY[2].padStart(2, '0')}-${dmY[1].padStart(2, '0')}`;

  // DD-MM-YYYY
  const dmYd = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmYd) return `${dmYd[3]}-${dmYd[2].padStart(2, '0')}-${dmYd[1].padStart(2, '0')}`;

  // YYYY-MM-DD ya correcto
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;

  // ISO datetime → extraer fecha UTC
  if (s.match(/^\d{4}-\d{2}-\d{2}T/)) {
    const d = new Date(s);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Número serial Excel (días desde 1899-12-30)
  const n = parseFloat(s);
  if (!isNaN(n) && n > 40000) {
    const d = new Date((n - 25569) * 86400 * 1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  return s.slice(0, 10);
}

/**
 * Normaliza cualquier representación de hora que devuelve Google Sheets
 * a formato HH:MM.
 *
 * Soporta:
 *   - ISO datetime con base 1899-12-30 (formato interno de Sheets para horas)
 *   - ISO datetime genérico
 *   - Fracción decimal del día (0.5 = 12:00)
 *   - HH:MM ya formateado
 *
 * @param {any} val
 * @returns {string}
 */
export function limpiarHora(val) {
  if (!val) return '';
  const s = String(val);

  // ISO datetime con base 1899-12-30
  if (s.match(/^1899-12-30T\d{2}:\d{2}/)) {
    return s.slice(11, 16);
  }

  // ISO datetime genérico
  if (s.match(/T\d{2}:\d{2}/)) {
    const match = s.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : '';
  }

  // Fracción decimal del día
  if (s.match(/^0\.\d+$/)) {
    const totalMin = Math.round(parseFloat(s) * 1440);
    const h = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const m = String(totalMin % 60).padStart(2, '0');
    return `${h}:${m}`;
  }

  // Ya es HH:MM
  if (s.match(/^\d{1,2}:\d{2}/)) return s.slice(0, 5);

  return s;
}

/**
 * Parsea el formato Date(yyyy,mm,dd) que devuelve la API gviz de Google Sheets.
 * El mes en este formato es 0-based (enero = 0).
 *
 * @param {any} v
 * @returns {string} formato YYYY-MM-DD
 */
export function parseGoogleFecha(v) {
  if (!v && v !== 0) return '';
  const s = String(v);
  const m = s.match(/^Date\((\d+),(\d+),(\d+)/);
  if (m) {
    const y  = parseInt(m[1]);
    const mo = parseInt(m[2]) + 1;
    const d  = parseInt(m[3]);
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

/**
 * Parsea el formato Date(1899,11,30,HH,MM,SS) que usa gviz para representar horas.
 *
 * @param {any} v
 * @returns {string} formato HH:MM
 */
export function parseGoogleHora(v) {
  if (!v && v !== 0) return '';
  const s = String(v);
  const m = s.match(/^Date\(\d+,\d+,\d+,(\d+),(\d+)/);
  if (m) {
    return `${String(parseInt(m[1])).padStart(2, '0')}:${String(parseInt(m[2])).padStart(2, '0')}`;
  }
  if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5);
  return s;
}

// ─────────────────────────────────────────────
// Strings
// ─────────────────────────────────────────────

/**
 * Extrae las iniciales de un nombre (máximo 2 palabras).
 * @param {string} nombre
 * @returns {string} Ej: "Pedro Mamani" → "PM"
 */
export function initials(nombre) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Escapa caracteres HTML especiales para prevenir inyección XSS.
 * Usar siempre que se inserte contenido de usuario en el DOM via innerHTML.
 *
 * @param {string} str - Texto a escapar
 * @returns {string}
 *
 * @example
 * element.innerHTML = sanitizeHTML(userInput); // seguro
 * element.textContent = userInput;             // también seguro (preferido)
 */
export function sanitizeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─────────────────────────────────────────────
// Control de rendimiento
// ─────────────────────────────────────────────

/**
 * Limita la frecuencia de ejecución de una función.
 * Útil para eventos que disparan re-renders (input, resize, scroll).
 *
 * @param {Function} fn - Función a debouncear
 * @param {number} ms - Milisegundos de espera
 * @returns {Function}
 *
 * @example
 * const debouncedRender = debounce(renderInicio, 150);
 * input.addEventListener('input', debouncedRender);
 */
export function debounce(fn, ms) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
