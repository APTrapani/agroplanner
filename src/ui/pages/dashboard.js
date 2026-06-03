/**
 * @module dashboard
 * @description Página principal del dashboard de campo.
 *   Maneja KPIs, gráficos de actividad, evolución semanal,
 *   tabla resumen y filtros del período.
 *
 * @dependencies
 *   - ../../core/utils.js → fechaLarga, isoHoy
 *
 * @exports
 *   - Dashboard.render(): void
 *   - Dashboard.initFiltros(): void
 *   - Dashboard.getSegFiltro(): Function
 *   - Dashboard.renderDonut(propio, contrata, total): void
 *   - Dashboard.renderBars(id, obj, grads, limit, desglose): void
 *   - Dashboard.renderEvolucion(): void
 *   - Dashboard.renderResumen(regs): void
 *   - Dashboard.renderStackedAct(byADesglose): void
 *   - Dashboard.renderBarsResp(byResp): void
 *   - Dashboard.renderDualColBars(containerId, entries, allContratas, maxVal, colors): void
 *   - Dashboard.animCount(id, target): void
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 4)
 */

import { fechaLarga, isoHoy } from '../../core/utils.js';

// ─────────────────────────────────────────────
// Helpers de acceso al estado global
// Fase 6: window.S y window.DB son ahora la única fuente de verdad.
// ─────────────────────────────────────────────
function _getRegistros() {
  return window.S?.registros || [];
}
function _getMaestroActividades() {
  return window.DB?.maestros?.actividades || [];
}


// ─────────────────────────────────────────────
// Constantes de color
// ─────────────────────────────────────────────

const GRAD_ACT = [
  'linear-gradient(90deg,#4a9960,#1a3320)',
  'linear-gradient(90deg,#7ec896,#2d5a3d)',
  'linear-gradient(90deg,#34d399,#059669)',
  'linear-gradient(90deg,#6ee7b7,#10b981)',
  'linear-gradient(90deg,#a7f3d0,#34d399)',
];
const GRAD_AREA = [
  'linear-gradient(90deg,#b45309,#92400e)',
  'linear-gradient(90deg,#fbbf24,#b45309)',
  'linear-gradient(90deg,#fcd34d,#d97706)',
  'linear-gradient(90deg,#fde68a,#f59e0b)',
];
const GRAD_RESP = [
  'linear-gradient(90deg,#1d4ed8,#1e3a8a)',
  'linear-gradient(90deg,#60a5fa,#2563eb)',
  'linear-gradient(90deg,#93c5fd,#3b82f6)',
  'linear-gradient(90deg,#bfdbfe,#60a5fa)',
];
const COLOR_PROPIO   = '#4a9960';
const CONTRATA_COLORS = ['#b45309','#d97706','#c2410c','#9d174d','#6d28d9','#0e7490','#065f46','#1e40af'];

// ─────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────

