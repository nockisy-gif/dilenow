/* 🎃 ХЭЛЛОУИН: призраки, тыквы и летучие мыши, которые живут рядом с курсором.
   Самодостаточный файл: ничего не ломает на сайте, выключается кнопкой 🎃 в шапке.
   Авто-включение: с 15 октября по 7 ноября (временное событие). Принудительно: ?halloween=1 / ?halloween=0 */
(function () {
    'use strict';
    const KEY = 'hw-theme';
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = () => innerWidth < 900;
    const autoOn = () => { const d = new Date(), m = d.getMonth(), day = d.getDate(); return (m === 9 && day >= 15) || (m === 10 && day <= 7); };
    let on;
    try {
        const q = new URLSearchParams(location.search).get('halloween');
        const v = q !== null ? q : localStorage.getItem(KEY);
        on = v === null ? autoOn() : (v === '1' || v === 'true');
        if (q !== null) localStorage.setItem(KEY, on ? '1' : '0');
    } catch (e) { on = autoOn(); }

    const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = a => a[Math.floor(Math.random() * a.length)];

    // ---------- DOM ----------
    const WEB = '<svg viewBox="0 0 150 150" fill="none" stroke="#e8e0ff" stroke-width="1.2" stroke-linecap="round"><path d="M0 0L150 0M0 0L140 55M0 0L112 112M0 0L55 140M0 0L0 150"/><path d="M30 0Q26 22 0 30M60 0Q50 46 0 60M90 0Q74 70 0 90M120 0Q98 92 0 120M150 0Q122 118 0 150" /></svg>';
    const web1 = el('div', 'hw-web tl', WEB), web2 = el('div', 'hw-web tr', WEB);
    const fog = el('div', 'hw-fog');
    const layer = el('div'); layer.id = 'hw-layer';
    // 3D-тыква на CSS: 9 рёбер-эллипсов вращаются вокруг оси Y (настоящий объём), лицо светится изнутри,
    // тыква следит за курсором всем телом и подпрыгивает по клику
    const RIBS = 9;
    let ribs = '';
    for (let i = 0; i < RIBS; i++) ribs += `<i class="rib" style="--r:${(i * 180 / RIBS).toFixed(2)}deg;--sh:${(0.78 + 0.22 * Math.abs(Math.cos(i * Math.PI / RIBS))).toFixed(2)}"></i>`;
    const PET = `<div class="pk-glow"></div><div class="pk-shadow"></div><div class="pk-stage">
        <div class="pk-body"><div class="pk-ribs">${ribs}</div><div class="pk-core"></div>
            <div class="pk-face"><b class="eye l"></b><b class="eye r"></b><i class="nose"></i><u class="mouth"></u></div>
            <div class="pk-stem"><i></i><em></em></div></div></div><span class="say">Бу!</span>`;
    const petL = el('div', 'hw-pet l', PET), petR = el('div', 'hw-pet r', PET);
    const tgl = el('button', 'hw-toggle', '🎃'); tgl.type = 'button'; tgl.title = 'Хэллоуин: вкл / выкл'; tgl.setAttribute('aria-label', 'Хэллоуин: включить или выключить');

    function mount() {
        document.body.append(web1, web2, fog, layer, petL, petR);
        const heroEl = document.querySelector('.hero');
        (heroEl || document.body).appendChild(ambient);
        const h = document.querySelector('.site-header');
        if (h) h.appendChild(tgl); else { tgl.classList.add('fixed'); document.body.appendChild(tgl); }
        apply();
    }

    // ---------- состояние ----------
    let ghosts = [], raf = 0, last = 0, mx = null, my = null;
    const ghostCount = () => reduce ? 0 : (small() ? 3 : 6);
    const SAY = ['Бу!', 'Не поймаешь!', 'Уууу…', 'Ой!', '🎃?', 'Тссс…', 'Я Дракула!', 'Конфету!'];

    function makeGhost(i) {
        const g = { n: el('div', 'hw-ghost', '<span class="bubble"></span>👻'), x: rnd(0, innerWidth), y: rnd(80, innerHeight - 80), vx: rnd(-20, 20), vy: rnd(-12, 12), ph: rnd(0, 6.28), sp: rnd(.7, 1.3), say: 0, curious: i % 2 === 0 };
        g.n.style.fontSize = (small() ? 26 : 30 + (i % 3) * 6) + 'px';
        layer.appendChild(g.n); return g;
    }
    function ensureGhosts() {
        const want = on ? ghostCount() : 0;
        while (ghosts.length < want) ghosts.push(makeGhost(ghosts.length));
        while (ghosts.length > want) { const g = ghosts.pop(); g.n.remove(); }
    }

    // ---------- фоновые частицы: мягкий фон внутри главного экрана (hero) ----------
    // угли, споры, настоящие призраки (CSS-форма, без эмодзи) и летучие мыши (CSS-крылья) плывут
    // на фоне, только в пределах hero — ничего не рисуется эмодзи-символами
    const AMB = [['hw-ember', 9], ['hw-spook', 5], ['hw-wisp', 4], ['hw-batfly', 2], ['hw-spore', 6]];
    const ambient = el('div'); ambient.id = 'hw-ambient';
    (function buildAmbient() {
        const frag = document.createDocumentFragment();
        AMB.forEach(([cls, n]) => {
            const count = reduce ? 0 : small() ? Math.ceil(n / 2) : n;
            for (let i = 0; i < count; i++) {
                const p = el('i', 'hw-amb ' + cls);
                p.style.cssText = `--x:${rnd(0, 100).toFixed(1)}vw;--y:${rnd(6, 55).toFixed(0)}%;--s:${rnd(.6, 1.5).toFixed(2)};--d:${rnd(9, 26).toFixed(1)}s;--dl:-${rnd(0, 26).toFixed(1)}s;--dx:${rnd(-14, 14).toFixed(1)}vw`;
                frag.appendChild(p);
            }
        });
        ambient.appendChild(frag);
    })();

    // ---------- цикл ----------
    function frame(t) {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
        const W = innerWidth, H = innerHeight;
        // призраки
        for (const g of ghosts) {
            g.ph += dt * g.sp;
            let ax = Math.sin(g.ph * .9) * 14, ay = Math.cos(g.ph * 1.3) * 10, scared = false;
            if (mx != null) {
                const dx = g.x - mx, dy = g.y - my, d = Math.hypot(dx, dy) || 1;
                if (d < 150) { const f = (150 - d) / 150 * 900; ax += dx / d * f; ay += dy / d * f; scared = true; }
                else if (g.curious && d > 240 && d < 900) { ax -= dx / d * 55; ay -= dy / d * 55; }       // любопытные подплывают поближе
            }
            g.vx += ax * dt * 3; g.vy += ay * dt * 3;
            const sp = Math.hypot(g.vx, g.vy), max = scared ? 420 : 70; if (sp > max) { g.vx *= max / sp; g.vy *= max / sp; }
            g.vx *= (1 - dt * .8); g.vy *= (1 - dt * .8);
            g.x += g.vx * dt; g.y += g.vy * dt;
            if (g.x < 10) { g.x = 10; g.vx = Math.abs(g.vx); } if (g.x > W - 40) { g.x = W - 40; g.vx = -Math.abs(g.vx); }
            if (g.y < 70) { g.y = 70; g.vy = Math.abs(g.vy); } if (g.y > H - 50) { g.y = H - 50; g.vy = -Math.abs(g.vy); }
            if (scared && !g.say) { g.say = 1.3; g.n.firstChild.textContent = pick(SAY); }
            if (g.say > 0) { g.say -= dt; if (g.say <= 0) g.say = 0; }
            g.n.classList.toggle('scared', scared && g.say > 0);
            const bob = Math.sin(g.ph * 2.2) * 5, tilt = Math.max(-18, Math.min(18, g.vx * .08));
            g.n.style.transform = `translate3d(${g.x}px,${g.y + bob}px,0) rotate(${tilt}deg)`;
        }
        eyes();
    }

    // ---------- тыквы: поворачиваются за курсором, при приближении светятся ярче ----------
    function eyes() {
        for (const p of [petL, petR]) {
            if (!p.offsetParent) continue;
            const r = p.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * .55;
            let ry = 0, rx = 0, near = false;
            if (mx != null) { const dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy) || 1; near = d < 220; ry = Math.max(-38, Math.min(38, dx / 9)); rx = Math.max(-16, Math.min(16, -dy / 14)); }
            const b = p.querySelector('.pk-body');
            p._ry = (p._ry || 0) + (ry - (p._ry || 0)) * .12; p._rx = (p._rx || 0) + (rx - (p._rx || 0)) * .12;
            b.style.setProperty('--ry', p._ry.toFixed(1) + 'deg'); b.style.setProperty('--rx', p._rx.toFixed(1) + 'deg');
            p.classList.toggle('near', near);
        }
    }
    function jump(p) {
        p.classList.remove('jump'); void p.offsetWidth; p.classList.add('jump');
        p.querySelector('.say').textContent = pick(['Бу!', 'Хи-хи!', 'С праздником!', 'Сладость или гадость?']);
        setTimeout(() => p.classList.remove('jump'), 900);
    }

    // ---------- события мыши / касаний ----------
    let releaseT = 0;
    function onMove(e) {
        if (!on) return;
        mx = e.clientX; my = e.clientY;
        if (e.pointerType === 'touch') { clearTimeout(releaseT); releaseT = setTimeout(() => { mx = my = null; }, 1600); }
    }
    function onDown(e) {
        if (!on || e.target.closest && e.target.closest('.hw-pet')) return;
        mx = e.clientX; my = e.clientY;
        if (e.pointerType === 'touch') { clearTimeout(releaseT); releaseT = setTimeout(() => { mx = my = null; }, 1600); }
        for (const g of ghosts) {                                  // клик по призраку — он просто перемещается на новое место
            if (Math.hypot(g.x + 15 - mx, g.y + 18 - my) < 34) { g.x = rnd(0, innerWidth); g.y = rnd(90, innerHeight - 90); g.vx = rnd(-80, 80); return; }
        }
    }
    petL.addEventListener('click', () => jump(petL)); petR.addEventListener('click', () => jump(petR));
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerleave', () => { mx = my = null; });
    document.documentElement.addEventListener('mouseleave', () => { mx = my = null; });
    addEventListener('resize', () => { if (on) ensureGhosts(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } });

    // ---------- включение / выключение ----------
    function apply() {
        document.body.classList.toggle('hw', on);
        tgl.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) {
            ensureGhosts();
            if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
        } else {
            cancelAnimationFrame(raf); raf = 0;
            ghosts.forEach(g => g.n.remove()); ghosts = [];
        }
    }
    tgl.addEventListener('click', () => {
        on = !on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { }
        apply();
    });

    if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
