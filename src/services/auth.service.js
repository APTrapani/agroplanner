/**
 * @module auth.service
 * @description Gestión de autenticación, sesión y permisos de usuario.
 *   Centraliza toda la lógica de login, logout, restauración de sesión
 *   y aplicación de permisos en la UI.
 *
 *   Durante la Fase 2, este módulo coexiste con las funciones del monolito.
 *   Las funciones `doLogin`, `doLogout`, `aplicarPermisos` del monolito
 *   se reemplazarán por las de este módulo en la Fase 5.
 *
 * @dependencies
 *   - ../core/config.js     → APP_CONFIG
 *   - ../core/utils.js      → fechaLarga, initials
 *   - ../services/storage.service.js → verifyPassword, hashPassword
 *   - ../audit/audit.service.js      → AuditService
 *
 * @exports
 *   - AuthService.login(usuario, password): Promise<AuthResult>
 *   - AuthService.logout(): void
 *   - AuthService.restoreSession(): AuthResult | null
 *   - AuthService.applyPermissions(usuario): void
 *   - AuthService.migratePasswords(usuarios): Promise<boolean>
 *
 * @typedef {Object} AuthResult
 *   @property {boolean} ok
 *   @property {Object}  [usuario] — objeto de usuario si ok=true
 *   @property {string}  [message] — mensaje de error si ok=false
 *   @property {string}  [source]  — 'local' | 'sheets'
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 2)
 */

import { APP_CONFIG } from '../core/config.js';
import { fechaLarga, initials } from '../core/utils.js';
import { verifyPassword, hashPassword } from './storage.service.js';
import { AuditService } from '../audit/audit.service.js';

// ─────────────────────────────────────────────
// Helpers privados
// ─────────────────────────────────────────────

/**
 * Carga usuarios desde Google Sheets para sincronizar antes del login.
 * Si falla (sin conexión), retorna null silenciosamente.
 * @param {string} appsScriptUrl
 * @returns {Promise<Object[]|null>}
 */
async function _fetchUsersFromSheets(appsScriptUrl) {
  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 10000);
    const res  = await fetch(`${appsScriptUrl}?accion=leer&sheet=Maestro_Usuarios`, { signal: ctrl.signal });
    clearTimeout(tid);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 'ok' || !json.datos?.length > 1) return null;
    return json.datos.slice(1).map(r => ({
      id:         String(r[0] || ''),
      nombre:     String(r[1] || ''),
      usuario:    String(r[2] || ''),
      password:   String(r[3] || ''),
      rol:        String(r[4] || 'supervisor'),
      estado:     String(r[5] || 'Activo'),
      perms:      (() => { try { return JSON.parse(r[6] || '{}'); } catch { return { inicio: true, nuevo: true, reportes: true, exportar: false }; } })(),
      lastAccess: String(r[7] || ''),
    })).filter(u => u.usuario);
  } catch {
    return null;
  }
}

/**
 * Persiste la sesión en sessionStorage.
 * @param {Object} usuario
 */
function _saveSession(usuario) {
  sessionStorage.setItem(APP_CONFIG.SESSION_KEY || 'agro_session', JSON.stringify({
    id:      usuario.id,
    usuario: usuario.usuario,
  }));
}

/**
 * Actualiza los elementos del topbar con los datos del usuario activo.
 * @param {Object} usuario
 */
function _renderTopbar(usuario) {
  const el = id => document.getElementById(id);
  const topbarDate = el('topbar-date');
  const topbarName = el('topbar-name');
  const topbarRole = el('topbar-role');
  const topbarAv   = el('topbar-av');
  if (topbarDate) topbarDate.textContent = fechaLarga();
  if (topbarName) topbarName.textContent = usuario.nombre;
  if (topbarRole) topbarRole.textContent = usuario.rol;
  if (topbarAv)   topbarAv.textContent   = initials(usuario.nombre);
}

// ─────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────

