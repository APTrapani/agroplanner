/**
 * @module main
 * @description Punto de entrada de la aplicación AgroPlanner.
 *   Inicializa los módulos core en el orden correcto y expone los
 *   módulos necesarios para la compatibilidad con el monolito durante
 *   la migración incremental.
 *
 *   FASE ACTUAL: Fase 1
 *   En esta fase, main.js solo inicializa los módulos de infraestructura
 *   (config, state, audit, storage, validators). El monolito sigue manejando
 *   toda la lógica de UI y negocio.
 *
 *   A partir de Fase 2, main.js tomará progresivamente el control del bootstrap.
 *
 * @dependencies
 *   - ./core/config.js
 *   - ./core/state.js
 *   - ./core/utils.js
 *   - ./audit/audit.service.js
 *   - ./services/storage.service.js
 *   - ./validators/forms.validator.js
 *
 * @changelog
 *   - 2025-06-01 · Creación inicial (Fase 1)
 */

// ─────────────────────────────────────────────
// Importaciones (en orden de dependencia)
// ─────────────────────────────────────────────

import { APP_CONFIG, MAESTROS_SHEETS, MAESTROS_HEADERS, PERMS_DEFAULT, DB_DEFAULT } from './core/config.js';
import { isoHoy, horaAhora, fechaLarga, fechaCorta, initials, limpiarFecha, limpiarHora, parseGoogleFecha, parseGoogleHora, sanitizeHTML, debounce } from './core/utils.js';
import { storageGet, storageSet, storageRemove, hashPassword, verifyPassword } from './services/storage.service.js';
import { StateManager } from './core/state.js';
import { AuditService } from './audit/audit.service.js';
import { validateRegistro, validateUsuario, validateResponsable, validateActividad, validateCultivo, validateContrata, validateArea } from './validators/forms.validator.js';

// ─────────────────────────────────────────────
// Exposición global para compatibilidad con monolito
// TODO Fase 6: eliminar toda esta sección
// ─────────────────────────────────────────────

/**
 * Durante la migración incremental, los módulos de Fase 1 se exponen en
 * window para que el monolito pueda consumirlos sin necesidad de ser
 * refactorizado en esta fase.
 *
 * El patrón es: window.AgroPlanner.NombreModulo
 * Para no contaminar el scope global con nombres genéricos.
 */
window.AgroPlanner = {
  // Core
  config: { APP_CONFIG, MAESTROS_SHEETS, MAESTROS_HEADERS, PERMS_DEFAULT, DB_DEFAULT },
  utils:  { isoHoy, horaAhora, fechaLarga, fechaCorta, initials, limpiarFecha, limpiarHora, parseGoogleFecha, parseGoogleHora, sanitizeHTML, debounce },

  // Services
  storage: { storageGet, storageSet, storageRemove, hashPassword, verifyPassword },

  // State
  StateManager,

  // Audit
  AuditService,

  // Validators
  validators: { validateRegistro, validateUsuario, validateResponsable, validateActividad, validateCultivo, validateContrata, validateArea },
};

// ─────────────────────────────────────────────
// Bootstrap de Fase 1
// ─────────────────────────────────────────────

/**
 * Inicialización mínima para Fase 1.
 * En fases posteriores, esta función orquestará el arranque completo.
 */
function bootstrap() {
  // Registrar inicio de sesión del módulo en auditoría
  AuditService.log('system.modules.loaded', {
    phase: 1,
    modules: ['config', 'utils', 'storage.service', 'state', 'audit.service', 'forms.validator'],
  });

  console.info('[AgroPlanner] Módulos de Fase 1 cargados correctamente.');
  console.info('[AgroPlanner] Acceso vía window.AgroPlanner.* disponible para compatibilidad.');
}

// Ejecutar bootstrap cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
