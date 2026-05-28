    /* ============================================================
    FABLAB UFPS — course.js
    Lógica de la pantalla de cápsulas
    1. Lee el courseId desde la URL (?id=curso-fablab-01)
    2. Carga courses.json y encuentra el curso
    3. Renderiza las tarjetas de cápsulas
    4. Al seleccionar → animación zoom → abre vista de cápsula
    ============================================================ */

    'use strict';

    // URL de Google Apps Script
    const API_URL = 'https://script.google.com/macros/s/AKfycbyhQMAReh7w-RQsP3slbNLvgfszJAB6iZd8gbBEcCHtDcDKLI9FXbpuwNTC41lRB6ThpA/exec';

    // ─── ESTADO ──────────────────────────────────────────────────
    const state = {
    course          : null,
    capsules        : [],
    filteredCapsules: [],
    activeCapsule   : null,
    };

    // ─── DOM ──────────────────────────────────────────────────────
    const DOM = {
    // Navbar
    navCourseLink   : document.getElementById('navCourseLink'),
    navbarToggle    : document.getElementById('navbarToggle'),
    navbarNav       : document.getElementById('navbarNav'),
    // Hero
    heroTitle       : document.getElementById('heroTitle'),
    heroAuthor      : document.getElementById('heroAuthor'),
    heroDesc        : document.getElementById('heroDesc'),
    heroArea        : document.getElementById('heroArea'),
    heroCapsuleCount: document.getElementById('heroCapsuleCount'),
    courseHero      : document.getElementById('courseHero'),
    // Vistas
    viewSelection   : document.getElementById('viewSelection'),
    viewCapsule     : document.getElementById('viewCapsule'),
    // Grid de cápsulas
    capsulesGrid    : document.getElementById('capsulesGrid'),
    capsuleCount    : document.getElementById('capsuleCount'),
    skeletonGrid    : document.getElementById('skeletonGrid'),
    emptyState      : document.getElementById('emptyState'),
    // Búsqueda
    capsuleSearch   : document.getElementById('capsuleSearch'),
    // Vista cápsula
    btnBack         : document.getElementById('btnBackToSelection'),
    capsuleOrder    : document.getElementById('capsuleOrder'),
    capsuleTitle    : document.getElementById('capsuleTitle'),
    capsuleDesc     : document.getElementById('capsuleDesc'),
    capsuleIframe   : document.getElementById('capsuleIframe'),
    resourcesGrid   : document.getElementById('resourcesGrid'),
    resourcesEmpty  : document.getElementById('resourcesEmpty'),
    // Footer
    footerYear      : document.getElementById('footerYear'),
    };

    // ─── INIT ─────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
    DOM.footerYear.textContent = new Date().getFullYear();
    initTicker();
    bindEvents();
    loadCourse();
    });

    // ─── CARGAR CURSO DESDE JSON ──────────────────────────────────
    async function loadCourse() {
    const courseId = getCourseIdFromURL();
    if (!courseId) {
        showError('No se especificó un curso. <a href="/pages/index.html">Volver al inicio</a>');
        return;
    }

    // Actualizar link del navbar con el ID actual
    if (DOM.navCourseLink) {
        DOM.navCourseLink.href = `/pages/course.html?id=${encodeURIComponent(courseId)}`;
    }

    try {
        console.log(`[FabLab] Buscando curso ${courseId} en la nube...`);
        const res = await fetch(`${API_URL}?action=getCourses&t=${Date.now()}`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.error) {
            console.error('[FabLab] Error desde la API:', data.error);
            throw new Error(data.error);
        }

        // 1. Buscar el curso en la respuesta de la API
        let apiCourse = data.courses.find(c => c.id === courseId || c.title === courseId);
        
        if (!apiCourse) {
            showError(`Curso "${courseId}" no encontrado. <a href="/pages/index.html">Volver al inicio</a>`);
        return;
        }

        // 2. Cargar metadatos locales (Banner, Autor, Área) desde courses.json para complementar
        const localRes = await fetch('/data/courses.json');
        const localData = await localRes.json();
        const localMeta = localData.courses.find(c => 
            c.id === courseId || 
            (apiCourse.title && c.title.trim().toLowerCase() === apiCourse.title.trim().toLowerCase())
        );

        // 3. Fusionar: Datos de la API (Cápsulas) + Datos Locales (Diseño/Banner)
        state.course = {
            ...apiCourse,
            author: sanitizeProp(apiCourse.author, localMeta?.author, 'FabLab UFPS'),
            area: sanitizeProp(apiCourse.area, localMeta?.area, 'General'),
            banner: sanitizeProp(apiCourse.banner, localMeta?.banner, ''),
            thumbnail: sanitizeProp(apiCourse.thumbnail, localMeta?.thumbnail, ''),
            description: sanitizeProp(apiCourse.description, localMeta?.description, '')
        };

        state.capsules = (apiCourse.capsules ?? []).map(cap => normalizeCapsuleData(cap));
        state.filteredCapsules = [...state.capsules];

        renderHero();
        renderCapsules();
    } catch (err) {
        console.error('[FabLab] Fallo de red/API, intentando local...', err);
        // Fallback local
        const localRes = await fetch('../data/courses.json');
        const localData = await localRes.json();
        const localCourse = localData.courses.find(c => c.id === courseId);
        if (localCourse) {
            state.course = localCourse;
            state.capsules = localCourse.capsules ?? [];
            state.filteredCapsules = [...state.capsules];
            renderHero(); renderCapsules();
        } else {
            showError('No se pudo encontrar el curso ni en la nube ni localmente.');
        }
    }
    }

    // ─── RENDERIZAR HERO ──────────────────────────────────────────
    function renderHero() {
    const { course } = state;
    document.title = `FabLab — ${course.title}`;

    DOM.heroTitle.textContent  = course.title;
    DOM.heroAuthor.textContent = course.author ?? '';
    DOM.heroDesc.textContent   = course.description ?? '';
    DOM.heroArea.textContent   = course.area ?? 'FabLab UFPS';

    const count = state.capsules?.length ?? 0;
    DOM.heroCapsuleCount.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
        ${count} cápsula${count !== 1 ? 's' : ''}
    `;

    // Revertimos a la lógica simple que funcionaba: priorizar banner, luego thumbnail
    const bannerRaw = course.banner || course.thumbnail || '';
    const bannerUrl = fixDriveUrl(bannerRaw);

    if (bannerUrl) {
        // Mantenemos la solución de comillas dobles sin encodeURI para asegurar visibilidad
        DOM.courseHero.style.backgroundImage = `url("${bannerUrl}")`;
    }
    }

    // ─── RENDERIZAR GRID DE CÁPSULAS ──────────────────────────────
    function renderCapsules() {
    DOM.skeletonGrid.style.display = 'none';
    DOM.capsuleCount.textContent   = state.filteredCapsules.length;

    if (state.filteredCapsules.length === 0) {
        DOM.capsulesGrid.innerHTML     = '';
        DOM.emptyState.style.display   = 'flex';
        return;
    }

    DOM.emptyState.style.display = 'none';
    DOM.capsulesGrid.innerHTML   = state.filteredCapsules
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(cap => buildCapsuleCard(cap))
        .join('');

    // Eventos click
    DOM.capsulesGrid.querySelectorAll('.capsule-card').forEach(card => {
        card.addEventListener('click', () => {
        const id = card.dataset.id;
        const capsule = state.capsules.find(c => c.id === id);
        if (capsule) openCapsule(card, capsule);
        });
        // Accesibilidad teclado
        card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') card.click();
        });
    });
    }

    // ─── CONSTRUIR TARJETA DE CÁPSULA ─────────────────────────────
    function buildCapsuleCard(cap) {
    const fileCount = cap.files?.length ?? 0;
    const orderStr  = String(cap.order ?? 1).padStart(2, '0');

    // Thumbnail de YouTube
    const rawVideoUrl = cap.video?.videoId ?? '';
    const youtubeVideoId = extractYouTubeVideoId(rawVideoUrl);
    const thumbSrc  = youtubeVideoId
        ? `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`
        : '';

    const thumbHTML = thumbSrc
        ? `<img src="${thumbSrc}" alt="${escapeHTML(cap.title)}" loading="lazy" referrerpolicy="no-referrer" />`
        : '';

    return `
        <article
        class="capsule-card"
        data-id="${escapeHTML(cap.id)}"
        role="button"
        tabindex="0"
        aria-label="Ver cápsula: ${escapeHTML(cap.title)}"
        >
        <div class="capsule-card__thumb capsule-card__thumb--yt">
            ${thumbHTML}
            <div class="capsule-card__play">
            <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="12" fill="rgba(210,17,22,0.9)"/>
                <polygon points="10,8 16,12 10,16" fill="white"/>
            </svg>
            </div>
            <span class="capsule-card__order-badge">Cápsula ${orderStr}</span>
        </div>
        <div class="capsule-card__body">
            <h3 class="capsule-card__title">${escapeHTML(cap.title)}</h3>
            <p class="capsule-card__desc">${escapeHTML(cap.description ?? '')}</p>
            <div class="capsule-card__footer">
            <span class="capsule-card__files">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                </svg>
                ${fileCount} archivo${fileCount !== 1 ? 's' : ''}
            </span>
            <span class="capsule-card__cta">Ver cápsula</span>
            </div>
        </div>
        </article>
    `;
    }

    // ─── ABRIR CÁPSULA CON ANIMACIÓN ─────────────────────────────
    function openCapsule(cardEl, capsule) {
    state.activeCapsule = capsule;

    // Animación zoom en la tarjeta
    cardEl.classList.add('capsule-card--selected');

    // Esperar animación antes de cambiar vista
    setTimeout(() => {
        showView('capsule');
        populateCapsuleView(capsule);
        // Scroll al inicio del contenido
        window.scrollTo({ top: DOM.courseHero.offsetHeight, behavior: 'smooth' });
    }, 350);
    }

// ─── POBLAR VISTA DE CÁPSULA ──────────────────────────────────
function populateCapsuleView(cap) {
    const orderStr = String(cap.order ?? 1).padStart(2, '0');

    DOM.capsuleOrder.textContent = `Cápsula ${orderStr}`;
    DOM.capsuleTitle.textContent = cap.title;
    DOM.capsuleDesc.textContent  = cap.description ?? '';

  // Embed YouTube
const rawVideoUrl = cap.video?.videoId ?? '';
const youtubeVideoId = extractYouTubeVideoId(rawVideoUrl);
if (youtubeVideoId) {
DOM.capsuleIframe.src = `https://www.youtube.com/embed/${youtubeVideoId}?rel=0&modestbranding=1`;
} else {
DOM.capsuleIframe.src = '';
}

  // Recursos
    renderResources(cap.files ?? []);
}