export const AuthService = Object.freeze({

  /**
   * Intenta autenticar al usuario.
   * Primero sincroniza la lista de usuarios desde Sheets (si hay conexión),
   * luego verifica las credenciales contra la base de datos local.
   *
   * @param {string} usuarioInput — nombre de usuario ingresado
   * @param {string} passwordInput — contraseña ingresada
   * @param {Object[]} usuarios — array de usuarios de DB.usuarios
   * @param {string} appsScriptUrl — URL del Apps Script
   * @returns {Promise<AuthResult>}
   */
  async login(usuarioInput, passwordInput, usuarios, appsScriptUrl) {
    let source = 'local';

    // Intentar sincronizar usuarios desde Sheets
    const sheetsUsers = await _fetchUsersFromSheets(appsScriptUrl);
    if (sheetsUsers?.length) {
      // Actualizar array en memoria (el llamador persiste con save())
      usuarios.splice(0, usuarios.length, ...sheetsUsers);
      source = 'sheets';
    }

    // Verificar credenciales
    let found = null;
    for (const u of usuarios) {
      if (u.usuario === usuarioInput && (u.estado || 'Activo') === 'Activo') {
        const match = await verifyPassword(passwordInput, u.password);
        if (match) { found = u; break; }
      }
    }

    if (!found) {
      AuditService.logAuth('login.fail', usuarioInput, { source });
      return {
        ok:      false,
        message: source === 'local'
          ? 'Sin conexión o credenciales incorrectas. Verifica tu red e intenta de nuevo.'
          : 'Usuario o contraseña incorrectos.',
        source,
      };
    }

    // Registrar último acceso
    found.lastAccess = new Date().toISOString();

    // Persistir sesión en sessionStorage
    _saveSession(found);

    // Actualizar topbar
    _renderTopbar(found);

    AuditService.logAuth('login.ok', found.usuario, { rol: found.rol, source });

    return { ok: true, usuario: found, source };
  },

  /**
   * Cierra la sesión del usuario activo.
   * Limpia sessionStorage y oculta la app.
   */
  logout() {
    const sessionKey = APP_CONFIG.SESSION_KEY || 'agro_session';
    let usuario = 'desconocido';
    try {
      const sess = JSON.parse(sessionStorage.getItem(sessionKey) || '{}');
      usuario = sess.usuario || 'desconocido';
    } catch { /* sin sesión activa */ }

    sessionStorage.removeItem(sessionKey);
    AuditService.logAuth('logout', usuario);

    const app         = document.getElementById('app');
    const loginScreen = document.getElementById('login-screen');
    const inpUser     = document.getElementById('inp-user');
    const inpPass     = document.getElementById('inp-pass');

    if (app)         app.style.display         = 'none';
    if (loginScreen) loginScreen.style.display = 'flex';
    if (inpUser)     inpUser.value             = '';
    if (inpPass)     inpPass.value             = '';
  },

  /**
   * Intenta restaurar la sesión desde sessionStorage.
   * Retorna el usuario encontrado o null si no hay sesión válida.
   *
   * @param {Object[]} usuarios — array de usuarios de DB.usuarios
   * @returns {{ usuario: Object } | null}
   */
  restoreSession(usuarios) {
    const sessionKey = APP_CONFIG.SESSION_KEY || 'agro_session';
    try {
      const saved = sessionStorage.getItem(sessionKey);
      if (!saved) return null;
      const sess  = JSON.parse(saved);
      const found = usuarios.find(u =>
        u.id === sess.id &&
        u.usuario === sess.usuario &&
        (u.estado || 'Activo') === 'Activo'
      );
      if (!found) return null;
      _renderTopbar(found);
      AuditService.logAuth('session.restored', found.usuario, { rol: found.rol });
      return { usuario: found };
    } catch {
      return null;
    }
  },

  /**
   * Aplica permisos de UI según el rol y permisos del usuario.
   * Muestra u oculta elementos del sidebar y navegación.
   *
   * @param {Object} usuario
   */
  applyPermissions(usuario) {
    const isAdmin = usuario.rol === 'admin';
    const perms   = usuario.perms || { inicio: true, nuevo: true, reportes: true, exportar: false };

    const el = id => document.getElementById(id);

    const sidebarCfg = el('sidebar-cfg');
    const navNuevo   = el('nav-nuevo');
    const navRep     = el('nav-reportes');

    if (sidebarCfg) sidebarCfg.style.display = isAdmin ? 'flex' : 'none';
    if (navNuevo)   navNuevo.style.display   = (isAdmin || perms.nuevo)    ? '' : 'none';
    if (navRep)     navRep.style.display     = (isAdmin || perms.reportes) ? '' : 'none';

    // Botón Visual Editor — solo visible para administradores
    const btnVe = el('btn-ve');
    if (btnVe) btnVe.style.display = isAdmin ? 'inline-flex' : 'none';
  },

  /**
   * Migra contraseñas en texto plano a hash SHA-256.
   * Modifica el array en memoria. El llamador es responsable de persistir con save().
   * Retorna true si hubo cambios, false si todo ya estaba hasheado.
   *
   * @param {Object[]} usuarios
   * @returns {Promise<boolean>}
   */
  async migratePasswords(usuarios) {
    let changed = false;
    for (const u of usuarios) {
      if (u.password && u.password.length < 64) {
        u.password = await hashPassword(u.password);
        changed = true;
      }
    }
    return changed;
  },
});
