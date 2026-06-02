/**
 * @module sheets.service
 * @description Capa de comunicación con Google Apps Script / Google Sheets.
 *   Centraliza todos los fetch() del sistema. Ningún otro módulo debe
 *   llamar directamente a la URL del Apps Script.
 *
 *   Cada función maneja su propio timeout y lanza errores explícitos
 *   para que el llamador decida cómo manejarlos (toast, retry, fallback).
 *
 * @dependencies
 *   - ../core/config.js          → APP_CONFIG, MAESTROS_SHEETS, MAESTROS_HEADERS
 *   - ../core/utils.js           → limpiarFecha, limpiarHora
 *   - ../audit/audit.service.js  → AuditService
 *
 * @exports
 *   - SheetsService.enviarRegistro(reg): Promise<void>
 *   - SheetsService.cargarTodo(appsScriptUrl, sheetId): Promise<SheetsData>
 *   - SheetsService.pushMaestro(tipo, headers, rows, appsScriptUrl): Promise<void>
 *   - SheetsService.pullMaestro(tipo, appsScriptUrl): Promise<any[]|null>
 *   - SheetsService.cargarGviz(sheetId, sheetName): Promise<Object[]>
 *   - SheetsService.parsearRegistros(rows): Object[]
 *   - SheetsService.parsearMaestros(todo): Object
 *
 * @typedef {Object} SheetsData
 *   @property {Object[]} registros
 *   @property {Object}   maestros
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 2)
 */

import { APP_CONFIG, MAESTROS_SHEETS } from '../core/config.js';
import { limpiarFecha, limpiarHora, parseGoogleFecha, parseGoogleHora } from '../core/utils.js';
import { AuditService } from '../audit/audit.service.js';

// ─────────────────────────────────────────────
// Helper privado: fetch con timeout
// ─────────────────────────────────────────────

/**
 * Hace un fetch con timeout automático.
 * Lanza error si el servidor responde con status !== ok o si el status de la
 * respuesta JSON no es 'ok'.
 *
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} timeoutMs
 * @returns {Promise<any>} — el JSON de la respuesta
 */
async function _fetchWithTimeout(url, options = {}, timeoutMs = APP_CONFIG.FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.status && json.status !== 'ok') throw new Error(json.message || 'Error del servidor');
    return json;
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

// ─────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────

