/**
 * @module state
 * @description Única fuente de verdad del estado de la aplicación.
 *   Centraliza la lectura y escritura de datos. Ningún otro módulo
 *   debe llamar a localStorage directamente ni mutar DB o S sin pasar
 *   por los setters de este módulo.
 *
 *   Patrón: Módulo con estado encapsulado y API de acceso controlada.
 *   Durante la Fase 1 expone window.DB, window.S y window.save como
 *   aliases de compatibilidad con el monolito. Estos aliases se eliminan en Fase 6.
 *
 * @dependencies
 *   - ../core/config.js → APP_CONFIG, DB_DEFAULT, PERMS_DEFAULT
 *   - ../services/storage.service.js → storageGet, storageSet
 *
 * @exports
 *   - StateManager.getDB(): DB — estado completo de datos
 *   - StateManager.getSession(): Session — usuario activo y registros
 *   - StateManager.save(): void — persiste DB en localStorage
 *   - StateManager.reset(): void — restaura DB a valores por defecto
 *   - StateManager.setUsuario(u): void — establece el usuario activo
 *   - StateManager.clearUsuario(): void — limpia el usuario activo
 *   - StateManager.addRegistro(reg): void — añade un registro al array
 *   - StateManager.setRegistros(regs): void — reemplaza el array completo
 *   - StateManager.updateMaestro(tipo, data): void — actualiza un maestro
 *
 * @changelog
 *   - 2025-06-01 · Creación inicial (Fase 1)
 *   - TODO Fase 6: eliminar aliases window.DB, window.S, window.save
 */

import { APP_CONFIG, DB_DEFAULT, PERMS_DEFAULT } from '../core/config.js';
import { storageGet, storageSet } from '../services/storage.service.js';

// ─────────────────────────────────────────────
// Estado interno (privado)
// ─────────────────────────────────────────────

/**
 * Inicializa la base de datos desde localStorage o usa los valores por defecto.
 * @returns {Object}
 */
function _initDB() {
  const stored = storageGet(APP_CONFIG.DB_KEY);
  if (stored) return stored;
  // Deep clone de DB_DEFAULT para no mutar la constante
  return JSON.parse(JSON.stringify(DB_DEFAULT));
}

/**
 * Estado de datos persistibles (maestros + usuarios).
 * No exponer directamente: usar StateManager.getDB()
 * @type {Object}
 */
let _db = _initDB();

/**
 * Estado de sesión (no persistible en localStorage).
 * Se reconstruye en cada carga de página.
 * @type {Object}
 */
let _session = {
  /** @type {Object|null} Usuario autenticado actualmente */
  usuario:      null,

  /** @type {Object[]} Registros cargados en memoria (no se persisten aquí, viven en Sheets) */
  registros:    [],

  /** @type {number[]} Lotes seleccionados en formulario desktop */
  lotes:        [],

  /** @type {Object} Mapa de lotes por módulo { modulo: [loteNums] } */
  lotesMap:     {},

  /** @type {string|null} ID de usuario en edición */
  editUserId:   null,

  /** @type {number|null} Índice de cultivo en edición */
  editCultivoIdx: null,

  /** @type {Function|null} Callback del modal de confirmación */
  confirmCb:    null,

  /** @type {string} Segmento activo en dashboard ('hoy' | custom) */
  seg:          'hoy',
};

// ─────────────────────────────────────────────
// API pública del StateManager
// ─────────────────────────────────────────────

export const StateManager = Object.freeze({

  // ── Accesores de solo lectura ──

  /**
   * Retorna el estado completo de datos.
   * IMPORTANTE: es una referencia, no una copia. No mutar directamente.
   * @returns {Object}
   */
  getDB() {
    return _db;
  },

  /**
   * Retorna el estado de sesión.
   * @returns {Object}
   */
  getSession() {
    return _session;
  },

  // ── Persistencia ──

  /**
   * Persiste el estado actual de _db en localStorage.
   * Es la ÚNICA función que debe llamar a localStorage.setItem para datos de app.
   */
  save() {
    const success = storageSet(APP_CONFIG.DB_KEY, _db);
    if (!success) {
      console.error('[StateManager] Error al persistir DB. localStorage puede estar lleno.');
    }
  },

  /**
   * Restaura la base de datos a los valores por defecto.
   * Persiste inmediatamente.
   */
  reset() {
    _db = JSON.parse(JSON.stringify(DB_DEFAULT));
    this.save();
  },

  // ── Sesión de usuario ──

  /**
   * Establece el usuario activo en sesión.
   * @param {Object} usuario — objeto de usuario de DB.usuarios
   */
  setUsuario(usuario) {
    _session.usuario = usuario;
  },

  /**
   * Limpia el usuario activo y el estado de sesión.
   */
  clearUsuario() {
    _session.usuario    = null;
    _session.registros  = [];
    _session.lotes      = [];
    _session.lotesMap   = {};
    _session.editUserId = null;
    _session.confirmCb  = null;
  },

  // ── Registros ──

  /**
   * Añade un registro al array en memoria.
   * NO persiste automáticamente: el registro vive en Sheets como fuente de verdad.
   * @param {Object} registro
   */
  addRegistro(registro) {
    _session.registros.push(registro);
  },

  /**
   * Reemplaza el array de registros completo.
   * Usar al cargar desde Sheets.
   * @param {Object[]} registros
   */
  setRegistros(registros) {
    _session.registros = Array.isArray(registros) ? registros : [];
  },

  /**
   * Elimina un registro por índice.
   * @param {number} idx
   */
  removeRegistro(idx) {
    _session.registros.splice(idx, 1);
  },

  /**
   * Reemplaza el array de registros filtrando los índices indicados.
   * @param {Set<number>} indices — conjunto de índices a eliminar
   */
  removeRegistros(indices) {
    _session.registros = _session.registros.filter((_, i) => !indices.has(i));
  },

  // ── Maestros ──

  /**
   * Reemplaza un maestro completo.
   * @param {'areas'|'responsables'|'cultivos'|'actividades'|'contratas'} tipo
   * @param {any[]} data — array con los nuevos datos
   */
  updateMaestro(tipo, data) {
    if (!_db.maestros) _db.maestros = {};
    _db.maestros[tipo] = data;
    this.save();
  },

  /**
   * Reemplaza el array de usuarios.
   * @param {Object[]} usuarios
   */
  setUsuarios(usuarios) {
    _db.usuarios = usuarios;
    this.save();
  },
});

// ─────────────────────────────────────────────
// Aliases de compatibilidad con el monolito
// TODO Fase 6: eliminar todo este bloque
// ─────────────────────────────────────────────

/**
 * Proxy que hace que window.DB y window.S sigan funcionando en el monolito
 * durante la migración. Cualquier lectura/escritura se redirige a StateManager.
 *
 * Los alias son necesarios porque el monolito usa `DB.maestros.areas`, `S.registros`,
 * etc. directamente. Al usar Proxies, los cambios en DB/S se propagan al estado
 * centralizado sin necesidad de modificar cada función del monolito en esta fase.
 */

// Exponer DB y S como referencias directas al estado interno (Proxy no necesario
// en Fase 1 porque state.js aún no se importa en el monolito).
// Cuando en Fase 2 se importe state.js en el monolito, estos aliases entrarán en uso.

// FASE 6: window.S, window.DB y window.save son definidos por el monolito (index.html).
// Eliminar estas definiciones evita el conflicto donde window.S retornaba el objeto
// interno de StateManager en lugar del S real del monolito.
// Los módulos ES leen window.S directamente y obtienen los datos correctos.
