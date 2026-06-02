/**
 * @module config/cultivos
 * @description Módulo de configuración de Cultivos y Lotes.
 *   Gestiona el CRUD, exportación e importación de la tabla de cultivos.
 *
 * @exports
 *   - Cultivos.render(): void
 *   - Cultivos.openModal(idx): void
 *   - Cultivos.closeModal(): void
 *   - Cultivos.save(): void
 *   - Cultivos.delete(idx): void
 *   - Cultivos.export(): void
 *   - Cultivos.import(input): void
 *   - Cultivos.publish(event): Promise<void>
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 5)
 */

function _audit(a, d) { window.AgroPlanner?.AuditService?.log(a, d); }

export const Cultivos = Object.freeze({

  render() {
    if (typeof renderMCultivos === 'function') renderMCultivos();
  },

  openModal(idx = null) {
    if (typeof abrirModalCultivo === 'function') abrirModalCultivo(idx);
  },

  closeModal() {
    if (typeof cerrarModalCultivo === 'function') cerrarModalCultivo();
  },

  save() {
    if (typeof guardarModalCultivo === 'function') {
      guardarModalCultivo();
      _audit('config.cultivos.save', {});
    }
  },

  delete(idx) {
    if (typeof delMCultivo === 'function') {
      delMCultivo(idx);
      _audit('config.cultivos.delete', { idx });
    }
  },

  toggleSelect(idx, cb) {
    if (typeof toggleCultivoSel === 'function') toggleCultivoSel(idx, cb);
  },

  toggleAll(cb) {
    if (typeof toggleAllCultivos === 'function') toggleAllCultivos(cb);
  },

  export() {
    if (typeof exportarCultivos === 'function') exportarCultivos();
  },

  import(input) {
    if (typeof importarCultivos === 'function') importarCultivos(input);
  },

  async publish(event) {
    if (typeof publicarMaestro === 'function') await publicarMaestro('cultivos', event);
  },
});
