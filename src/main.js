/**
 * @module main
 * @description Punto de entrada de la aplicación AgroPlanner.
 *
 * @changelog
 *   - 2025-06-01 · Fase 1: infraestructura base
 *   - 2025-06-02 · Fase 2: AuthService y SheetsService
 *   - 2025-06-02 · Fase 3: Toast, SearchableSelect, MultiSelect
 *   - 2025-06-02 · Fase 4: Dashboard y Reportes
 *   - 2025-06-02 · Fase 5: módulos de configuración
 *   - 2025-06-02 · Fase 6: Nav, NuevoRegistro, window.S/DB/CFG unificados
 */

import { APP_CONFIG, MAESTROS_SHEETS, MAESTROS_HEADERS, PERMS_DEFAULT, DB_DEFAULT } from './core/config.js';
import { isoHoy, horaAhora, fechaLarga, fechaCorta, initials, limpiarFecha, limpiarHora, parseGoogleFecha, parseGoogleHora, sanitizeHTML, debounce } from './core/utils.js';
import { storageGet, storageSet, storageRemove, hashPassword, verifyPassword } from './services/storage.service.js';
import { StateManager } from './core/state.js';
import { AuditService } from './audit/audit.service.js';
import { validateRegistro, validateUsuario, validateResponsable, validateActividad, validateCultivo, validateContrata, validateArea } from './validators/forms.validator.js';
import { AuthService }    from './services/auth.service.js';
import { SheetsService }  from './services/sheets.service.js';
import { toast, sync }    from './ui/components/toast.js';
import { ssLoad, ssGetValue, ssReset, ssOpen, ssBlur, ssCloseOne, ssCloseAll, ssInputFilter, ssFilter, ssRenderList, ssPick, ssClear } from './ui/components/searchable-select.js';
import { ssmLoad, ssmOpen, ssmClose, ssmFilter, ssmRender, ssmToggle, ssmToggleAll, ssmUpdateTags, ssmGetSelected, ssmReset, ssmGetCount, ssmSetSelected } from './ui/components/multi-select.js';
import { Dashboard }      from './ui/pages/dashboard.js';
import { Reportes }       from './ui/pages/reportes.js';
import { Nav }            from './ui/pages/nav.js';
import { NuevoRegistro }  from './ui/pages/nuevo-registro.js';
import { Areas }          from './ui/pages/config/areas.js';
import { Actividades }    from './ui/pages/config/actividades.js';
import { Cultivos }       from './ui/pages/config/cultivos.js';
import { Responsables }   from './ui/pages/config/responsables.js';
import { Contratas }      from './ui/pages/config/contratas.js';
import { Usuarios }       from './ui/pages/config/usuarios.js';

// ─────────────────────────────────────────────
// Exposición global para compatibilidad
// TODO: reducir progresivamente en iteraciones futuras
// ─────────────────────────────────────────────

window.AgroPlanner = {
  config:        { APP_CONFIG, MAESTROS_SHEETS, MAESTROS_HEADERS, PERMS_DEFAULT, DB_DEFAULT },
  utils:         { isoHoy, horaAhora, fechaLarga, fechaCorta, initials, limpiarFecha, limpiarHora, parseGoogleFecha, parseGoogleHora, sanitizeHTML, debounce },
  storage:       { storageGet, storageSet, storageRemove, hashPassword, verifyPassword },
  StateManager,
  AuditService,
  AuthService,
  SheetsService,
  Toast:         { toast, sync },
  SS:            { ssLoad, ssGetValue, ssReset, ssOpen, ssBlur, ssCloseOne, ssCloseAll, ssInputFilter, ssFilter, ssRenderList, ssPick, ssClear },
  SSM:           { ssmLoad, ssmOpen, ssmClose, ssmFilter, ssmRender, ssmToggle, ssmToggleAll, ssmUpdateTags, ssmGetSelected, ssmReset, ssmGetCount, ssmSetSelected },
  Dashboard,
  Reportes,
  Nav,
  NuevoRegistro,
  Areas,
  Actividades,
  Cultivos,
  Responsables,
  Contratas,
  Usuarios,
  validators:    { validateRegistro, validateUsuario, validateResponsable, validateActividad, validateCultivo, validateContrata, validateArea },
};

// ─────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────

function bootstrap() {
  AuditService.log('system.modules.loaded', {
    phase: 6,
    modules: [
      'config', 'utils', 'storage.service', 'state', 'audit.service',
      'auth.service', 'sheets.service', 'toast', 'searchable-select', 'multi-select',
      'dashboard', 'reportes', 'nav', 'nuevo-registro',
      'areas', 'actividades', 'cultivos', 'responsables', 'contratas', 'usuarios',
      'forms.validator',
    ],
  });
  console.info('[AgroPlanner] ✓ Fase 6 — todos los módulos cargados.');
  console.info('[AgroPlanner] window.S, window.DB y window.CFG unificados con el monolito.');

  // Notificar al monolito que los módulos están listos
  window._agroModulosListos = true;
  document.dispatchEvent(new CustomEvent('agroplanner:ready'));

  // Caso A: cargarRegistros() ya terminó antes que main.js cargara
  // Los datos están en window.S.registros — forzar re-render inmediato
  requestAnimationFrame(() => {
    if (window.S?.registros?.length > 0) {
      Dashboard.render();
      Reportes.render();
    }
  });

  // Caso B: main.js cargó antes que cargarRegistros() terminara
  // Escuchar el evento que dispara cargarRegistros() al terminar
  document.addEventListener('agroplanner:data-ready', () => {
    // Usar renderInicio del monolito — ya incluye re-aplicar el VE
    if (typeof window.renderInicio === 'function') {
      window.renderInicio();
      Reportes.render();
    } else {
      Dashboard.render();
      Reportes.render();
    }
  }, { once: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
