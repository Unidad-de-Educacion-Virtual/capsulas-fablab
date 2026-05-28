    /* ============================================================
    FABLAB UFPS — static.js
    Script compartido para páginas estáticas (about, terms)
    ============================================================ */

    'use strict';

    const API_URL = 'https://script.google.com/macros/s/AKfycbyhQMAReh7w-RQsP3slbNLvgfszJAB6iZd8gbBEcCHtDcDKLI9FXbpuwNTC41lRB6ThpA/exec';

    document.addEventListener('DOMContentLoaded', () => {
        const footerYear = document.getElementById('footerYear');
        if (footerYear) footerYear.textContent = new Date().getFullYear();
        initTicker();
    });

    // ─── TICKER ───────────────────────────────────────────────────
async function initTicker() {
    const bar   = document.querySelector('.announcement-bar');
    const track = document.getElementById('tickerTrack');
    if (!bar || !track) return;

    try {
        const res      = await fetch(`${API_URL}?action=getTicker&t=${Date.now()}`).catch(() => fetch('/data/ticker.json'));
        if (!res.ok) throw new Error('Network response was not ok');
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