/**
 * @module audit.service
 * @description Sistema centralizado de auditoría. Registra acciones de usuario,
 *   errores del sistema y eventos relevantes con marca de tiempo y contexto.
 *
 *   Los registros se almacenan en localStorage bajo la clave `agro_audit_log`
 *   como un array de entradas JSON, con rotación automática al superar el límite
 *   definido en APP_CONFIG.AUDIT_MAX_ENTRIES.
 *
 *   Este módulo NO lanza excepciones: si el logging falla, lo registra en consola
 *   y continúa. La auditoría nunca debe interrumpir el flujo de la aplicación.
 *
 * @dependencies
 *   - ../core/config.js → APP_CONFIG
 *   - ../services/storage.service.js → storageGet, storageSet
 *
 * @exports
 *   - AuditService.log(action, details): void — registra una acción de usuario
 *   - AuditService.logError(context, error): void — registra un error del sistema
 *   - AuditService.logAuth(event, usuario): void — registra eventos de autenticación
 *   - AuditService.getLogs(): AuditEntry[] — retorna todas las entradas
 *   - AuditService.exportLogs(): string — retorna logs como JSON exportable
 *   - AuditService.clearLogs(): void — elimina el log (solo admin)
 *
 * @typedef {Object} AuditEntry
 *   @property {string} id — identificador único
 *   @property {string} timestamp — ISO 8601
 *   @property {'action'|'error'|'auth'} type — tipo de entrada
 *   @property {string} action — nombre de la acción
 *   @property {string} [usuario] — nombre del usuario que realizó la acción
 *   @property {string} [rol] — rol del usuario
 *   @property {Object} [details] — datos adicionales del contexto
 *   @property {string} [errorMessage] — mensaje de error (solo type='error')
 *   @property {string} [errorStack] — stack trace (solo type='error', entorno dev)
 *
 * @changelog
 *   - 2025-06-01 · Creación inicial (Fase 1)
 */

import { APP_CONFIG } from '../core/config.js';
import { storageGet, storageSet } from '../services/storage.service.js';

// ─────────────────────────────────────────────
// Estado interno del módulo
// ─────────────────────────────────────────────

/** @type {AuditEntry[]} Cache en memoria para evitar lecturas repetidas */
let _logCache = null;

// ─────────────────────────────────────────────
// Helpers privados
// ─────────────────────────────────────────────

/**
 * Genera un ID único para cada entrada de auditoría.
 * @returns {string}
 */