export const SheetsService = Object.freeze({

  /**
   * Envía un registro de asistencia al Apps Script para insertarlo en Sheets.
   *
   * @param {Object} reg — registro a insertar
   * @param {string} appsScriptUrl
   * @returns {Promise<void>}
   * @throws {Error} si la inserción falla
   */
  async enviarRegistro(reg, appsScriptUrl) {
    const body = JSON.stringify({
      accion: 'insertar',
      datos: [
        reg.fecha, reg.hora, reg.horaFin || '',
        reg.area, reg.responsable, reg.lotes,
        reg.tipo, reg.contratista || '', reg.actividad,
        reg.tarea || '', reg.nPersonas, reg.obs,
        reg.registradoPor, reg.timestamp,
      ],
    });
    try {
      await _fetchWithTimeout(appsScriptUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body,
      }, 12000);
      AuditService.log('sheets.registro.enviado', { fecha: reg.fecha, area: reg.area });
    } catch (e) {
      AuditService.logError('sheets.enviarRegistro', e);
      throw e;
    }
  },

  /**
   * Carga todos los datos desde Sheets en una sola llamada (accion=leer_todo).
   * Retorna registros y maestros ya parseados.
   *
   * @param {string} appsScriptUrl
   * @returns {Promise<SheetsData>}
   * @throws {Error} si la carga falla
   */
  async cargarTodo(appsScriptUrl) {
    try {
      const json = await _fetchWithTimeout(
        `${appsScriptUrl}?accion=leer_todo`,
        {},
        20000
      );
      const todo = json.todo || {};
      return {
        registros: this.parsearRegistros(todo.registros || []),
        maestros:  this.parsearMaestros(todo),
      };
    } catch (e) {
      AuditService.logError('sheets.cargarTodo', e);
      throw e;
    }
  },

  /**
   * Envía un maestro completo a Sheets (reemplaza toda la hoja).
   *
   * @param {string} tipo — clave del maestro (areas, responsables, etc.)
   * @param {any[]}  headers — fila de cabeceras
   * @param {any[][]} rows — filas de datos
   * @param {string} appsScriptUrl
   * @returns {Promise<void>}
   * @throws {Error} si el push falla
   */
  async pushMaestro(tipo, headers, rows, appsScriptUrl) {
    const sheet = MAESTROS_SHEETS[tipo];
    if (!sheet) throw new Error(`Tipo de maestro desconocido: ${tipo}`);
    const body = JSON.stringify({
      accion: 'reemplazar',
      sheet,
      datos: [headers, ...rows],
    });
    try {
      await _fetchWithTimeout(appsScriptUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body,
      });
      AuditService.log('sheets.maestro.publicado', { tipo, filas: rows.length });
    } catch (e) {
      AuditService.logError(`sheets.pushMaestro.${tipo}`, e);
      throw e;
    }
  },

  /**
   * Descarga un maestro específico desde Sheets.
   * Retorna las filas parseadas o null si no hay datos.
   *
   * @param {string} tipo
   * @param {string} appsScriptUrl
   * @returns {Promise<any[]|null>}
   */
  async pullMaestro(tipo, appsScriptUrl) {
    const sheet = MAESTROS_SHEETS[tipo];
    if (!sheet) return null;
    try {
      const json = await _fetchWithTimeout(
        `${appsScriptUrl}?accion=leer&sheet=${encodeURIComponent(sheet)}`
      );
      if (json.status === 'ok' && Array.isArray(json.datos) && json.datos.length > 1) {
        return json.datos.slice(1); // sin fila de cabeceras
      }
      return null;
    } catch (e) {
      AuditService.logError(`sheets.pullMaestro.${tipo}`, e);
      return null;
    }
  },

  /**
   * Carga registros usando la API gviz de Google Sheets.
   * Fallback cuando el Apps Script no está disponible.
   *
   * @param {string} sheetId
   * @param {string} sheetName
   * @returns {Promise<Object[]>} registros parseados
   * @throws {Error} si gviz falla
   */
  async cargarGviz(sheetId, sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text  = await res.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/);
    if (!match) throw new Error('Formato gviz inválido');
    const json = JSON.parse(match[1]);
    const rows = json.table?.rows || [];

    // Determinar si la primera fila es cabecera
    let dataRows = rows;
    if (rows.length > 0) {
      const primerVal = rows[0]?.c?.[0]?.v;
      if (primerVal === null || primerVal === undefined) {
        dataRows = rows.slice(1);
      } else {
        const s = String(primerVal);
        if (!s.startsWith('Date(') && isNaN(Number(s)) && !/^\d{4}-\d{2}-\d{2}/.test(s)) {
          dataRows = rows.slice(1);
        }
      }
    }

    return dataRows.map(row => {
      const c = row.c || [];
      const v = i => c[i]?.v ?? '';
      const fecha = parseGoogleFecha(v(0));
      if (!fecha) return null;
      return {
        fecha,
        hora:          parseGoogleHora(v(1)),
        horaFin:       parseGoogleHora(v(2)),
        area:          String(v(3)),
        responsable:   String(v(4)),
        lotes:         String(v(5)),
        tipo:          String(v(6)),
        contratista:   String(v(7)),
        actividad:     String(v(8)),
        tarea:         String(v(9)),
        nPersonas:     parseInt(v(10)) || 0,
        obs:           String(v(11)),
        registradoPor: String(v(12)),
        timestamp:     String(v(13) || `ts-${Math.random().toString(36).slice(2)}`),
      };
    }).filter(Boolean);
  },

  /**
   * Reemplaza toda la hoja de Registros en Sheets con los datos en memoria.
   * Usado al editar o eliminar registros desde el módulo de Reportes.
   *
   * @param {Object[]} registros — array de registros de S.registros
   * @param {string} appsScriptUrl
   * @returns {Promise<void>}
   * @throws {Error} si el reemplazo falla
   */
  async enviarHojaRegistros(registros, appsScriptUrl) {
    const headers = ['Fecha','Hora Inicio','Hora Término','Área','Responsable','Lote(s)',
                     'Tipo Personal','Contratista','Actividad','Tarea/Meta','N° Personas',
                     'Observaciones','Registrado por','Timestamp'];
    const rows = registros.map(r => [
      r.fecha, r.hora, r.horaFin || '', r.area, r.responsable, r.lotes || '',
      r.tipo, r.contratista || '', r.actividad, r.tarea || '', r.nPersonas,
      r.obs || '', r.registradoPor || '', r.timestamp || '',
    ]);
    const body = JSON.stringify({ accion: 'reemplazar', sheet: 'Registros', datos: [headers, ...rows] });
    try {
      await _fetchWithTimeout(appsScriptUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body,
      });
      AuditService.log('sheets.registros.reemplazados', { total: registros.length });
    } catch (e) {
      AuditService.logError('sheets.enviarHojaRegistros', e);
      throw e;
    }
  },

  /**
   * Parsea el array de filas de registros que devuelve Sheets.
   * Filtra filas vacías o con fecha inválida.
   *
   * @param {any[][]} rows — array de filas (con o sin fila de cabecera)
   * @returns {Object[]}
   */
  parsearRegistros(rows) {
    const dataRows = rows.length > 1 ? rows.slice(1) : [];
    return dataRows.map(r => {
      if (!r || !r[0]) return null;
      const fecha = limpiarFecha(r[0]);
      if (!fecha || fecha.toLowerCase() === 'fecha') return null;
      return {
        fecha,
        hora:          limpiarHora(r[1]),
        horaFin:       limpiarHora(r[2]),
        area:          String(r[3]  || ''),
        responsable:   String(r[4]  || ''),
        lotes:         String(r[5]  || ''),
        tipo:          String(r[6]  || ''),
        contratista:   String(r[7]  || ''),
        actividad:     String(r[8]  || ''),
        tarea:         String(r[9]  || ''),
        nPersonas:     parseInt(r[10]) || 0,
        obs:           String(r[11] || ''),
        registradoPor: String(r[12] || ''),
        timestamp:     String(r[13] || `ts-${Math.random().toString(36).slice(2)}`),
      };
    }).filter(Boolean);
  },

  /**
   * Parsea el objeto `todo` que devuelve accion=leer_todo y extrae los maestros.
   * Solo reemplaza un maestro si Sheets devuelve al menos una fila de datos.
   *
   * @param {Object} todo — json.todo de la respuesta
   * @returns {Object} objeto con claves areas, responsables, cultivos, actividades, contratas
   */
  parsearMaestros(todo) {
    const result = {};
    const tipos  = ['areas', 'responsables', 'cultivos', 'actividades', 'contratas'];
    for (const tipo of tipos) {
      if (todo[tipo]?.length > 1) {
        result[tipo] = todo[tipo].slice(1); // sin cabecera, el monolito aplica rowsToMaestro
      }
    }
    return result;
  },
});