// ─── RENDERIZAR RECURSOS ──────────────────────────────────────
function renderResources(files) {
    if (files.length === 0) {
        DOM.resourcesGrid.innerHTML    = '';
        DOM.resourcesEmpty.style.display = 'block';
        return;
    }

    DOM.resourcesEmpty.style.display = 'none';
    DOM.resourcesGrid.innerHTML = files.map(file => {
    const type     = (file.type ?? 'file').toLowerCase();
    const iconText = getIconText(type);
    const iconClass = getIconClass(type, file.category);

    return `
        <a
            href="${getDirectDownloadUrl(file.url ?? '#')}"
            target="_blank"
            rel="noopener noreferrer"
            class="resource-card"
            title="Descargar ${escapeHTML(file.name)}"
        >
            <div class="resource-card__icon ${iconClass}">${iconText}</div>
            <div class="resource-card__info">
            <div class="resource-card__name">${escapeHTML(file.name)}</div>
            <div class="resource-card__type">${getTypeLabel(type, file.category)}</div>
            </div>
            <svg class="resource-card__download" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
        </a>
        `;
    }).join('');
}

// ─── CAMBIAR VISTAS ───────────────────────────────────────────
function showView(view) {
    if (view === 'selection') {
        DOM.viewSelection.classList.remove('view--hidden');
        DOM.viewCapsule.classList.add('view--hidden');
        // Detener video al volver
        DOM.capsuleIframe.src = '';
    } else {
        DOM.viewSelection.classList.add('view--hidden');
        DOM.viewCapsule.classList.remove('view--hidden');
    }
}

