/**
 * @module config/contratas
 * @description Módulo de configuración de Contratas (empresas contratistas).
 *   Gestiona CRUD y exportación de la tabla de contratas.
 *
 * @exports
 *   - Contratas.render(): void
 *   - Contratas.openModal(idx): void
 *   - Contratas.closeModal(): void
 *   - Contratas.save(): void
 *   - Contratas.delete(idx): void
 *   - Contratas.export(): void
 *   - Contratas.publish(event): Promise<void>
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 5)
 */

function _audit(a, d) { window.AgroPlanner?.AuditService?.log(a, d); }

export const Contratas = Object.freeze({

  render() {
    if (typeof renderMContratas === 'function') renderMContratas();
  },

  openModal(idx = null) {
    if (typeof abrirModalContrata === 'function') abrirModalContrata(idx);
  },

  closeModal() {
    if (typeof cerrarModalContrata === 'function') cerrarModalContrata();
  },

  save() {
    if (typeof guardarModalContrata === 'function') {
      guardarModalContrata();
      _audit('config.contratas.save', {});
    }
  },

  delete(idx) {
    if (typeof delMContrata === 'function') {
      delMContrata(idx);
      _audit('config.contratas.delete', { idx });
    }
  },

  toggleSelect(idx, cb) {
    if (typeof toggleContSel === 'function') toggleContSel(idx, cb);
  },

  toggleAll(cb) {
    if (typeof toggleAllContratas === 'function') toggleAllContratas(cb);
  },

  export() {
    if (typeof exportarContratas === 'function') exportarContratas();
  },

  async publish(event) {
    if (typeof publicarMaestro === 'function') await publicarMaestro('contratas', event);
  },
});
