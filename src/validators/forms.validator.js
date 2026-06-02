/**
 * @module forms.validator
 * @description Capa de validaciones independiente para formularios y procesos.
 *   Centraliza todas las reglas de validación para evitar lógica repetida y
 *   garantizar consistencia entre el formulario desktop, el formulario móvil
 *   y los módulos de configuración.
 *
 *   Principio: las funciones de validación son puras. Reciben datos, retornan
 *   un resultado de validación. No acceden al DOM ni al estado global.
 *
 * @dependencies
 *   (ninguna — módulo completamente independiente)
 *
 * @exports
 *   - validateRegistro(data): ValidationResult
 *   - validateUsuario(data, existingUsers, editId): ValidationResult
 *   - validateResponsable(data, existingList, editIdx): ValidationResult
 *   - validateActividad(data): ValidationResult
 *   - validateCultivo(data): ValidationResult
 *   - validateContrata(data): ValidationResult
 *   - validateArea(nombre, existingAreas): ValidationResult
 *   - required(value, fieldName): ValidationResult — validación básica reutilizable
 *
 * @typedef {Object} ValidationResult
 *   @property {boolean} ok — true si la validación pasó
 *   @property {string} [message] — mensaje de error legible por el usuario (si ok=false)
 *   @property {string} [field] — id del campo que falló (para enfocar el input)
 *
 * @changelog
 *   - 2025-06-01 · Creación inicial (Fase 1)
 */

// ─────────────────────────────────────────────
// Helper base
// ─────────────────────────────────────────────

/**
 * Valida que un valor no esté vacío.
 * @param {any} value
 * @param {string} fieldName — nombre legible del campo
 * @param {string} [fieldId] — id del input DOM para enfocar en caso de error
 * @returns {ValidationResult}
 */
export function required(value, fieldName, fieldId) {
  const isEmpty = value === null || value === undefined || String(value).trim() === '';
  if (isEmpty) {
    return { ok: false, message: `${fieldName} es obligatorio.`, field: fieldId };
  }
  return { ok: true };
}

/**
 * Retorna el primer resultado fallido de una lista de validaciones, o { ok: true }.
 * @param {ValidationResult[]} results
 * @returns {ValidationResult}
 */
function _firstFail(results) {
  return results.find(r => !r.ok) || { ok: true };
}

// ─────────────────────────────────────────────
// Validación de Registro de Asistencia
// ─────────────────────────────────────────────

/**
 * Valida los datos del formulario de registro de asistencia.
 *
 * @param {Object} data
 * @param {string} data.fecha
 * @param {string} data.area
 * @param {string} data.responsable
 * @param {string} data.tipo — 'Propio' | 'Contrata'
 * @param {string} data.contratista — requerido si tipo === 'Contrata'
 * @param {string} data.actividad
 * @param {number} data.nPersonas
 * @param {string} data.hora
 * @param {string} data.horaFin
 * @param {number} data.lotesCount — número de lotes seleccionados
 * @returns {ValidationResult}
 */
export function validateRegistro(data) {
  const { fecha, area, responsable, tipo, contratista, actividad, nPersonas, hora, horaFin, lotesCount } = data;

  return _firstFail([
    required(fecha,       'La fecha',           'f-fecha'),
    required(area,        'El Área',            'f-area'),
    required(responsable, 'El Responsable',     'f-resp'),
    required(tipo,        'El Tipo de personal','f-tipo'),

    // Contratista requerido solo si tipo es Contrata
    (tipo === 'Contrata' && !contratista)
      ? { ok: false, message: 'Selecciona el Contratista.', field: 'f-contratista' }
      : { ok: true },

    required(actividad, 'La Actividad', 'f-act'),

    // N° de personas debe ser número positivo
    (!nPersonas || nPersonas <= 0)
      ? { ok: false, message: 'El N° de personas debe ser mayor a 0.', field: 'f-np' }
      : { ok: true },

    required(hora,    'La Hora de inicio',    'f-hora'),
    required(horaFin, 'La Hora de término',   'f-hora-fin'),

    // Al menos un lote seleccionado
    (!lotesCount || lotesCount === 0)
      ? { ok: false, message: 'Selecciona al menos un lote.', field: null }
      : { ok: true },
  ]);
}

// ─────────────────────────────────────────────
// Validación de Usuario
// ─────────────────────────────────────────────

/**
 * Valida los datos del formulario de usuario.
 *
 * @param {Object} data
 * @param {string} data.nombre
 * @param {string} data.usuario — nombre de login
 * @param {string} data.password
 * @param {Object[]} existingUsers — array de usuarios existentes para detectar duplicados
 * @param {string|null} editId — id del usuario en edición (null si es nuevo)
 * @returns {ValidationResult}
 */