// ─── BIND EVENTS ──────────────────────────────────────────────
function bindEvents() {
  // Menu responsive
    if (DOM.navbarToggle && DOM.navbarNav) {
        DOM.navbarToggle.addEventListener('click', () => {
            DOM.navbarNav.classList.toggle('navbar__nav--open');
        });
    }

  // Volver a selección de cápsulas
    DOM.btnBack.addEventListener('click', () => {
        showView('selection');
        // Limpiar clase de animación en todas las cards
        DOM.capsulesGrid.querySelectorAll('.capsule-card--selected').forEach(c => {
        c.classList.remove('capsule-card--selected');
        });
        window.scrollTo({ top: DOM.courseHero.offsetHeight, behavior: 'smooth' });
    });

  // Búsqueda de cápsulas con debounce
    DOM.capsuleSearch.addEventListener('input', debounce(() => {
    const query = DOM.capsuleSearch.value.trim().toLowerCase();
    state.filteredCapsules = query
        ? state.capsules.filter(c =>
            c.title.toLowerCase().includes(query) ||
            (c.description ?? '').toLowerCase().includes(query)
        )
        : [...state.capsules];
    renderCapsules();
    }, 250));
}

// ─── NORMALIZACIÓN DE DATOS ───────────────────────────────────
function normalizeCapsuleData(cap) {
    // Función auxiliar para buscar claves sin importar tildes o mayúsculas
    const getVal = (obj, search) => {
        const key = Object.keys(obj).find(k => 
            k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 
            search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        );
        return key ? obj[key] : null;
    };

    // Intentar sacar los archivos de la columna de texto o de la propiedad 'files' del Apps Script
    const rawFiles = getVal(cap, 'Archivos o Materiales de la cápsula') || cap.files || '';
    
    return {
        id: cap.id || `cap-${Math.random().toString(36).substr(2, 9)}`,
        order: parseInt(getVal(cap, 'Número de cápsula') || cap.order || 0),
        title: getVal(cap, 'Título de cápsula') || cap.title || 'Cápsula sin título',
        description: getVal(cap, 'Descripción de Cápsula') || cap.description || '',
        video: {
            videoId: getVal(cap, 'Vídeo de Youtube') || getVal(cap, 'Video de Youtube') || cap.video?.videoId || ''
        },
        // Convertir string de comas en array de objetos de archivo
        files: Array.isArray(rawFiles) ? rawFiles : processFileString(rawFiles)
    };
}