function _generateId() {
  return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Carga el log desde localStorage al cache en memoria.
 * @returns {AuditEntry[]}
 */
function _loadLog() {
  if (_logCache !== null) return _logCache;
  const stored = storageGet(APP_CONFIG.AUDIT_KEY);
  _logCache = Array.isArray(stored) ? stored : [];
  return _logCache;
}

/**
 * Persiste el log en localStorage con rotación automática.
 * Si el número de entradas supera AUDIT_MAX_ENTRIES, elimina las más antiguas.
 */
function _persistLog() {
  const log = _loadLog();

  // Rotación: mantener solo las entradas más recientes
  if (log.length > APP_CONFIG.AUDIT_MAX_ENTRIES) {
    _logCache = log.slice(log.length - APP_CONFIG.AUDIT_MAX_ENTRIES);
  }

  const success = storageSet(APP_CONFIG.AUDIT_KEY, _logCache);
  if (!success) {
    console.warn('[AuditService] No se pudo persistir el log de auditoría.');
  }
}

/**
 * Obtiene el contexto del usuario activo desde la sesión en sessionStorage.
 * No importa state.js para evitar dependencia circular.
 * @returns {{ usuario: string, rol: string }}
 */
function _getUserContext() {
  try {
    const session = JSON.parse(sessionStorage.getItem('agro_session') || '{}');
    return {
      usuario: session.usuario || 'sistema',
      rol:     session.rol     || 'desconocido',
    };
  } catch {
    return { usuario: 'sistema', rol: 'desconocido' };
  }
}

// ─────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────

export const AuditService = Object.freeze({

  /**
   * Registra una acción relevante del usuario.
   * Usar para: crear, editar, eliminar registros/maestros, exportar, sincronizar.
   *
   * @param {string} action — nombre descriptivo de la acción (ej: 'registro.crear')
   * @param {Object} [details] — datos adicionales (ids, campos modificados, etc.)
   *
   * @example
   * AuditService.log('registro.crear', { area: 'Fundo Norte', nPersonas: 12 });
   * AuditService.log('maestro.actividades.eliminar', { idx: 3, nombre: 'Cosecha' });
   */
  log(action, details = {}) {
    try {
      const ctx = _getUserContext();
      const entry = {
        id:        _generateId(),
        timestamp: new Date().toISOString(),
        type:      'action',
        action,
        usuario:   ctx.usuario,
        rol:       ctx.rol,
        details,
      };
      _loadLog().push(entry);
      _persistLog();
    } catch (e) {
      console.error('[AuditService] Error al registrar acción:', e);
    }
  },

  /**
   * Registra un error del sistema.
   * Usar en bloques catch que no deben quedar silenciosos.
   *
   * @param {string} context — dónde ocurrió el error (ej: 'sheets.service.enviarASheets')
   * @param {Error|any} error — el error capturado
   *
   * @example
   * try {
   *   await enviarASheets(reg);
   * } catch (e) {
   *   AuditService.logError('sheets.enviarASheets', e);
   *   throw e; // re-lanzar si el llamador necesita manejarlo
   * }
   */
  logError(context, error) {
    try {
      const ctx = _getUserContext();
      const entry = {
        id:           _generateId(),
        timestamp:    new Date().toISOString(),
        type:         'error',
        action:       `error.${context}`,
        usuario:      ctx.usuario,
        rol:          ctx.rol,
        errorMessage: error?.message || String(error),
        // Stack solo en desarrollo (no exponer en producción)
        errorStack:   (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
                        ? error?.stack
                        : undefined,
        details:      { context },
      };
      _loadLog().push(entry);
      _persistLog();
      // También log en consola para facilitar depuración
      console.error(`[AuditService] Error en ${context}:`, error);
    } catch (e) {
      console.error('[AuditService] Error al registrar error:', e);
    }
  },

  /**
   * Registra eventos de autenticación: login, logout, sesión restaurada, acceso denegado.
   *
   * @param {'login.ok'|'login.fail'|'logout'|'session.restored'|'access.denied'} event
   * @param {string} usuario — nombre de usuario involucrado
   * @param {Object} [details] — detalles adicionales
   *
   * @example
   * AuditService.logAuth('login.ok', 'pedro');
   * AuditService.logAuth('login.fail', 'pedro', { source: 'local' });
   */
  logAuth(event, usuario, details = {}) {
    try {
      const entry = {
        id:        _generateId(),
        timestamp: new Date().toISOString(),
        type:      'auth',
        action:    `auth.${event}`,
        usuario,
        rol:       details.rol || 'desconocido',
        details,
      };
      _loadLog().push(entry);
      _persistLog();
    } catch (e) {
      console.error('[AuditService] Error al registrar evento de auth:', e);
    }
  },

  /**
   * Retorna todas las entradas del log de auditoría.
   * @returns {AuditEntry[]} Copia del array (no expone la referencia interna)
   */
  getLogs() {
    return [..._loadLog()];
  },

  /**
   * Retorna el log completo como string JSON formateado para exportación.
   * @returns {string}
   */
  exportLogs() {
    return JSON.stringify(_loadLog(), null, 2);
  },

  /**
   * Elimina todas las entradas del log.
   * Solo debe ser llamado por el administrador. La responsabilidad de verificar
   * el rol recae en el módulo llamador.
   */
  clearLogs() {
    _logCache = [];
    storageSet(APP_CONFIG.AUDIT_KEY, []);
    console.info('[AuditService] Log de auditoría limpiado.');
  },
});