export function validateUsuario(data, existingUsers = [], editId = null) {
  const { nombre, usuario, password } = data;

  const baseValidation = _firstFail([
    required(nombre,   'El nombre',    'mu-nombre'),
    required(usuario,  'El usuario',   'mu-usuario'),
    required(password, 'La contraseña','mu-pass'),
  ]);

  if (!baseValidation.ok) return baseValidation;

  // Contraseña mínima de 6 caracteres
  if (password.length < 6) {
    return { ok: false, message: 'La contraseña debe tener al menos 6 caracteres.', field: 'mu-pass' };
  }

  // Nombre de usuario único
  const duplicate = existingUsers.find(u => u.usuario === usuario && u.id !== editId);
  if (duplicate) {
    return { ok: false, message: 'Ese nombre de usuario ya existe.', field: 'mu-usuario' };
  }

  return { ok: true };
}

// ─────────────────────────────────────────────
// Validación de Responsable
// ─────────────────────────────────────────────

/**
 * Valida los datos del formulario de responsable.
 *
 * @param {Object} data
 * @param {string} data.nombres — apellidos y nombres completos
 * @param {string} data.nombreCorto
 * @param {Object[]} existingList — responsables existentes
 * @param {number|null} editIdx — índice en edición (null si es nuevo)
 * @returns {ValidationResult}
 */
export function validateResponsable(data, existingList = [], editIdx = null) {
  const { nombres, nombreCorto } = data;

  const baseValidation = _firstFail([
    required(nombres,      'Apellidos y Nombres', 'mr-nombres'),
    required(nombreCorto,  'Nombre Corto',        'mr-corto'),
  ]);

  if (!baseValidation.ok) return baseValidation;

  // Nombre corto único
  const duplicate = existingList.find((r, i) => {
    const nc = typeof r === 'string' ? r : r.nombreCorto;
    return nc === nombreCorto && i !== editIdx;
  });

  if (duplicate) {
    return { ok: false, message: 'Ese Nombre Corto ya existe en la lista de responsables.', field: 'mr-corto' };
  }

  return { ok: true };
}

// ─────────────────────────────────────────────
// Validación de Actividad
// ─────────────────────────────────────────────

/**
 * Valida los datos del formulario de actividad.
 *
 * @param {Object} data
 * @param {string} data.actividad — nombre de la actividad (campo obligatorio)
 * @returns {ValidationResult}
 */
export function validateActividad(data) {
  return required(data.actividad, 'El nombre de la actividad', 'ma-actividad');
}

// ─────────────────────────────────────────────
// Validación de Cultivo / Lote
// ─────────────────────────────────────────────

/**
 * Valida los datos del formulario de cultivo.
 *
 * @param {Object} data
 * @param {string} data.cultivo — nombre del cultivo
 * @param {string|number} data.lote — número de lote
 * @param {string} data.modulo
 * @returns {ValidationResult}
 */
export function validateCultivo(data) {
  const { cultivo, lote, modulo } = data;

  return _firstFail([
    required(cultivo, 'El nombre del cultivo', 'mc-cultivo'),
    required(lote,    'El número de lote',     'mc-lote'),
    required(modulo,  'El módulo',             'mc-modulo'),

    // Lote debe ser número entero positivo
    (lote !== '' && (isNaN(parseInt(lote)) || parseInt(lote) <= 0))
      ? { ok: false, message: 'El número de lote debe ser un entero positivo.', field: 'mc-lote' }
      : { ok: true },
  ]);
}

// ─────────────────────────────────────────────
// Validación de Contrata
// ─────────────────────────────────────────────

/**
 * Valida los datos del formulario de contrata.
 *
 * @param {Object} data
 * @param {string} data.razon — razón social (obligatorio)
 * @param {string} [data.ruc] — 11 dígitos si se proporciona
 * @returns {ValidationResult}
 */
export function validateContrata(data) {
  const { razon, ruc } = data;

  const baseValidation = required(razon, 'La razón social', 'mco-razon');
  if (!baseValidation.ok) return baseValidation;

  // RUC: si se proporciona, debe tener exactamente 11 dígitos
  if (ruc && ruc.trim().length > 0) {
    if (!/^\d{11}$/.test(ruc.trim())) {
      return { ok: false, message: 'El RUC debe tener exactamente 11 dígitos.', field: 'mco-ruc' };
    }
  }

  return { ok: true };
}

// ─────────────────────────────────────────────
// Validación de Área
// ─────────────────────────────────────────────

/**
 * Valida un nombre de área.
 *
 * @param {string} nombre
 * @param {string[]} existingAreas — áreas existentes para detectar duplicados
 * @param {string|null} [editArea] — nombre del área en edición
 * @returns {ValidationResult}
 */
export function validateArea(nombre, existingAreas = [], editArea = null) {
  const baseValidation = required(nombre, 'El nombre del área', null);
  if (!baseValidation.ok) return baseValidation;

  const normalized = nombre.trim().toLowerCase();
  const duplicate = existingAreas.find(a => {
    const existing = typeof a === 'string' ? a : '';
    return existing.toLowerCase() === normalized && existing !== editArea;
  });

  if (duplicate) {
    return { ok: false, message: 'Esa área ya existe.', field: null };
  }

  return { ok: true };
}