function processFileString(str) {
    if (!str || typeof str !== 'string') return [];
    return str.split(',').map(item => {
        // Detectar si el usuario escribió "Nombre: URL" o solo "URL"
        let name = '';
        let url = item.trim();

        if (url.includes('http') && url.includes(':') && !url.startsWith('http')) {
            const parts = url.split(/:(http.*)/);
            name = parts[0].trim();
            url = parts[1]?.trim() || url;
        }

        if (!url) return null;
        
        const driveIdMatch = url.match(/(?:id=|\/d\/|file\/d\/)([a-zA-Z0-9_-]{25,})/);
        let extension = 'file';

        // 1. Intentar obtener extensión del nombre o la URL
        const searchStr = (name + url).toLowerCase();
        if (searchStr.includes('.pdf')) extension = 'pdf';
        else if (searchStr.match(/\.(glb|stl|obj|fbx)/)) extension = 'glb';
        else if (searchStr.match(/\.(png|jpg|jpeg|webp)/)) {
            const imgMatch = searchStr.match(/\.(png|jpg|jpeg|webp)/);
            extension = imgMatch ? imgMatch[1] : 'png';
        }
        else if (searchStr.includes('.blend')) extension = 'blend';
        else if (url.includes('drive.google.com')) extension = 'drive';

        // 2. Si no hay nombre, intentar extraerlo de la URL o usar uno por defecto
        if (!name) {
            const fileName = url.split('/').pop().split('?')[0];
            if (fileName && fileName.includes('.') && !fileName.includes('drive.google')) {
                name = fileName;
            } else {
                const typeLabels = {
                    pdf: 'Documento PDF',
                    glb: 'Modelo 3D',
                    png: 'Imagen/Recurso',
                    blend: 'Proyecto Blender',
                    drive: 'Archivo en Drive'
                };
                name = typeLabels[extension] || 'Material de apoyo';
            }
        }
        
        return { name, url, type: extension };
    }).filter(f => f !== null);
}

