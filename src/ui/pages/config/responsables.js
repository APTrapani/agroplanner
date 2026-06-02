/**
 * @module config/responsables
 * @description Módulo de configuración de Responsables de campo.
 *   Gestiona CRUD, exportación e importación de la tabla de responsables.
 *
 * @exports
 *   - Responsables.render(): void
 *   - Responsables.openModal(idx): void
 *   - Responsables.closeModal(): void
 *   - Responsables.save(): void
 *   - Responsables.delete(idx): void
 *   - Responsables.export(): void
 *   - Responsables.import(input): void
 *   - Responsables.publish(event): Promise<void>
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 5)
 */

function _audit(a, d) { window.AgroPlanner?.AuditService?.log(a, d); }

export const Responsables = Object.freeze({

  render() {
    if (typeof renderMResponsables === 'function') renderMResponsables();
  },

  openModal(idx = null) {
    if (typeof abrirModalResponsable === 'function') abrirModalResponsable(idx);
  },

  closeModal() {
    if (typeof cerrarModalResponsable === 'function') cerrarModalResponsable();
  },

  save() {
    if (typeof guardarModalResponsable === 'function') {
      guardarModalResponsable();
      _audit('config.responsables.save', {});
    }
  },

  delete(idx) {
    if (typeof delMResponsable === 'function') {
      delMResponsable(idx);
      _audit('config.responsables.delete', { idx });
    }
  },

  toggleSelect(idx, cb) {
    if (typeof toggleResponsableSel === 'function') toggleResponsableSel(idx, cb);
  },

  toggleAll(cb) {
    if (typeof toggleAllResponsables === 'function') toggleAllResponsables(cb);
  },

  export() {
    if (typeof exportarResponsables === 'function') exportarResponsables();
  },

  import(input) {
    if (typeof importarResponsables === 'function') importarResponsables(input);
  },

  async publish(event) {
    if (typeof publicarMaestro === 'function') await publicarMaestro('responsables', event);
  },
});
