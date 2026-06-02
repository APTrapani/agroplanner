/**
 * @module main
 * @description Punto de entrada de la aplicación AgroPlanner.
 *
 * @changelog
 *   - 2025-06-01 · Fase 1: infraestructura base
 *   - 2025-06-02 · Fase 2: AuthService y SheetsService
 *   - 2025-06-02 · Fase 3: Toast, SearchableSelect, MultiSelect
 *   - 2025-06-02 · Fase 4: Dashboard y Reportes
 */

import { APP_CONFIG, MAESTROS_SHEETS, MAESTROS_HEADERS, PERMS_DEFAULT, DB_DEFAULT } from './core/config.js';
import { isoHoy, horaAhora, fechaLarga, fechaCorta, initials, limpiarFecha, limpiarHora, parseGoogleFecha, parseGoogleHora, sanitizeHTML, debounce } from './core/utils.js';
import { storageGet, storageSet, storageRemove, hashPassword, verifyPassword } from './services/storage.service.js';
import { StateManager } from './core/state.js';
import { AuditService } from './audit/audit.service.js';
import { validateRegistro, validateUsuario, validateResponsable, validateActividad, validateCultivo, validateContrata, validateArea } from './validators/forms.validator.js';
import { AuthService }   from './services/auth.service.js';
import { SheetsService } from './services/sheets.service.js';
import { toast, sync }   from './ui/components/toast.js';
import { ssLoad, ssGetValue, ssReset, ssOpen, ssBlur, ssCloseOne, ssCloseAll, ssInputFilter, ssFilter, ssRenderList, ssPick, ssClear } from './ui/components/searchable-select.js';
import { ssmLoad, ssmOpen, ssmClose, ssmFilter, ssmRender, ssmToggle, ssmToggleAll, ssmUpdateTags, ssmGetSelected, ssmReset, ssmGetCount, ssmSetSelected } from './ui/components/multi-select.js';
import { Dashboard } from './ui/pages/dashboard.js';
import { Reportes }  from './ui/pages/reportes.js';

// ─────────────────────────────────────────────
// Exposición global para compatibilidad con monolito
// TODO Fase 6: eliminar toda esta sección
// ─────────────────────────────────────────────

window.AgroPlanner = {
  config:     { APP_CONFIG, MAESTROS_SHEETS, MAESTROS_HEADERS, PERMS_DEFAULT, DB_DEFAULT },
  utils:      { isoHoy, horaAhora, fechaLarga, fechaCorta, initials, limpiarFecha, limpiarHora, parseGoogleFecha, parseGoogleHora, sanitizeHTML, debounce },
  storage:    { storageGet, storageSet, storageRemove, hashPassword, verifyPassword },
  StateManager,
  AuditService,
  AuthService,
  SheetsService,
  Toast:      { toast, sync },
  SS:         { ssLoad, ssGetValue, ssReset, ssOpen, ssBlur, ssCloseOne, ssCloseAll, ssInputFilter, ssFilter, ssRenderList, ssPick, ssClear },
  SSM:        { ssmLoad, ssmOpen, ssmClose, ssmFilter, ssmRender, ssmToggle, ssmToggleAll, ssmUpdateTags, ssmGetSelected, ssmReset, ssmGetCount, ssmSetSelected },
  Dashboard,
  Reportes,
  validators: { validateRegistro, validateUsuario, validateResponsable, validateActividad, validateCultivo, validateContrata, validateArea },
};

// ─────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────

function bootstrap() {
  AuditService.log('system.modules.loaded', {
    phase: 4,
    modules: ['config','utils','storage.service','state','audit.service',
              'auth.service','sheets.service','toast','searchable-select',
              'multi-select','dashboard','reportes','forms.validator'],
  });
  console.info('[AgroPlanner] Módulos de Fase 4 cargados correctamente.');
  console.info('[AgroPlanner] Acceso vía window.AgroPlanner.* disponible para compatibilidad.');

  // Notificar al monolito que los módulos están listos
  window._agroModulosListos = true;
  document.dispatchEvent(new CustomEvent('agroplanner:ready'));
}

// Señal de que window.AgroPlanner está listo
// El monolito escucha este evento para re-ejecutar renders pendientes
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
