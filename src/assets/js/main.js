/* ============================================================
    FABLAB UFPS — main.js
    Lógica del selector de cursos
    Lee courses.json → filtra → ordena → renderiza tarjetas
   ============================================================ */

'use strict';

// URL de Google Apps Script (Reemplazar con la URL obtenida en el paso anterior)
const API_URL = 'https://script.google.com/macros/s/AKfycbyhQMAReh7w-RQsP3slbNLvgfszJAB6iZd8gbBEcCHtDcDKLI9FXbpuwNTC41lRB6ThpA/exec';

// ─── ESTADO DE LA APP ────────────────────────────────────────
const state = {
  courses   : [],   // Datos originales del JSON
  filtered  : [],   // Datos después de filtros/búsqueda
    search    : '',
    sort      : 'default',
  filters   : {},   // { area: Set, nivel: Set, software: Set }
};

// ─── ELEMENTOS DEL DOM ───────────────────────────────────────
const DOM = {
    grid        : document.getElementById('coursesGrid'),
    skeleton    : document.getElementById('skeletonGrid'),
    emptyState  : document.getElementById('emptyState'),
    count       : document.getElementById('courseCount'),
    searchInput : document.getElementById('searchInput'),
    sortSelect  : document.getElementById('sortSelect'),
    clearBtn    : document.getElementById('clearFilters'),
    resetEmpty  : document.getElementById('resetEmpty'),
    footerYear  : document.getElementById('footerYear'),
    checkboxes  : document.querySelectorAll('.filter-checkbox'),
    navbarToggle: document.getElementById('navbarToggle'),
    navbarNav:   document.getElementById('navbarNav'),
    sidebarBtns : document.querySelectorAll('.sidebar__heading[data-target]'),
};

// ─── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    DOM.footerYear.textContent = new Date().getFullYear();
    bindEvents();
    loadCourses();
    initTicker();
});

