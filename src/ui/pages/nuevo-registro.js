/**
 * @module nuevo-registro
 * @description Módulo del formulario de registro de asistencia (desktop y móvil).
 *   Gestiona inicialización, drafts, validación y envío de registros.
 *
 * @dependencies
 *   - window.S → usuario activo, registros
 *   - window.AgroPlanner.SSM → selección de lotes
 *   - window.AgroPlanner.SheetsService → envío a Sheets
 *   - window.AgroPlanner.AuditService → registro de auditoría
 *
 * @exports
 *   - NuevoRegistro.init(): void
 *   - NuevoRegistro.save(): Promise<void>
 *   - NuevoRegistro.saveMob(): Promise<void>
 *   - NuevoRegistro.saveDraft(prefix): void
 *   - NuevoRegistro.loadDraft(prefix): boolean
 *   - NuevoRegistro.clearDraft(prefix): void
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 6)
 */

export const NuevoRegistro = Object.freeze({

  /** Inicializa el formulario de registro */
  init() {
    if (typeof initForm === 'function') initForm();
  },

  /** Guarda el registro desktop */
  async save() {
    if (typeof guardarRegistro === 'function') {
      await guardarRegistro();
      window.AgroPlanner?.AuditService?.log('registro.guardar', {
        usuario: window.S?.usuario?.nombre,
      });
    }
  },

  /** Guarda el registro móvil */
  async saveMob() {
    if (typeof guardarRegistroMob === 'function') {
      await guardarRegistroMob();
      window.AgroPlanner?.AuditService?.log('registro.guardar.mob', {
        usuario: window.S?.usuario?.nombre,
      });
    }
  },

  /** Persiste el borrador del formulario en localStorage */
  saveDraft(prefix) {
    if (typeof saveDraft === 'function') saveDraft(prefix);
  },

  /** Restaura el borrador desde localStorage */
  loadDraft(prefix) {
    if (typeof loadDraft === 'function') return loadDraft(prefix);
    return false;
  },

  /** Elimina el borrador del formulario */
  clearDraft(prefix) {
    if (typeof clearDraft === 'function') clearDraft(prefix);
  },
});
