/**
 * @module multi-select
 * @description Motor de selección múltiple (SSM engine) para lotes.
 *   Maneja checkboxes con búsqueda, selección total, tags de selección
 *   y sincronización con el formulario.
 *
 *   Convención de IDs en el HTML:
 *     ssm-wrap-{id}       → contenedor principal
 *     ssm-{id}-input      → input visible con placeholder dinámico
 *     ssm-search-{id}     → input de búsqueda interno (dentro del dropdown)
 *     ssm-list-{id}       → contenedor de opciones
 *     ssm-chk-all-{id}    → checkbox "Seleccionar todos"
 *     ssm-badge-{id}      → badge con conteo
 *     lotes-tags / mob-lotes-tags → contenedor de tags de selección activa
 *
 * @dependencies
 *   (ninguna — recibe los datos de lotes vía ssmLoad)
 *
 * @exports
 *   - ssmLoad(id, lotes): void — carga la lista de lotes disponibles
 *   - ssmOpen(id): void — abre el dropdown
 *   - ssmClose(id): void — cierra el dropdown
 *   - ssmFilter(id, q): void — filtra al escribir
 *   - ssmRender(id, q): void — renderiza la lista filtrada
 *   - ssmToggle(id, n, event): void — marca/desmarca un lote
 *   - ssmToggleAll(id, event): void — marca/desmarca todos los visibles
 *   - ssmUpdateTags(id): void — actualiza los tags de selección
 *   - ssmGetSelected(id): string — retorna string de lotes seleccionados
 *   - ssmReset(id): void — limpia toda la selección
 *   - ssmGetCount(id): number — retorna cantidad de lotes seleccionados
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 3)
 */

// ─────────────────────────────────────────────
// Estado interno del módulo
// ─────────────────────────────────────────────

/** @type {Object.<string, Set<number>>} Lotes seleccionados por ID de instancia */
const _SSM_SEL = {};

/** @type {Object.<string, Object[]>} Lotes disponibles por ID de instancia */
const _SSM_LOTES = {};

// ─────────────────────────────────────────────
// Cierre al hacer clic fuera
// ─────────────────────────────────────────────

document.addEventListener('mousedown', function (e) {
  document.querySelectorAll('.ssm-wrap.ssm-open').forEach(wrap => {
    if (!wrap.contains(e.target)) {
      const id = wrap.id.replace('ssm-wrap-', '');
      ssmClose(id);
    }
  });
}, true);

// ─────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────

/**
 * Carga la lista de lotes disponibles para una instancia del selector.
 * Debe llamarse cada vez que los maestros de cultivos se actualicen.
 *
 * @param {string} id — identificador de la instancia ('lotes' | 'mf-lotes')
 * @param {Object[]} lotes — array de objetos lote { n, cult, modulo, etapa, ha }
 */
export function ssmLoad(id, lotes) {
  _SSM_LOTES[id] = lotes;
}

/**
 * Abre el dropdown del selector.
 * Cierra todos los SS dropdowns antes de abrir.
 * @param {string} id
 */
export function ssmOpen(id) {
  const wrap = document.getElementById('ssm-wrap-' + id);
  const inp  = document.getElementById('ssm-' + id + '-input');
  if (!wrap) return;
  // Cerrar SS dropdowns (importado en monolito via window.AgroPlanner)
  if (typeof window.AgroPlanner?.SS?.ssCloseAll === 'function') {
    window.AgroPlanner.SS.ssCloseAll();
  }
  wrap.classList.add('ssm-open');
  if (inp) { inp.value = ''; inp.placeholder = 'Buscar…'; }
  ssmRender(id, '');
}

/**
 * Cierra el dropdown y actualiza el placeholder con el conteo de selección.
 * @param {string} id
 */
export function ssmClose(id) {
  const wrap = document.getElementById('ssm-wrap-' + id);
  const inp  = document.getElementById('ssm-' + id + '-input');
  wrap?.classList.remove('ssm-open');
  if (inp) {
    const cnt = _SSM_SEL[id]?.size || 0;
    inp.value       = '';
    inp.placeholder = cnt === 0
      ? '--Todos--'
      : cnt + ' lote' + (cnt > 1 ? 's' : '') + ' seleccionado' + (cnt > 1 ? 's' : '');
  }
  ssmUpdateTags(id);
  setTimeout(() => inp?.blur(), 50);
}

