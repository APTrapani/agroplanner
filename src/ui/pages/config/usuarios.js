/**
 * @module config/usuarios
 * @description Módulo de configuración de Usuarios del sistema.
 *   Gestiona CRUD de usuarios, permisos, exportación y sincronización con Sheets.
 *   Integra con AuthService para el hash de contraseñas.
 *
 * @exports
 *   - Usuarios.render(): void
 *   - Usuarios.openModal(id): void
 *   - Usuarios.closeModal(): void
 *   - Usuarios.save(): Promise<void>
 *   - Usuarios.delete(id): void
 *   - Usuarios.export(): void
 *   - Usuarios.publish(event): Promise<void>
 *   - Usuarios.togglePermsVisibility(): void
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 5)
 */

function _audit(a, d) { window.AgroPlanner?.AuditService?.log(a, d); }

export const Usuarios = Object.freeze({

  render() {
    if (typeof renderUsuarios === 'function') renderUsuarios();
  },

  openModal(id = null) {
    if (typeof abrirModalUser === 'function') abrirModalUser(id);
  },

  closeModal() {
    if (typeof cerrarModalUser === 'function') cerrarModalUser();
  },

  async save() {
    if (typeof guardarUser === 'function') {
      await guardarUser();
      _audit('config.usuarios.save', {});
    }
  },

  delete(id) {
    if (typeof delUser === 'function') {
      delUser(id);
      _audit('config.usuarios.delete', { id });
    }
  },

  export() {
    if (typeof exportarUsuarios === 'function') exportarUsuarios();
  },

  async publish(event) {
    if (typeof publicarMaestro === 'function') await publicarMaestro('usuarios', event);
  },

  togglePermsVisibility() {
    if (typeof togglePermsVisibility === 'function') togglePermsVisibility();
  },
});
