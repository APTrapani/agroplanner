/**
 * @module nav
 * @description Navegación entre páginas, sidebar y arranque de la aplicación.
 *   Centraliza toda la lógica de routing del lado del cliente.
 *
 * @dependencies
 *   - window.S → usuario activo y permisos
 *
 * @exports
 *   - Nav.goPage(id, btn): void
 *   - Nav.goConfigSection(seccion, btn): void
 *   - Nav.toggleSidebar(): void
 *   - Nav.applySidebarState(): void
 *   - Nav.toggleCfgMenu(btn): void
 *   - Nav.toggleFiltros(): void
 *
 * @changelog
 *   - 2025-06-02 · Creación inicial (Fase 6)
 */

const SIDEBAR_KEY = 'sb_pinned';

export const Nav = Object.freeze({

  /** Navega a una página principal */
  goPage(id, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + id)?.classList.add('active');
    if (btn) btn.classList.add('active');
    if (id === 'inicio')   window.renderInicio?.();
    if (id === 'nuevo')    window.initForm?.();
    if (id === 'reportes') window.renderReportes?.();
  },

  /** Navega a una sección de configuración */
  goConfigSection(seccion, btn) {
    if (typeof goConfigSection === 'function') { goConfigSection(seccion, btn); return; }
    // Fallback directo
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-config')?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-config')?.classList.add('active');
    document.querySelectorAll('.cfg-sub').forEach(b => b.classList.remove('active'));
    const navBtn = btn || document.getElementById('cfg-nav-' + seccion);
    if (navBtn) navBtn.classList.add('active');
  },

  /** Alterna el sidebar entre fijo y colapsado */
  toggleSidebar() {
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    const pinned = sb.classList.toggle('pinned');
    try { localStorage.setItem(SIDEBAR_KEY, pinned ? '1' : '0'); } catch {}
  },

  /** Aplica el estado guardado del sidebar al cargar */
  applySidebarState() {
    if (typeof applySidebarState === 'function') { applySidebarState(); return; }
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    try {
      const v = localStorage.getItem(SIDEBAR_KEY);
      if (v === '1') sb.classList.add('pinned');
    } catch {}
  },

  /** Abre o cierra el submenú de Configuración */
  toggleCfgMenu(btn) {
    if (typeof toggleCfgMenu === 'function') { toggleCfgMenu(btn); return; }
    const sub  = document.getElementById('cfg-submenu');
    const chev = document.getElementById('cfg-chevron');
    if (!sub) return;
    const open = sub.style.display !== 'none';
    sub.style.display   = open ? 'none' : 'block';
    if (chev) chev.style.transform = open ? '' : 'rotate(180deg)';
  },

  /** Alterna el panel de filtros del dashboard */
  toggleFiltros() {
    if (typeof toggleFiltros === 'function') { toggleFiltros(); return; }
    const body = document.getElementById('filtros-body');
    const chev = document.getElementById('filtros-chevron');
    if (!body) return;
    const open = body.style.display === 'none';
    body.style.display = open ? 'block' : 'none';
    if (chev) chev.style.transform = open ? 'rotate(180deg)' : '';
  },
});