/**
 * Filtra la lista al escribir en el input de búsqueda.
 * @param {string} id
 * @param {string} q
 */
export function ssmFilter(id, q) {
  const wrap = document.getElementById('ssm-wrap-' + id);
  if (!wrap?.classList.contains('ssm-open')) ssmOpen(id);
  ssmRender(id, q.toLowerCase().trim());
}

/**
 * Renderiza la lista de lotes filtrados con checkboxes.
 * @param {string} id
 * @param {string} q — query ya en minúsculas
 */
export function ssmRender(id, q) {
  const list = document.getElementById('ssm-list-' + id);
  if (!list) return;
  if (!_SSM_SEL[id]) _SSM_SEL[id] = new Set();
  const sel  = _SSM_SEL[id];
  const todos = _SSM_LOTES[id] || [];

  const filtered = q ? todos.filter(l =>
    String(l.n).includes(q) ||
    (l.cult   || '').toLowerCase().includes(q) ||
    (l.modulo || '').toLowerCase().includes(q) ||
    (l.etapa  || '').toLowerCase().includes(q)
  ) : todos;

  // Actualizar checkbox "Seleccionar todos"
  const allChk = document.getElementById('ssm-chk-all-' + id);
  const badge  = document.getElementById('ssm-badge-' + id);
  const allSel = filtered.length > 0 && filtered.every(l => sel.has(l.n));
  const someSel = filtered.some(l => sel.has(l.n));

  if (allChk) {
    allChk.style.background  = allSel ? 'var(--green-bright)' : someSel ? 'var(--primary-bg)' : '';
    allChk.style.borderColor = (allSel || someSel) ? 'var(--green-bright)' : '';
    allChk.innerHTML = allSel
      ? '<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : someSel
        ? '<svg width="8" height="2" viewBox="0 0 8 2"><line x1="0" y1="1" x2="8" y2="1" stroke="var(--green-dark)" stroke-width="2"/></svg>'
        : '';
  }

  if (badge) badge.textContent = sel.size ? sel.size + '/' + todos.length : todos.length + ' lotes';

  if (!filtered.length) {
    list.innerHTML = '<div class="ss-empty">Sin resultados</div>';
    return;
  }

  list.innerHTML = filtered.map(l => {
    const isSel = sel.has(l.n);
    const chk = isSel
      ? '<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '';
    return `<div class="ssm-opt${isSel ? ' selected' : ''}" onmousedown="window.AgroPlanner.SSM.ssmToggle('${id}',${l.n},event)">
      <span class="ssm-chk">${chk}</span>
      <div class="ssm-opt-info">
        <div class="ssm-opt-main">${l.n} &nbsp;<span style="font-weight:400;color:var(--text-muted)">${l.cult || ''}</span></div>
        <div class="ssm-opt-sub">${l.modulo || ''} · ${l.etapa || ''}</div>
      </div>
      ${l.ha ? `<span class="ssm-opt-ha">${parseFloat(l.ha).toFixed(2)} ha</span>` : ''}
    </div>`;
  }).join('');
}

/**
 * Marca o desmarca un lote individual.
 * @param {string} id
 * @param {number} n — número de lote
 * @param {Event} [event]
 * @param {Function} [onToggle] — callback opcional (para saveDraft)
 */
export function ssmToggle(id, n, event, onToggle) {
  if (event) event.preventDefault();
  if (!_SSM_SEL[id]) _SSM_SEL[id] = new Set();
  const sel = _SSM_SEL[id];
  if (sel.has(n)) sel.delete(n); else sel.add(n);
  const q = document.getElementById('ssm-search-' + id)?.value || '';
  ssmRender(id, q.toLowerCase().trim());
  ssmUpdateTags(id);
  if (typeof onToggle === 'function') onToggle(id);
}

/**
 * Marca o desmarca todos los lotes visibles (según filtro activo).
 * @param {string} id
 * @param {Event} [event]
 */
