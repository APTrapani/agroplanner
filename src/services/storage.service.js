/**
 * @module storage.service
 * @description Abstracción de localStorage con seguridad mejorada.
 *   - Hash SHA-256 de contraseñas via Web Crypto API (nativo, sin dependencias)
 *   - Lectura/escritura tipada con manejo de errores explícito
 *   - Compatibilidad legacy para migración gradual de contraseñas en texto plano
 *
 *   NOTA DE SEGURIDAD: SHA-256 del lado del cliente no es equivalente a bcrypt
 *   en un servidor. Para esta aplicación (intranet GitHub Pages sin backend de
 *   autenticación), proporciona protección contra lectura directa de localStorage
 *   y exportación accidental de contraseñas en texto plano.
 *
 * @dependencies
 *   (ninguna)
 *
 * @exports
 *   - hashPassword(plain: string): Promise<string> — SHA-256 hex de la contraseña
 *   - verifyPassword(plain: string, hash: string): Promise<boolean> — comparación segura
 *   - storageGet(key: string): any | null — lectura con parse JSON
 *   - storageSet(key: string, value: any): boolean — escritura con stringify
 *   - storageRemove(key: string): void — eliminación de clave
 *
 * @changelog
 *   - 2025-06-01 · Creación inicial (Fase 1) — reemplaza acceso directo a localStorage
 */

// ─────────────────────────────────────────────
// Hash de contraseñas
// ─────────────────────────────────────────────

/**
 * Genera un hash SHA-256 de una contraseña en texto plano.
 * Utiliza la Web Crypto API nativa del navegador (disponible en todos los
 * navegadores modernos y en contextos HTTPS/localhost).
 *
 * @param {string} plain - Contraseña en texto plano
 * @returns {Promise<string>} Hash en formato hexadecimal (64 caracteres)
 */
export async function hashPassword(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifica una contraseña en texto plano contra un hash SHA-256.
 *
 * Incluye modo de compatibilidad legacy para la migración: si el hash almacenado
 * tiene menos de 60 caracteres, se asume que es una contraseña en texto plano
 * (formato anterior al hash) y se compara directamente. Este comportamiento se
 * elimina en la Fase 6 de la migración.
 *
 * @param {string} plain - Contraseña ingresada por el usuario
 * @param {string} stored - Valor almacenado (puede ser hash o texto plano legacy)
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(plain, stored) {
  if (!plain || !stored) return false;

  // Modo legacy: contraseña en texto plano (longitud < 64 indica que no es un hash SHA-256)
  // TODO Fase 6: eliminar este bloque de compatibilidad
  if (stored.length < 64) {
    return plain === stored;
  }

  // Comparación normal contra hash SHA-256
  const hashIngresado = await hashPassword(plain);
  return hashIngresado === stored;
}

// ─────────────────────────────────────────────
// Abstracción de localStorage
// ─────────────────────────────────────────────

/**
 * Lee un valor de localStorage y lo parsea como JSON.
 *
 * @param {string} key
 * @returns {any | null} El valor parseado, o null si no existe o hay error
 */
export function storageGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch {
    // localStorage no disponible (modo privado muy restrictivo) o JSON malformado
    return null;
  }
}

/**
 * Escribe un valor en localStorage como JSON serializado.
 *
 * @param {string} key
 * @param {any} value
 * @returns {boolean} true si se guardó correctamente, false si hubo error
 */
export function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Puede fallar si localStorage está lleno (QuotaExceededError)
    return false;
  }
}

/**
 * Elimina una clave de localStorage.
 *
 * @param {string} key
 */
export function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Sin acción: si no se puede eliminar, se acepta el estado
  }
}
