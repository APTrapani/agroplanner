/**
 * @module config/actividades
 * @description Módulo de configuración de Actividades.
 *   Gestiona el CRUD, exportación e importación de actividades de campo.
 *
 * @exports
 *   - Actividades.render(): void
 *   - Actividades.openModal(idx): void
 *   - Actividades.closeModal(): void
 *   - Actividades.save(): void
 *   - Actividades.delete(idx): void
 *   - Actividades.export(): void
 *   - Actividades.import(input): void
 *   - Actividades.publish(event): Promise<void>
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 5)
 */

function _audit(a, d) { window.AgroPlanner?.AuditService?.log(a, d); }

export const Actividades = Object.freeze({

  render() {
    if (typeof renderMActividades === 'function') renderMActividades();
  },

  openModal(idx = null) {
    if (typeof abrirModalActividad === 'function') abrirModalActividad(idx);
  },

  closeModal() {
    if (typeof cerrarModalActividad === 'function') cerrarModalActividad();
  },

  save() {
    if (typeof guardarModalActividad === 'function') {
      guardarModalActividad();
      _audit('config.actividades.save', {});
    }
  },

  delete(idx) {
    if (typeof delMActividad === 'function') {
      delMActividad(idx);
      _audit('config.actividades.delete', { idx });
    }
  },

  toggleSelect(idx, cb) {
    if (typeof toggleActSel === 'function') toggleActSel(idx, cb);
  },

  toggleAll(cb) {
    if (typeof toggleAllActividades === 'function') toggleAllActividades(cb);
  },

  export() {
    if (typeof exportarActividades === 'function') exportarActividades();
  },

  import(input) {
    if (typeof importarActividades === 'function') importarActividades(input);
  },

  async publish(event) {
    if (typeof publicarMaestro === 'function') await publicarMaestro('actividades', event);
  },
});