export function ssmToggleAll(id, event) {
  if (event) event.preventDefault();
  if (!_SSM_SEL[id]) _SSM_SEL[id] = new Set();
  const sel  = _SSM_SEL[id];
  const q    = (document.getElementById('ssm-search-' + id)?.value || '').toLowerCase().trim();
  const todos = _SSM_LOTES[id] || [];
  const filtered = q ? todos.filter(l =>
    String(l.n).includes(q) ||
    (l.cult   || '').toLowerCase().includes(q) ||
    (l.modulo || '').toLowerCase().includes(q)
  ) : todos;
  const allSel = filtered.every(l => sel.has(l.n));
  if (allSel) filtered.forEach(l => sel.delete(l.n));
  else        filtered.forEach(l => sel.add(l.n));
  ssmRender(id, q);
  ssmUpdateTags(id);
}

/**
 * Actualiza los tags de selección activa y el placeholder del input.
 * @param {string} id
 */
export function ssmUpdateTags(id) {
  const tagsId  = id === 'lotes' ? 'lotes-tags' : 'mob-lotes-tags';
  const tags    = document.getElementById(tagsId);
  if (!tags) return;
  const sel = _SSM_SEL[id] || new Set();
  const cnt = sel.size;
  const inp = document.getElementById('ssm-' + id + '-input');

  if (inp && !document.getElementById('ssm-wrap-' + id)?.classList.contains('ssm-open')) {
    inp.placeholder = cnt === 0
      ? '--Todos--'
      : cnt + ' lote' + (cnt > 1 ? 's' : '') + ' seleccionado' + (cnt > 1 ? 's' : '');
  }

  const clearBtnId = id === 'lotes' ? 'lotes-clear-btn' : 'mf-lotes-clear-btn';
  const clearBtn   = document.getElementById(clearBtnId);
  if (clearBtn) clearBtn.style.display = cnt > 0 ? '' : 'none';

  if (cnt === 0) { tags.innerHTML = ''; return; }

  const todos  = _SSM_LOTES[id] || [];
  const selArr = todos.filter(l => sel.has(l.n));

  tags.innerHTML = selArr.map(l =>
    `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--primary-bg);color:var(--green-dark);border:1px solid var(--primary-b);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600">${l.n}<button type="button" onmousedown="window.AgroPlanner.SSM.ssmToggle('${id}',${l.n},event)" style="background:none;border:none;cursor:pointer;color:var(--green-mid);padding:0;font-size:13px;line-height:1;display:flex">&times;</button></span>`
  ).join(' ');
}

/**
 * Retorna los lotes seleccionados como string separado por comas, ordenados.
 * @param {string} id
 * @returns {string} ej: "3, 7, 12"
 */
export function ssmGetSelected(id) {
  const sel = _SSM_SEL[id] || new Set();
  return [...sel].sort((a, b) => a - b).join(', ');
}

/**
 * Retorna la cantidad de lotes seleccionados.
 * @param {string} id
 * @returns {number}
 */
export function ssmGetCount(id) {
  return _SSM_SEL[id]?.size || 0;
}

/**
 * Limpia completamente la selección de una instancia.
 * @param {string} id
 */
export function ssmReset(id) {
  _SSM_SEL[id] = new Set();
  const inp = document.getElementById('ssm-' + id + '-input');
  if (inp) { inp.value = ''; inp.placeholder = '--Todos--'; }
  document.getElementById('ssm-wrap-' + id)?.classList.remove('ssm-open');
  const tagsId   = id === 'lotes' ? 'lotes-tags' : 'mob-lotes-tags';
  const tags     = document.getElementById(tagsId);
  if (tags) tags.innerHTML = '';
  const clearBtnId = id === 'lotes' ? 'lotes-clear-btn' : 'mf-lotes-clear-btn';
  const clearBtn   = document.getElementById(clearBtnId);
  if (clearBtn) clearBtn.style.display = 'none';
}

/**
 * Carga los lotes seleccionados desde un array (usado al restaurar drafts).
 * @param {string} id
 * @param {number[]} nums — array de números de lote
 */
export function ssmSetSelected(id, nums) {
  _SSM_SEL[id] = new Set(nums);
  ssmUpdateTags(id);
}
