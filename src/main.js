/**
 * @module main
 * @description Punto de entrada de la aplicación AgroPlanner.
 *   Inicializa los módulos core en el orden correcto y expone los
 *   módulos necesarios para la compatibilidad con el monolito durante
 *   la migración incremental.
 *
 *   FASE ACTUAL: Fase 2
 *
 * @dependencies
 *   - ./core/config.js
 *   - ./core/state.js
 *   - ./core/utils.js
 *   - ./audit/audit.service.js
 *   - ./services/storage.service.js
 *   - ./services/auth.service.js
 *   - ./services/sheets.service.js
 *   - ./validators/forms.validator.js
 *
 * @changelog
 *   - 2025-06-01 · Creación inicial (Fase 1)
 *   - 2025-06-02 · Fase 2: añadidos AuthService y SheetsService
 */

import { APP_CONFIG, MAESTROS_SHEETS, MAESTROS_HEADERS, PERMS_DEFAULT, DB_DEFAULT } from './core/config.js';
import { isoHoy, horaAhora, fechaLarga, fechaCorta, initials, limpiarFecha, limpiarHora, parseGoogleFecha, parseGoogleHora, sanitizeHTML, debounce } from './core/utils.js';
import { storageGet, storageSet, storageRemove, hashPassword, verifyPassword } from './services/storage.service.js';
import { StateManager } from './core/state.js';
import { AuditService } from './audit/audit.service.js';
import { validateRegistro, validateUsuario, validateResponsable, validateActividad, validateCultivo, validateContrata, validateArea } from './validators/forms.validator.js';
import { AuthService }   from './services/auth.service.js';
import { SheetsService } from './services/sheets.service.js';

// ─────────────────────────────────────────────
// Exposición global para compatibilidad con monolito
// TODO Fase 6: eliminar toda esta sección
// ─────────────────────────────────────────────

window.AgroPlanner = {
  config:   { APP_CONFIG, MAESTROS_SHEETS, MAESTROS_HEADERS, PERMS_DEFAULT, DB_DEFAULT },
  utils:    { isoHoy, horaAhora, fechaLarga, fechaCorta, initials, limpiarFecha, limpiarHora, parseGoogleFecha, parseGoogleHora, sanitizeHTML, debounce },
  storage:  { storageGet, storageSet, storageRemove, hashPassword, verifyPassword },
  StateManager,
  AuditService,
  AuthService,
  SheetsService,
  validators: { validateRegistro, validateUsuario, validateResponsable, validateActividad, validateCultivo, validateContrata, validateArea },
};

// ─────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────

function bootstrap() {
  AuditService.log('system.modules.loaded', {
    phase: 2,
    modules: ['config', 'utils', 'storage.service', 'state', 'audit.service', 'auth.service', 'sheets.service', 'forms.validator'],
  });
  console.info('[AgroPlanner] Módulos de Fase 2 cargados correctamente.');
  console.info('[AgroPlanner] Acceso vía window.AgroPlanner.* disponible para compatibilidad.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
