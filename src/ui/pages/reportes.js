/**
 * @module reportes
 * @description Página de reportes de asistencia.
 *   Maneja tabla de registros, filtros, selección, exportación Excel y PDF.
 *
 * @dependencies
 *   - ../../core/utils.js → fechaCorta, isoHoy
 *
 * @exports
 *   - Reportes.render(): void
 *   - Reportes.filtrar(): Object[]
 *   - Reportes.exportarExcel(): void
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 4)
 */

import { fechaCorta, isoHoy } from '../../core/utils.js';

// Helpers de acceso a estado del monolito
function _getRegistros() {
  if (typeof S !== 'undefined' && Array.isArray(S.registros)) return S.registros;
  if (window.S?.registros) return window.S.registros;
  return [];
}
function _getUsuario() {
  if (typeof S !== 'undefined') return S.usuario;
  return window.S?.usuario;
}
function _getRegSeleccionados() {
  if (typeof regSeleccionados !== 'undefined') return regSeleccionados;
  return new Set();
}


export const Reportes = Object.freeze({

  /** Aplica los filtros activos y retorna los registros filtrados */
  filtrar() {
    const fecha = document.getElementById('fil-fecha')?.value || '';
    const area  = document.getElementById('fil-area')?.value  || '';
    const tipo  = document.getElementById('fil-tipo')?.value  || '';
    const act   = document.getElementById('fil-act')?.value   || '';
    return _getRegistros().filter(r =>
      (!fecha || r.fecha === fecha) &&
      (!area  || r.area === area)   &&
      (!tipo  || r.tipo === tipo)   &&
      (!act   || r.actividad === act)
    );
  },

  /** Renderiza la tabla de reportes con los filtros activos */
  render() {
    const regs    = this.filtrar();
    const cntEl   = document.getElementById('rep-cnt');
    const tbody   = document.getElementById('tbody-rep');
    if (!tbody) return;

    if (cntEl) cntEl.textContent = regs.length + ' registro' + (regs.length !== 1 ? 's' : '') +
      ' · ' + regs.reduce((s, r) => s + (parseInt(r.nPersonas) || 0), 0) + ' personas';

    // Poblar filtros de selects con valores únicos
    const pFil = typeof window.pFil === 'function' ? window.pFil : () => {};
    const all  = _getRegistros();
    pFil('fil-fecha', [...new Set(all.map(r => r.fecha))].sort().reverse(), 'Todas las fechas');
    pFil('fil-area',  [...new Set(all.map(r => r.area))].filter(Boolean).sort(), 'Todas las áreas');
    pFil('fil-act',   [...new Set(all.map(r => r.actividad))].filter(Boolean).sort(), 'Todas las actividades');

    if (!regs.length) {
      tbody.innerHTML = '<tr><td colspan="9"><div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>No se encontraron registros.</div></td></tr>';
      return;
    }

    const isAdmin = _getUsuario()?.rol === 'admin';
    // regSeleccionados vive en el monolito durante la transición
    const regSel  = _getRegSeleccionados();

    tbody.innerHTML = regs.map(r => {
      const idx = _getRegistros().indexOf(r);
      const sel = regSel.has(idx);
      return `<tr id="rep-row-${idx}" style="${sel ? 'background:rgba(16,185,129,.06)' : ''}">
        <td style="text-align:center;width:40px">${isAdmin ? `<input type="checkbox" ${sel ? 'checked' : ''} onchange="toggleRegSel(${idx},this)" style="accent-color:var(--primary);cursor:pointer;width:14px;height:14px">` : ''}</td>
        <td class="mc" style="white-space:nowrap">${fechaCorta(r.fecha)}</td>
        <td class="mc">${r.hora || '—'}</td>
        <td class="mc">${r.horaFin || '—'}</td>
        <td>${r.area}</td>
        <td style="font-weight:500;color:var(--text-main)">${r.responsable}</td>
        <td style="font-family:var(--mono);font-size:11px;color:var(--text-sec)">${r.lotes || '—'}</td>
        <td><span class="pill pill-${r.tipo?.toLowerCase()}">${r.tipo}</span></td>
        <td style="font-size:11px;color:var(--text-sec)">${r.contratista || '—'}</td>
        <td>${r.actividad}</td>
        <td style="font-size:11px;color:var(--text-sec)">${r.tarea || '—'}</td>
        <td style="font-weight:700;text-align:center;font-family:var(--mono);color:var(--green-dark)">${r.nPersonas}</td>
        <td style="font-size:11px;color:var(--text-sec);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.obs || ''}">${r.obs || '—'}</td>
        <td style="text-align:center;width:80px">${isAdmin ? `<div style="display:flex;gap:4px;justify-content:center">
            <button class="ib" onclick="abrirEditReg(${idx})" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
            <button class="ib del" onclick="abrirConfirm('¿Eliminar este registro?',()=>eliminarUnRegistro(${idx}))" title="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>` : '—'}</td>
      </tr>`;
    }).join('');

    const allChk = document.getElementById('chk-all-reg');
    if (allChk) {
      allChk.indeterminate = regSel.size > 0 && regSel.size < regs.length;
      allChk.checked = regSel.size === regs.length && regs.length > 0;
    }
    const delBtn = document.getElementById('rep-del-sel-btn');
    const selCnt = document.getElementById('rep-sel-cnt');
    if (delBtn) delBtn.style.display = (isAdmin && regSel.size > 0) ? '' : 'none';
    if (selCnt) selCnt.textContent = regSel.size;
  },

  /** Exporta los registros filtrados a Excel */
  exportarExcel() {
    const perms   = _getUsuario()?.perms || {};
    const isAdmin = _getUsuario()?.rol === 'admin';
    if (!isAdmin && !perms.exportar) {
      if (typeof window.toast === 'function') window.toast('No tienes permiso para exportar', 'err');
      return;
    }
    const regs = this.filtrar();
    if (!regs.length) {
      if (typeof window.toast === 'function') window.toast('No hay registros para exportar', 'err');
      return;
    }

    const wsData = [['Fecha','Hora Inicio','Hora Término','Área','Responsable','Lote(s)','Tipo Personal','Contratista','Actividad','Tarea/Meta','N° Personas','Observaciones','Registrado por']];
    regs.forEach(r => {
      let dateObj = null;
      if (r.fecha?.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = r.fecha.split('-').map(Number);
        dateObj = new Date(y, m - 1, d);
      }
      wsData.push([dateObj || r.fecha, r.hora || '', r.horaFin || '', r.area, r.responsable, r.lotes,
        r.tipo, r.contratista || '', r.actividad, r.tarea || '', parseInt(r.nPersonas) || 0, r.obs || '', r.registradoPor || '']);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    for (let i = 1; i < wsData.length; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: i, c: 0 });
      if (ws[cellRef] && wsData[i][0] instanceof Date) { ws[cellRef].t = 'd'; ws[cellRef].z = 'DD/MM/YYYY'; }
    }
    ws['!cols'] = [{wch:12},{wch:8},{wch:8},{wch:18},{wch:20},{wch:16},{wch:12},{wch:20},{wch:28},{wch:20},{wch:10},{wch:36},{wch:20}];

    const byTipo = {}, byAct = {};
    regs.forEach(r => {
      byTipo[r.tipo] = (byTipo[r.tipo] || 0) + (parseInt(r.nPersonas) || 0);
      byAct[r.actividad]  = (byAct[r.actividad]  || 0) + (parseInt(r.nPersonas) || 0);
    });
    const resumenData = [['Resumen del reporte'], [''], ['Total registros', regs.length],
      ['Total personas', regs.reduce((s, r) => s + (parseInt(r.nPersonas) || 0), 0)]];
    Object.entries(byTipo).forEach(([k, v]) => resumenData.push([k, v]));
    resumenData.push([''], ['Por actividad', 'Personas']);
    Object.entries(byAct).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => resumenData.push([k, v]));
    const wsR = XLSX.utils.aoa_to_sheet(resumenData);
    wsR['!cols'] = [{wch:30},{wch:15}];

    XLSX.utils.book_append_sheet(wb, ws, 'Registros');
    XLSX.utils.book_append_sheet(wb, wsR, 'Resumen');
    XLSX.writeFile(wb, `campo-mano-obra-${isoHoy()}.xlsx`);
    if (typeof window.toast === 'function') window.toast('Excel exportado', 'ok');
  },
});
