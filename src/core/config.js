/**
 * @module config
 * @description Constantes de entorno y configuración de la aplicación.
 *   Este módulo es de solo lectura. Ningún otro módulo debe modificar
 *   sus valores en tiempo de ejecución.
 *
 *   Para cambiar la URL del Apps Script o el Sheet ID, editar SOLO aquí.
 *
 * @dependencies
 *   (ninguna)
 *
 * @exports
 *   - APP_CONFIG: Object — configuración inmutable de la aplicación
 *   - MAESTROS_SHEETS: Object — nombres de hojas en Google Sheets por maestro
 *   - MAESTROS_HEADERS: Object — cabeceras de columnas por maestro
 *
 * @changelog
 *   - 2025-06-01 · Creación inicial, extraído de monolito (Fase 1)
 */

// ─────────────────────────────────────────────
// Configuración principal de la aplicación
// ─────────────────────────────────────────────

export const APP_CONFIG = Object.freeze({
  /** URL del Google Apps Script que actúa como backend */
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz06r4ZEXqk1muDdze7X6_mmcLKL6au0Ze2EUAENNrEm1V-rTMwloXoTMBGMsFfcV_VMg/exec',

  /** ID de la hoja de cálculo de Google Sheets */
  SHEET_ID: '1X2LIIsoR3Q35oCjQmWlEqrpoVDAkcyjGLBwfMTBIGCg',

  /** Nombre de la hoja principal de registros */
  SHEET_NAME: 'Registros',

  /** Clave de localStorage para datos de la aplicación */
  DB_KEY: 'campo_v3',

  /** Clave de localStorage para el log de auditoría */
  AUDIT_KEY: 'agro_audit_log',

  /** Clave de localStorage para preferencia de sidebar */
  SIDEBAR_KEY: 'sb_pinned',

  /** Clave de localStorage para el draft del formulario principal */
  DRAFT_KEY: 'agro_form_draft',

  /** Clave de localStorage para el draft del formulario móvil */
  DRAFT_MOB_KEY: 'agro_mob_form_draft',

  /** Versión del esquema de datos (incrementar si cambia DB_DEF) */
  SCHEMA_VERSION: 3,

  /** Timeout en ms para llamadas al Apps Script */
  FETCH_TIMEOUT_MS: 15000,

  /** Máximo de entradas en el log de auditoría antes de rotar */
  AUDIT_MAX_ENTRIES: 500,
});

// ─────────────────────────────────────────────
// Nombres de hojas en Google Sheets por maestro
// ─────────────────────────────────────────────

export const MAESTROS_SHEETS = Object.freeze({
  areas:        'Maestro_Areas',
  responsables: 'Maestro_Responsables',
  cultivos:     'Maestro_Cultivos',
  actividades:  'Maestro_Actividades',
  contratas:    'Maestro_Contratas',
  usuarios:     'Maestro_Usuarios',
});

// ─────────────────────────────────────────────
// Cabeceras de columnas por maestro
// ─────────────────────────────────────────────

export const MAESTROS_HEADERS = Object.freeze({
  areas:        ['Área'],
  responsables: ['DNI', 'Apellidos y Nombres', 'Nombre Corto', 'Área'],
  cultivos:     ['Etapa', 'Módulo', 'Lote', 'Cultivo', 'Patrón', 'Copa', 'Ha Totales', 'Ha Sembradas', 'Plantas Totales', 'Plantas Sembradas', 'Estado'],
  actividades:  ['Subárea', 'Grupo Actividad', 'Código', 'Actividad', 'Tipo', 'Unidad Medida'],
  contratas:    ['Razón Social', 'RUC', 'Nombre Corto', 'Contacto', 'Teléfono', 'Especialidad', 'Estado'],
  usuarios:     ['ID', 'Nombre', 'Usuario', 'Password', 'Rol', 'Estado', 'Permisos', 'Último Acceso'],
});

// ─────────────────────────────────────────────
// Permisos por defecto para nuevos usuarios
// ─────────────────────────────────────────────

export const PERMS_DEFAULT = Object.freeze({
  inicio:    true,
  nuevo:     true,
  reportes:  true,
  exportar:  false,
});

// ─────────────────────────────────────────────
// Datos iniciales (solo para primera carga / reset)
// ─────────────────────────────────────────────

export const DB_DEFAULT = Object.freeze({
  usuarios: [
    {
      id: 'u1',
      nombre: 'Administrador',
      usuario: 'admin',
      // NOTA: La contraseña real se almacena como hash SHA-256 via storage.service.js
      // Este valor en texto plano solo se usa en el primer arranque; se hashea inmediatamente.
      _passwordPlain: 'campo2024',
      rol: 'admin',
      lastAccess: null,
      perms: { inicio: true, nuevo: true, reportes: true, exportar: true },
    },
    {
      id: 'u2',
      nombre: 'Pedro Mamani',
      usuario: 'pedro',
      _passwordPlain: 'pedro123',
      rol: 'supervisor',
      lastAccess: null,
      perms: { ...PERMS_DEFAULT },
    },
    {
      id: 'u3',
      nombre: 'Rosa Chávez',
      usuario: 'rosa',
      _passwordPlain: 'rosa123',
      rol: 'supervisor',
      lastAccess: null,
      perms: { ...PERMS_DEFAULT },
    },
    {
      id: 'u4',
      nombre: 'Juan Quispe',
      usuario: 'juan',
      _passwordPlain: 'juan123',
      rol: 'supervisor',
      lastAccess: null,
      perms: { ...PERMS_DEFAULT },
    },
  ],
  maestros: {
    areas: ['Fundo Norte', 'Fundo Sur', 'Almacén'],
    responsables: ['Pedro Mamani', 'Rosa Chávez', 'Juan Quispe'],
    cultivos: [
      {
        etapa: 'Etapa I', modulo: 'Módulo 01', lote: 7, cultivo: 'Lima Tahiti',
        patron: 'Lima Rangpour', copa: 'Tahiti', haTotales: '1.33',
        haSembradas: '1.33', plantasTotales: 554, plantasSembradas: 554, estado: 'Activo',
      },
      {
        etapa: 'Etapa II', modulo: 'Módulo 02', lote: 12, cultivo: 'Mango Kent',
        patron: '', copa: '', haTotales: '2.50', haSembradas: '2.50',
        plantasTotales: 320, plantasSembradas: 320, estado: 'Activo',
      },
    ],
    actividades: ['Cosecha', 'Mantenimiento de goteros', 'Poda de mamones', 'Revisión de riego', 'Fertilización', 'Deshierbo'],
    contratas: [],
  },
});
