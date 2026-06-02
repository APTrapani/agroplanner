/**
 * @module config/areas
 * @description Módulo de configuración de Áreas.
 *   Gestiona el CRUD de áreas del fundo en la sección de Configuración.
 *
 * @dependencies
 *   (accede al estado del monolito vía variables globales durante la transición)
 *
 * @exports
 *   - Areas.render(): void
 *   - Areas.add(nombre): void
 *   - Areas.delete(idx): void
 *   - Areas.publish(): Promise<void>
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 5)
 */

// ─────────────────────────────────────────────
// Helpers de acceso al estado del monolito
// ─────────────────────────────────────────────

function _getDB()   { return typeof DB !== 'undefined' ? DB : window.DB; }
function _save()    { if (typeof save === 'function') save(); }
function _toast(m, t) { if (typeof toast === 'function') toast(m, t); }
function _audit(a, d) { window.AgroPlanner?.AuditService?.log(a, d); }

// ─────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────

export const Areas = Object.freeze({

  /** Renderiza la lista de áreas en la sección de configuración */
  render() {
    if (typeof renderMSimple === 'function') { renderMSimple('areas'); return; }
    // Fallback directo si la función del monolito no está disponible
    const DB = _getDB();
    const el = document.getElementById('m-areas-list');
    if (!el || !DB) return;
    const areas = DB.maestros?.areas || [];
    el.innerHTML = areas.length
      ? areas.map((a, i) => `<div class="m-item">
          <span>${typeof a === 'string' ? a : a.nombre || ''}</span>
          <button onclick="window.AgroPlanner.Areas.delete(${i})" class="ib del">✕</button>
        </div>`).join('')
      : '<div class="m-empty">Sin áreas registradas.</div>';
  },

  /** Agrega un área nueva */
  add(nombre) {
    const DB = _getDB();
    if (!DB || !nombre?.trim()) { _toast('Ingresa el nombre del área', 'err'); return; }
    const n = nombre.trim();
    if (DB.maestros.areas.includes(n)) { _toast('Esa área ya existe', 'err'); return; }
    DB.maestros.areas.push(n);
    _save();
    _audit('config.areas.add', { nombre: n });
    _toast('Área agregada', 'ok');
    this.render();
  },

  /** Elimina un área por índice */
  delete(idx) {
    if (typeof delMSimple === 'function') { delMSimple('areas', idx); return; }
    const DB = _getDB();
    if (!DB) return;
    DB.maestros.areas.splice(idx, 1);
    _save();
    _audit('config.areas.delete', { idx });
    _toast('Área eliminada', 'ok');
    this.render();
  },

  /** Publica las áreas en Google Sheets */
  async publish(event) {
    if (typeof publicarMaestro === 'function') { await publicarMaestro('areas', event); }
  },
});