export const Dashboard = Object.freeze({

  /** Inicializa los filtros de fecha del dashboard */
  initFiltros() {
    const fd = document.getElementById('fil-dash-desde');
    const fh = document.getElementById('fil-dash-hasta');
    const hoy = isoHoy();
    if (fd && !fd.value) fd.value = hoy;
    if (fh && !fh.value) fh.value = hoy;
    if (!document.querySelector('#ss-list-fil-dash-act .ss-opt')) {
      const acts = (_getMaestroActividades() || [])
        .map(a => typeof a === 'string' ? a : (a.actividad || '')).filter(Boolean);
      if (typeof window.ssLoad === 'function') window.ssLoad('fil-dash-act', acts);
    }
  },

  /** Retorna la función de filtro activa según los controles del dashboard */
  getSegFiltro() {
    const hoy   = isoHoy();
    const desde = document.getElementById('fil-dash-desde')?.value || hoy;
    const hasta = document.getElementById('fil-dash-hasta')?.value || hoy;
    const act   = document.getElementById('fil-dash-act')?.value || '';
    return r => {
      if (r.fecha < desde || r.fecha > hasta) return false;
      if (act && r.actividad !== act) return false;
      return true;
    };
  },

  /** Renderiza el dashboard completo */
  render() {
    const titleEl = document.getElementById('inicio-fecha');
    if (titleEl) titleEl.textContent = fechaLarga();
    this.initFiltros();

    const filtro  = this.getSegFiltro();
    const regs    = _getRegistros().filter(filtro);
    const total   = regs.reduce((s, r) => s + (parseInt(r.nPersonas) || 0), 0);
    const propio  = regs.filter(r => r.tipo === 'Propio').reduce((s, r) => s + (parseInt(r.nPersonas) || 0), 0);
    const contrata = regs.filter(r => r.tipo === 'Contrata').reduce((s, r) => s + (parseInt(r.nPersonas) || 0), 0);
    const pctP = total ? Math.round(propio / total * 100) : 0;
    const pctC = total ? Math.round(contrata / total * 100) : 0;

    // KPIs
    this.animCount('k-total', total);
    this.animCount('k-propio', propio);
    this.animCount('k-contrata', contrata);

    const kTotalH = document.getElementById('k-total-h');
    const kPP     = document.getElementById('k-pp');
    const kCP     = document.getElementById('k-cp');
    if (kTotalH) kTotalH.innerHTML = total
      ? `<span class="kpi-badge neutral">${regs.length} registros</span>`
      : '<span style="color:var(--text-muted)">Sin actividad</span>';
    if (kPP) kPP.innerHTML = total
      ? `<span class="kpi-badge up">${pctP}% del total</span>`
      : '<span style="color:var(--text-muted)">—</span>';
    if (kCP) kCP.innerHTML = total
      ? `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:#fef3c7;color:#b45309;display:inline-flex;align-items:center;gap:3px">${pctC}% del total</span>`
      : '<span style="color:var(--text-muted)">—</span>';

    setTimeout(() => {
      const pp = document.getElementById('k-propio-prog');
      const cp = document.getElementById('k-contrata-prog');
      if (pp) pp.style.width = pctP + '%';
      if (cp) cp.style.width = pctC + '%';
    }, 100);

    // Datos agrupados
    const byA = {}, byArea = {}, byResp = {};
    regs.forEach(r => {
      if (r.actividad) byA[r.actividad] = (byA[r.actividad] || 0) + (parseInt(r.nPersonas) || 0);
      if (r.area)      byArea[r.area]   = (byArea[r.area]   || 0) + (parseInt(r.nPersonas) || 0);
      if (r.responsable) {
        const np = parseInt(r.nPersonas) || 0;
        if (!byResp[r.responsable]) byResp[r.responsable] = { propio: 0, contrata: 0, contratas: {}, total: 0 };
        byResp[r.responsable].total += np;
        if (r.tipo === 'Propio') byResp[r.responsable].propio += np;
        else if (r.tipo === 'Contrata') {
          byResp[r.responsable].contrata += np;
          const c = r.contratista || 'Sin contratista';
          byResp[r.responsable].contratas[c] = (byResp[r.responsable].contratas[c] || 0) + np;
        }
      }
    });

    // Foco operativo
    const focoEl   = document.getElementById('k-foco');
    const focoH    = document.getElementById('k-foco-h');
    const focoProg = document.getElementById('k-foco-prog');
    const actEntries = Object.entries(byA);
    if (actEntries.length && total) {
      const [focoAct, focoCnt] = actEntries.reduce((a, b) => b[1] > a[1] ? b : a);
      const focoPct = Math.round(focoCnt / total * 100);
      if (focoEl) focoEl.textContent = focoAct;
      if (focoH) focoH.innerHTML = `<div style="display:flex;flex-direction:column;gap:4px;margin-top:2px">
        <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(74,153,96,.1);border:1px solid rgba(74,153,96,.25);color:#2d7a4e;border-radius:20px;padding:3px 10px;font-size:10px;font-weight:600;width:fit-content">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:10px;height:10px"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          ${focoPct}% del personal
        </span>
        <span style="font-size:11px;color:var(--text-sec)">${focoCnt} trabajadores activos</span>
      </div>`;
      setTimeout(() => { if (focoProg) focoProg.style.width = focoPct + '%'; }, 100);
    } else {
      if (focoEl) focoEl.textContent = '—';
      if (focoH) focoH.innerHTML = '<span style="color:var(--text-muted)">Sin actividad</span>';
      if (focoProg) focoProg.style.width = '0%';
    }

    // Desglose propio/contrata por actividad
    const byADesglose = {};
    regs.forEach(r => {
      const key = r.actividad || 'Sin actividad';
      if (!byADesglose[key]) byADesglose[key] = { propio: 0, contrata: 0, contratas: {} };
      const np = parseInt(r.nPersonas) || 0;
      if (r.tipo === 'Propio') byADesglose[key].propio += np;
      else if (r.tipo === 'Contrata') {
        byADesglose[key].contrata += np;
        const c = r.contratista || 'Sin contratista';
        byADesglose[key].contratas[c] = (byADesglose[key].contratas[c] || 0) + np;
      }
    });

    // Renderizar gráficos
    this.renderAreaPie(byArea);
    this.renderEvolucion();
    this.renderResumen(regs);
    this.renderDonut(propio, contrata, total);
    requestAnimationFrame(() => {
      this.renderStackedAct(byADesglose);
      this.renderBarsResp(byResp);

    });
  },

  /** Animación de conteo en KPIs */
  animCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el._animT) clearInterval(el._animT);
    const start = parseInt(el.textContent) || 0;
    const dur = 400, steps = 20, inc = (target - start) / steps;
    let cur = start, step = 0;
    el._animT = setInterval(() => {
      step++;
      cur += inc;
      el.textContent = step >= steps ? target : Math.round(cur);
      if (step >= steps) clearInterval(el._animT);
    }, dur / steps);
  },

  /** Gráfico donut propio/contrata */
  renderDonut(propio, contrata, total) {
    const svg    = document.getElementById('donut-svg');
    const legend = document.getElementById('donut-legend');
    if (!svg || !legend) return;
    const cx = 55, cy = 55, r = 40, stroke = 14;
    svg.setAttribute('viewBox', '-1 -1 112 112');
    const circ = 2 * Math.PI * r;
    if (!total) {
      svg.innerHTML = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border-base)" stroke-width="${stroke}"/>
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="var(--text-label)" font-family="var(--font)">Sin datos</text>`;
      legend.innerHTML = '';
      return;
    }
    const pP = propio / total, pC = contrata / total;
    const dP = circ * pP, dC = circ * pC;
    const offP = circ * 0.25, offC = offP - dP;
    svg.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border-base)" stroke-width="${stroke}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#gP)" stroke-width="${stroke}"
        stroke-dasharray="${dP} ${circ - dP}" stroke-dashoffset="${offP}" stroke-linecap="round"
        style="transition:stroke-dasharray .6s ease"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#gC)" stroke-width="${stroke}"
        stroke-dasharray="${dC} ${circ - dC}" stroke-dashoffset="${offC}" stroke-linecap="round"
        style="transition:stroke-dasharray .6s ease"/>
      <defs>
        <linearGradient id="gP" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#4a9960"/><stop offset="100%" stop-color="#1a3320"/>
        </linearGradient>
        <linearGradient id="gC" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#fcd34d"/><stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
      </defs>
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" dominant-baseline="middle" font-size="18" font-weight="700" fill="var(--green-dark)" font-family="var(--mono)">${total}</text>
      <text x="${cx}" y="${cy + 10}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="var(--text-label)" font-family="var(--font)">total</text>`;
    const pctP = Math.round(pP * 100), pctC = Math.round(pC * 100);
    legend.innerHTML = `
      <div class="donut-leg-item"><div class="donut-leg-dot" style="background:var(--green-bright)"></div>
        <span class="donut-leg-label">Propio</span><span class="donut-leg-val">${propio}</span><span class="donut-leg-pct">${pctP}%</span></div>
      <div class="donut-leg-item"><div class="donut-leg-dot" style="background:#b45309"></div>
        <span class="donut-leg-label">Contrata</span><span class="donut-leg-val">${contrata}</span><span class="donut-leg-pct">${pctC}%</span></div>`;
  },

  /** Barras horizontales genéricas */
  renderBars(id, obj, grads, limit = 999, desglose = null) {
    const el = document.getElementById(id);
    if (!el) return;
    const en = Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, limit);
    if (!en.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:.5rem 0">Sin datos para el período.</div>'; return; }
    const mx = Math.max(...en.map(e => e[1]), 1);
    el.innerHTML = en.map(([k, v], i) => {
      const d = desglose ? desglose[k] : null;
      let subtext = '';
      if (d) {
        const parts = [];
        if (d.propio > 0) parts.push(`<span style="color:#16a34a;font-weight:600">${d.propio} propio</span>`);
        if (d.contratas && Object.keys(d.contratas).length) {
          for (const [cont, cnt] of Object.entries(d.contratas)) {
            parts.push(`<span style="color:#b45309;font-weight:600">${cnt} ${cont || 'contrata'}</span>`);
          }
        } else if (d.contrata) {
          parts.push(`<span style="color:#b45309;font-weight:600">${d.contrata} contrata</span>`);
        }
        if (parts.length) subtext = `<div style="font-size:10px;color:var(--text-label);margin-top:2px;display:flex;flex-wrap:wrap;gap:6px">${parts.join('')}</div>`;
      }
      return `<div class="bar-row" style="align-items:flex-start;margin-bottom:${subtext ? 14 : 10}px">
        <div style="width:160px;flex-shrink:0">
          <div class="bar-name" title="${k}" style="width:100%;white-space:normal;line-height:1.3;font-size:11px">${k}</div>
          ${subtext}
        </div>
        <div style="flex:1;padding-top:3px">
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round(v / mx * 100)}%;background:${grads[i % grads.length]}"></div></div>
        </div>
        <span class="bar-val" style="padding-top:2px">${v}</span>
      </div>`;
    }).join('');
  },

  /** Pie chart de áreas — delegada a renderAreaPie del monolito */
  renderAreaPie(byArea) {
    if (typeof window.renderAreaPie === 'function') {
      window.renderAreaPie(byArea);
    }
  },

  /** Barras apiladas por actividad — delegada a renderStackedActImpl del monolito */
  renderStackedAct(byADesglose) {
    if (typeof window.renderStackedActImpl === 'function') {
      window.renderStackedActImpl(byADesglose);
    }
  },

  /** Barras de responsables — delegada a renderBarsRespImpl del monolito */
  renderBarsResp(byResp) {
    if (typeof window.renderBarsRespImpl === 'function') {
      window.renderBarsRespImpl(byResp);
    }
  },

  /** Barras duales — delega al monolito para usar su implementación */
  renderDualColBars(containerId, entries, allContratas, maxVal, colors) {
    if (typeof _renderDualColBarsOriginal === 'function') {
      _renderDualColBarsOriginal(containerId, entries, allContratas, maxVal, colors); return;
    }
    // Fallback simplificado
    const el = document.getElementById(containerId);
    if (!el) return;
  },

  /** Gráfico de evolución semanal */
  renderEvolucion() {
    const svg = document.getElementById('evolucion-svg');
    if (!svg) return;
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const pad = n => String(n).padStart(2, '0');
      dias.push(d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()));
    }
    const registros = _getRegistros();
    const datos = dias.map(f => {
      const regsD = registros.filter(r => r.fecha === f);
      return {
        fecha:   f,
        total:   regsD.reduce((s, r) => s + (parseInt(r.nPersonas) || 0), 0),
        propio:  regsD.filter(r => r.tipo === 'Propio').reduce((s, r) => s + (parseInt(r.nPersonas) || 0), 0),
        contrata:regsD.filter(r => r.tipo === 'Contrata').reduce((s, r) => s + (parseInt(r.nPersonas) || 0), 0),
      };
    });
    const W = svg.clientWidth || svg.parentElement?.clientWidth || 600, H = 160;
    const padL = 36, padR = 16, padT = 16, padB = 32;
    const w = W - padL - padR, h = H - padT - padB;
    const maxV  = Math.max(...datos.map(d => d.total), 1);
    const stepX = w / (datos.length - 1);
    const xp = i => padL + i * stepX;
    const yp = v => padT + h - (v / maxV * h);
    const smoothPath = pts => {
      if (pts.length < 2) return '';
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const x0 = pts[i][0], y0 = pts[i][1], x1 = pts[i+1][0], y1 = pts[i+1][1];
        const cpx = x0 + (x1 - x0) * 0.5;
        d += ` C${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
      }
      return d;
    };
    const ptsTotal = datos.map((d, i) => [xp(i), yp(d.total)]);
    const ptsP     = datos.map((d, i) => [xp(i), yp(d.propio)]);
    const ptsC     = datos.map((d, i) => [xp(i), yp(d.contrata)]);
    const pathTotal = smoothPath(ptsTotal);
    const lastPt = ptsTotal[ptsTotal.length - 1], firstPt = ptsTotal[0];
    const areaPath = pathTotal + ` L${lastPt[0].toFixed(1)},${(padT+h).toFixed(1)} L${firstPt[0].toFixed(1)},${(padT+h).toFixed(1)} Z`;
    const labelX = datos.map((d, i) => {
      const [, mm, dd] = d.fecha.split('-');
      return `<text x="${xp(i).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="9" fill="var(--text-label)" font-family="var(--font)">${dd}/${mm}</text>`;
    }).join('');
    const yTicks = [0, Math.round(maxV / 2), maxV];
    const gridLines = yTicks.map(v => `
      <line x1="${padL}" y1="${yp(v).toFixed(1)}" x2="${W - padR}" y2="${yp(v).toFixed(1)}" stroke="var(--border-base)" stroke-width="1" stroke-dasharray="3,3"/>
      <text x="${padL - 6}" y="${(yp(v) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--text-label)" font-family="var(--mono)">${v}</text>`).join('');
    const dots = datos.map((d, i) => {
      if (d.total === 0) return '';
      return `<circle cx="${ptsTotal[i][0].toFixed(1)}" cy="${ptsTotal[i][1].toFixed(1)}" r="4" fill="var(--green-dark)" stroke="#fff" stroke-width="2">
        <title>${d.fecha}: ${d.total} personas (P:${d.propio} / C:${d.contrata})</title></circle>`;
    }).join('');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `
      <defs><linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--green-bright)" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="var(--green-bright)" stop-opacity="0.02"/>
      </linearGradient></defs>
      ${gridLines}
      <path d="${areaPath}" fill="url(#gradArea)"/>
      <path d="${smoothPath(ptsC)}" fill="none" stroke="#fcd34d" stroke-width="1.5" stroke-dasharray="4,3" stroke-linecap="round" opacity=".8"/>
      <path d="${smoothPath(ptsP)}" fill="none" stroke="#4a9960" stroke-width="1.5" stroke-linecap="round" opacity=".9"/>
      <path d="${pathTotal}" fill="none" stroke="var(--green-dark)" stroke-width="2.5" stroke-linecap="round"/>
      ${dots}${labelX}`;
    const leyWrap = document.getElementById('evolucion-wrap');
    if (leyWrap && !document.getElementById('evol-leyenda')) {
      const ley = document.createElement('div');
      ley.id = 'evol-leyenda';
      ley.style.cssText = 'display:flex;gap:1.25rem;margin-top:.5rem;font-size:11px;color:var(--text-sec)';
      ley.innerHTML = `
        <span style="display:flex;align-items:center;gap:5px"><span style="width:16px;height:3px;background:var(--green-dark);border-radius:2px;display:inline-block"></span>Total</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="width:16px;height:3px;background:#4a9960;border-radius:2px;display:inline-block"></span>Propio</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="width:16px;height:3px;background:#fcd34d;border-radius:2px;border:1px dashed #b45309;display:inline-block"></span>Contrata</span>`;
      leyWrap.appendChild(ley);
    }
  },

  /** Tabla resumen por actividad */
  renderResumen(regs) {
    const tbody = document.getElementById('tbody-resumen');
    if (!tbody) return;
    if (!regs.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="m-empty">Sin datos para el período.</td></tr>`;
      return;
    }
    const map = {};
    regs.forEach(r => {
      const key = r.actividad || 'Sin actividad';
      if (!map[key]) map[key] = { actividad: key, lotes: new Set(), personas: 0, propio: 0, contrata: 0, contratasMap: {} };
      const np = parseInt(r.nPersonas) || 0;
      map[key].personas += np;
      if (r.lotes) String(r.lotes).match(/\d+/g)?.forEach(n => map[key].lotes.add(n));
      if (r.tipo === 'Propio') map[key].propio += np;
      else if (r.tipo === 'Contrata') {
        map[key].contrata += np;
        const c = r.contratista || 'Sin contratista';
        map[key].contratasMap[c] = (map[key].contratasMap[c] || 0) + np;
      }
    });
    const CONT_PALETTE = [
      { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
      { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
      { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
      { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' },
      { bg: '#fdf2f8', color: '#9d174d', border: '#fbcfe8' },
    ];
    const allContNames = [...new Set(regs.filter(r => r.tipo === 'Contrata').map(r => r.contratista || 'Sin contratista'))];
    tbody.innerHTML = Object.values(map).sort((a, b) => b.personas - a.personas).map(r => {
      const contDetalle = r.contrata
        ? Object.entries(r.contratasMap).map(([c, n]) => {
            const pal = CONT_PALETTE[allContNames.indexOf(c) % CONT_PALETTE.length];
            return `<span style="display:inline-flex;align-items:center;gap:3px;background:${pal.bg};color:${pal.color};border:1px solid ${pal.border};border-radius:12px;padding:1px 7px;font-size:10px;font-weight:600;white-space:nowrap">${c}: ${n}</span>`;
          }).join(' ')
        : '—';
      return `<tr>
        <td style="font-weight:500;color:var(--text-main)">${r.actividad}</td>
        <td style="font-family:var(--mono);color:var(--text-sec);font-size:11px">${[...r.lotes].sort((a, b) => +a - +b).join(', ') || '—'}</td>
        <td style="text-align:center;font-weight:700;font-size:12px;font-family:var(--mono);color:var(--green-dark)">${r.personas}</td>
        <td style="text-align:center;color:#16a34a;font-weight:600;font-family:var(--mono)">${r.propio || '—'}</td>
        <td style="text-align:center;color:#b45309;font-weight:600;font-family:var(--mono)">${r.contrata || '—'}</td>
        <td style="font-size:11px">${contDetalle}</td>
      </tr>`;
    }).join('');
  },
});