// ─── TICKER ───────────────────────────────────────────────────
async function initTicker() {
    const bar   = document.querySelector('.announcement-bar');
    const track = document.getElementById('tickerTrack');
    if (!bar || !track) return;

    try {
        const res      = await fetch(`${API_URL}?action=getTicker&t=${Date.now()}`).catch(() => fetch('/data/ticker.json'));
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

// ─── UTILIDADES ───────────────────────────────────────────────
function fixDriveUrl(url, sz = 800) {
    if (!url || typeof url !== 'string') return '';
    const cleanUrl = url.trim();

    // Rutas locales — sin cambios
    if (cleanUrl.startsWith('/') || cleanUrl.startsWith('./')) return cleanUrl;

    // Google Drive — extrae el ID y usa thumbnail (funciona como <img src>)
    const idMatch = cleanUrl.match(/(?:id=|\/d\/|file\/d\/)([a-zA-Z0-9_-]{25,})/);
    if (idMatch?.[1]) {
        return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w${sz}`;
    }

    return cleanUrl;
}

// Función para extraer el ID de video de una URL de YouTube
function extractYouTubeVideoId(url) {
    if (!url || typeof url !== 'string') return null;
    
    // Expresión regular universal para YouTube (incluye Shorts, Mobile, y parámetros como ?si=)
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
}

// Utilidad para limpiar valores de la API (evita "undefined" como string y valores vacíos)
function sanitizeProp(apiVal, localVal, fallback) {
    const val = String(apiVal || "").trim();
    if (val === "" || val === "undefined" || val === "null") return localVal || fallback;
    return val;
}

// Nueva utilidad para forzar la descarga de archivos de Google Drive
function getDirectDownloadUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    const cleanUrl = url.trim();

    const idMatch = cleanUrl.match(/(?:id=|\/d\/|file\/d\/)([a-zA-Z0-9_-]{25,})/);
    if (idMatch?.[1]) {
        // Retorna el link de exportación directa en lugar del de visualización
        return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
    }
    return cleanUrl;
}

function getCourseIdFromURL() {
    return new URLSearchParams(window.location.search).get('id') ?? '';
}

function getIconText(type) {
    const map = { 
        glb: '3D', blend: 'BLND', pdf: 'PDF', 
        png: 'IMG', jpg: 'IMG', jpeg: 'IMG', webp: 'IMG', 
        drive: 'DRV' 
    };
    return map[type] ?? type.toUpperCase().slice(0, 4);
}

function getIconClass(type, category) {
    if (category === 'pbr') return 'resource-card__icon--pbr';
    const map = { 
        glb: 'glb', blend: 'blend', pdf: 'pdf', 
        png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'png',
        drive: 'default' 
    };
    return `resource-card__icon--${map[type] ?? 'default'}`;
}

function getTypeLabel(type, category) {
    if (category === 'pbr') return 'Textura PBR';
    const map = {
        glb: 'Modelo 3D',
        blend: 'Archivo Blender',
        pdf: 'Documento PDF',
        png: 'Imagen PNG',
        jpg: 'Imagen JPG',
        jpeg: 'Imagen JPG',
        webp: 'Imagen WEBP',
        drive: 'Archivo en Drive',
        file: 'Archivo' // Generic fallback
    };
    return map[type] ?? 'Archivo';
}

function showError(msg) {
    DOM.skeletonGrid.style.display = 'none';
    DOM.capsulesGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--color-gray-500);font-size:13px;">
        ${msg}
        </div>
    `;
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