/**
 * @module multi-select-filter
 * @description Componente de selección múltiple con checkboxes para los filtros
 *   del dashboard (Área y Actividad). Soporta búsqueda, tags visibles y
 *   comportamiento cascada entre filtros.
 *
 *   Convención de IDs:
 *     msf-wrap-{id}      → contenedor principal
 *     msf-input-{id}     → input visible (placeholder dinámico)
 *     msf-drop-{id}      → dropdown con lista
 *     msf-search-{id}    → input de búsqueda
 *     msf-list-{id}      → contenedor de opciones
 *     msf-tags-{id}      → contenedor de tags seleccionados
 *
 * @exports
 *   - MSF.load(id, opciones): void
 *   - MSF.open(id): void
 *   - MSF.close(id): void
 *   - MSF.filter(id, q): void
 *   - MSF.toggle(id, val): void
 *   - MSF.clear(id): void
 *   - MSF.getSelected(id): string[]
 *   - MSF.getCount(id): number
 *
 * @changelog
 *   - 2025-06-03 · Creación inicial
 */

// ─────────────────────────────────────────────
// Estado interno
// ─────────────────────────────────────────────

const _state = {};  // { [id]: { opciones: string[], seleccionados: Set<string> } }

function _get(id) {
  if (!_state[id]) _state[id] = { opciones: [], seleccionados: new Set() };
  return _state[id];
}

// ─────────────────────────────────────────────
// Cierre al hacer clic fuera
// ─────────────────────────────────────────────

document.addEventListener('mousedown', e => {
  document.querySelectorAll('.msf-wrap.msf-open').forEach(wrap => {
    if (!wrap.contains(e.target)) {
      const id = wrap.id.replace('msf-wrap-', '');
      MSF.close(id);
    }
  });
}, true);

// ─────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────

export const MSF = Object.freeze({

  /** Carga opciones disponibles */
  load(id, opciones) {
    _get(id).opciones = opciones || [];
  },

  /** Abre el dropdown */
  open(id) {
    const wrap = document.getElementById('msf-wrap-' + id);
    if (!wrap) return;
    wrap.classList.add('msf-open');
    // Mostrar el input visible al abrir (puede estar oculto si hay tags)
    const inp = document.getElementById('msf-input-' + id);
    if (inp) { inp.style.display = ''; inp.placeholder = 'Buscar…'; }
    const search = document.getElementById('msf-search-' + id);
    if (search) { search.value = ''; search.focus(); }
    this._renderList(id, '');
  },

  /** Cierra el dropdown y actualiza placeholder */
  close(id) {
    const wrap = document.getElementById('msf-wrap-' + id);
    wrap?.classList.remove('msf-open');
    this._renderTags(id);
    this._updatePlaceholder(id);
  },

  /** Filtra la lista al escribir */
  filter(id, q) {
    this._renderList(id, q.toLowerCase().trim());
  },

  /** Marca o desmarca una opción */
  toggle(id, val, onchange) {
    const s = _get(id).seleccionados;
    if (s.has(val)) s.delete(val); else s.add(val);
    const q = document.getElementById('msf-search-' + id)?.value || '';
    this._renderList(id, q.toLowerCase().trim());
    this._renderTags(id);
    this._updatePlaceholder(id);
    if (typeof onchange === 'function') onchange(id);
    // Disparar renderInicio via window para respetar el bridge del monolito
    if (typeof window.renderInicio === 'function') window.renderInicio();
  },

  /** Limpia toda la selección */
  clear(id, onchange) {
    _get(id).seleccionados.clear();
    this._renderList(id, '');
    this._renderTags(id);
    this._updatePlaceholder(id);
    if (typeof onchange === 'function') onchange(id);
    if (typeof window.renderInicio === 'function') window.renderInicio();
  },

  /** Retorna array de valores seleccionados */
  getSelected(id) {
    return [..._get(id).seleccionados];
  },

  /** Retorna cantidad de seleccionados */
  getCount(id) {
    return _get(id).seleccionados.size;
  },

  // ─── Privados ───

  _renderList(id, q) {
    const list = document.getElementById('msf-list-' + id);
    if (!list) return;
    const { opciones, seleccionados } = _get(id);
    const filtered = q ? opciones.filter(o => o.toLowerCase().includes(q)) : opciones;

    if (!filtered.length) {
      list.innerHTML = '<div style="padding:8px 12px;font-size:12px;color:var(--text-muted)">Sin resultados</div>';
      return;
    }

    list.innerHTML = filtered.map(o => {
      const checked = seleccionados.has(o);
      const chkIcon = checked
        ? `<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : '';
      return `<div class="msf-opt${checked ? ' selected' : ''}"
        onmousedown="event.preventDefault();window.AgroPlanner.MSF.toggle('${id}','${o.replace(/'/g, "\\'")}')">
        <span class="msf-chk">${chkIcon}</span>
        <span class="msf-opt-label">${o}</span>
      </div>`;
    }).join('');
  },

  _renderTags(id) {
    const tags = document.getElementById('msf-tags-' + id);
    if (!tags) return;
    const sel = [..._get(id).seleccionados];
    if (!sel.length) { tags.innerHTML = ''; return; }
    tags.innerHTML = sel.map(v =>
      `<span class="msf-tag">
        ${v}
        <button type="button" onmousedown="event.preventDefault();window.AgroPlanner.MSF.toggle('${id}','${v.replace(/'/g, "\\'")}')">&times;</button>
      </span>`
    ).join('');
  },

  _updatePlaceholder(id) {
    const inp  = document.getElementById('msf-input-' + id);
    const wrap = document.getElementById('msf-wrap-' + id);
    if (!inp) return;
    const cnt = _get(id).seleccionados.size;
    // Ocultar input de texto cuando los tags están visibles
    inp.style.display = cnt > 0 ? 'none' : '';
    inp.placeholder   = '--Todas--';
    if (wrap) wrap.classList.toggle('msf-has-value', cnt > 0);
  },
});