// ─── CARGAR JSON ─────────────────────────────────────────────
async function loadCourses() {
    try {
    // Intentar cargar desde Google Apps Script, si falla usar el local por backup
    console.log('[FabLab] Intentando conectar con Google Drive...');
    
    const res = await fetch(`${API_URL}?action=getCourses&t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    if (data.error) {
        console.error('[FabLab] Error desde la API:', data.error);
        await loadLocalData();
        return;
    }

    state.courses  = data.courses ?? [];
    state.filtered = [...state.courses];
    console.log('[FabLab] Datos vinculados con éxito:', state.courses);
    initFilters();
    renderCourses();
    } catch (err) {
    console.error('[FabLab] Error de conexión API. Cargando local...', err);
    await loadLocalData();
    }
}

async function loadLocalData() {
    const res = await fetch('../data/courses.json');
    const data = await res.json();
    state.courses = data.courses ?? [];
    state.filtered = [...state.courses];
    initFilters();
    renderCourses();
}

// ─── LABELS LEGIBLES POR HUMANO ───────────────────────────────
const FILTER_LABELS = {
    area: {
        'modelado-3d'       : 'Modelado 3D',
        'fabricacion'       : 'Fabricación Digital',
        'electronica'       : 'Electrónica',
        'diseño'            : 'Diseño',
    },
    nivel: {
        'basico'            : 'Básico',
        'intermedio'        : 'Intermedio',
        'avanzado'          : 'Avanzado',
    },
    software: {
        'blender'           : 'Blender',
        'fusion360'         : 'Fusion 360',
        'arduino'           : 'Arduino',
        'cura'              : 'Cura',
    },
};

// ─── INICIALIZAR FILTROS DINÁMICOS ────────────────────────────
function initFilters() {
    const groups = ['area', 'nivel', 'software'];

    groups.forEach(group => {
        // Recolectar valores únicos de todos los cursos
        const values = new Set();
        state.courses.forEach(course => {
        const field = course[group];
        if (!field) return;
        if (Array.isArray(field)) field.forEach(v => values.add(v));
        else values.add(field);
        });

        // Inicializar el Set de filtros activos
        state.filters[group] = new Set();

        // Si no hay valores para este grupo, ocultar la sección
        const container = document.getElementById(`filter-${group}`);
        const section   = container?.closest('.sidebar__section');
        if (!container) return;

        if (values.size === 0) {
        if (section) section.style.display = 'none';
        return;
        }

        // Construir checkboxes dinámicamente
        container.innerHTML = [...values].map(value => {
        const label = FILTER_LABELS[group]?.[value] ?? value;
        return `
            <label class="filter-option">
            <input
                type="checkbox"
                value="${value}"
                class="filter-checkbox"
                data-filter="${group}"
            />
            <span class="filter-option__check"></span>
            ${label}
            </label>
        `;
        }).join('');
    });

    // Re-bind checkboxes después de generarlos
    bindCheckboxEvents();

    // Abrir accordions con altura correcta
    setTimeout(() => {
    DOM.sidebarBtns.forEach(btn => {
        const target = document.getElementById(btn.dataset.target);
        if (target) target.style.maxHeight = `${target.scrollHeight + 40}px`;
    });
    }, 0);
}

// ─── BIND CHECKBOXES (separado para poder re-llamarlo) ────────
function bindCheckboxEvents() {
    document.querySelectorAll('.filter-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
        const group = cb.dataset.filter;
        if (!state.filters[group]) state.filters[group] = new Set();
        if (cb.checked) state.filters[group].add(cb.value);
        else            state.filters[group].delete(cb.value);
        applyFilters();
        });
    });
}

// ─── BIND EVENTS ─────────────────────────────────────────────
function bindEvents() {
    // Menu responsive
    if (DOM.navbarToggle && DOM.navbarNav) {
        DOM.navbarToggle.addEventListener('click', () => {
            DOM.navbarNav.classList.toggle('navbar__nav--open');
        });
    }

  // Búsqueda — debounce 250ms
    DOM.searchInput.addEventListener('input', debounce(() => {
    state.search = DOM.searchInput.value.trim().toLowerCase();
    applyFilters();
    }, 250));

  // Ordenamiento
    DOM.sortSelect.addEventListener('change', () => {
    state.sort = DOM.sortSelect.value;
    applyFilters();
    });

  // Limpiar filtros
    DOM.clearBtn.addEventListener('click', clearAllFilters);
    if (DOM.resetEmpty) DOM.resetEmpty.addEventListener('click', clearAllFilters);

  // Accordion sidebar
    DOM.sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target  = document.getElementById(btn.dataset.target);
        const isOpen  = !btn.classList.contains('collapsed');
        btn.classList.toggle('collapsed', isOpen);
        target.style.maxHeight = isOpen ? '0' : `${target.scrollHeight}px`;
    });

    // Abrir todos por defecto
    const target = document.getElementById(btn.dataset.target);
    if (target) target.style.maxHeight = `${target.scrollHeight + 40}px`;
    });
}

// ─── APLICAR FILTROS + ORDENAMIENTO ──────────────────────────
function applyFilters() {
    let result = [...state.courses];

  // Búsqueda por texto
    if (state.search) {
    result = result.filter(course =>
        course.title.toLowerCase().includes(state.search) ||
        course.description.toLowerCase().includes(state.search) ||
        course.author.toLowerCase().includes(state.search)
    );
    }

  // Filtros por grupo (OR dentro del grupo, AND entre grupos)
    Object.entries(state.filters).forEach(([group, values]) => {
    if (values.size === 0) return;
    result = result.filter(course => {
        const field = course[group];
        if (!field) return false;
        const courseValues = Array.isArray(field)
        ? field.map(v => v.toLowerCase())
        : [field.toLowerCase()];
        return [...values].some(v => courseValues.includes(v.toLowerCase()));
    });
    });

  // Ordenamiento
    switch (state.sort) {
    case 'title-asc':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    case 'title-desc':
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
    case 'capsules':
        result.sort((a, b) => (b.capsules?.length ?? 0) - (a.capsules?.length ?? 0));
        break;
    default:
        break;
    }

    state.filtered = result;
    renderCourses();
}

// ─── RENDERIZAR TARJETAS ──────────────────────────────────────
function renderCourses() {
  // Ocultar skeleton
    DOM.skeleton.style.display = 'none';

  // Actualizar contador
    DOM.count.textContent = state.filtered.length;

    if (state.filtered.length === 0) {
    DOM.grid.innerHTML      = '';
    DOM.emptyState.style.display = 'flex';
    return;
    }

    DOM.emptyState.style.display = 'none';
    DOM.grid.innerHTML = state.filtered.map(course => buildCard(course)).join('');

  // Eventos click en tarjetas
    DOM.grid.querySelectorAll('.course-card').forEach(card => {
    card.addEventListener('click', () => {
        const id = card.dataset.id;
        navigateToCourse(id);
    });
    });
}

// ─── CONSTRUIR CARD HTML ──────────────────────────────────────
function buildCard(course) {
    const capsuleCount = course.capsules?.length ?? 0;
    const thumbUrl     = fixDriveUrl(course.thumbnail);
    const thumbnail    = thumbUrl
    ? `<img src="${thumbUrl}" alt="${escapeHTML(course.title)}" loading="lazy" referrerpolicy="no-referrer" />`
    : placeholderSVG();

    const thumbnailClass = thumbUrl
    ? 'course-card__thumbnail'
    : 'course-card__thumbnail course-card__thumbnail--placeholder';

    return `
    <article class="course-card" data-id="${escapeHTML(course.id)}" role="button" tabindex="0" aria-label="Ver curso: ${escapeHTML(course.title)}">
        <div class="${thumbnailClass}">
        ${thumbnail}
        <span class="course-card__badge">${capsuleCount} cápsula${capsuleCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="course-card__body">
        <div class="course-card__meta">
            <span class="course-card__tag">${escapeHTML(course.area ?? 'FabLab')}</span>
            <span class="course-card__author">${escapeHTML(course.author ?? '')}</span>
        </div>
        <h2 class="course-card__title">${escapeHTML(course.title)}</h2>
        <p class="course-card__desc">${escapeHTML(course.description ?? '')}</p>
        <div class="course-card__footer">
            <span class="course-card__caps">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            ${capsuleCount} cápsula${capsuleCount !== 1 ? 's' : ''}
            </span>
            <button class="course-card__btn">Ver curso</button>
        </div>
        </div>
    </article>
    `;
}

// ─── NAVEGACIÓN A COURSE.HTML ─────────────────────────────────
function navigateToCourse(courseId) {
    window.location.href = `./course.html?id=${encodeURIComponent(courseId)}`;
}

// ─── LIMPIAR TODOS LOS FILTROS ────────────────────────────────
function clearAllFilters() {
    state.search = '';
    state.sort   = 'default';
    DOM.searchInput.value = '';
    DOM.sortSelect.value  = 'default';

    document.querySelectorAll('.filter-checkbox').forEach(cb => {
        cb.checked = false;
    });
    Object.keys(state.filters).forEach(g => state.filters[g].clear());

    applyFilters();
}

// ─── MOSTRAR ERROR DE CARGA ───────────────────────────────────
function showError() {
    DOM.skeleton.style.display = 'none';
    DOM.grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--color-gray-500);font-size:13px;">
        Error al cargar los cursos. Verifica que <code>courses.json</code> esté bien formado.
    </div>
    `;
}

// ─── PLACEHOLDER SVG ──────────────────────────────────────────
function placeholderSVG() {
    return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
    `;
}

// ─── UTILIDADES ───────────────────────────────────────────────
function fixDriveUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const cleanUrl = url.trim();

    // Rutas locales — sin cambios
    if (cleanUrl.startsWith('/') || cleanUrl.startsWith('./')) return cleanUrl;

    // Google Drive — extrae el ID y usa thumbnail (funciona como <img src>)
    const idMatch = cleanUrl.match(/(?:id=|\/d\/|file\/d\/)([a-zA-Z0-9_-]{25,})/);
    if (idMatch?.[1]) {
        return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w800`;
    }

    return cleanUrl;
}

function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

function debounce(fn, delay) {
    let timer;
    return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
    };
}

// ─── TICKER ───────────────────────────────────────────────────
async function initTicker() {
    const bar   = document.querySelector('.announcement-bar');
    const track = document.getElementById('tickerTrack');
    if (!bar || !track) return;

    try {
        const res      = await fetch(`${API_URL}?action=getTicker&t=${Date.now()}`).catch(() => fetch('../data/ticker.json'));
        const data     = await res.json();
        const messages = data.messages ?? [];

        if (messages.length === 0) {
            bar.style.display = 'none';
            return;
        }

        const separator = '\u00A0\u00A0\u00A0|\u00A0\u00A0\u00A0';
        const content   = messages.join(separator) + separator;

        [1, 2].forEach(() => {
        const span = document.createElement('span');
        span.className   = 'ticker-text';
        span.textContent = content;
        track.appendChild(span);
        });

        requestAnimationFrame(() => {
        const textWidth = track.querySelector('.ticker-text').offsetWidth;
        const barWidth  = bar.offsetWidth;
        const speed     = 0.6;
        let position    = barWidth;

        function animate() {
            position -= speed;
            if (position <= -textWidth) position = 0;
            track.style.transform = `translateX(${position}px)`;
            requestAnimationFrame(animate);
        }

        animate();
        });

    } catch (err) {
        console.warn('[FabLab] No se pudo cargar ticker.json:', err);
    }
}