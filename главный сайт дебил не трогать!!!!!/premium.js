/* ==========================================================================
   PREMIUM ESPORTS — визуальный слой: анимации, фон, виджеты главной.
   ВАЖНО: файл ничего не заменяет в бизнес-логике. Он только ЧИТАЕТ уже
   существующие данные (lastByAll, allPlayers, allGuilds, коллекцию zaruby,
   глобальные showPage / openPlayerModal) и рисует поверх них.
   Удали <script src="premium.js"> — сайт продолжит работать как раньше.
   ========================================================================== */
(function () {
    'use strict';

    const $ = id => document.getElementById(id);
    const mq = q => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {}, addListener() {} });
    const reduceMQ = mq('(prefers-reduced-motion: reduce)');
    const fineMQ = mq('(hover: hover) and (pointer: fine)');
    const deskMQ = mq('(min-width: 901px)');
    const reduced = () => reduceMQ.matches;
    const isOverlay = () => document.body.classList.contains('overlay');
    const safe = (fn) => { try { return fn(); } catch (e) { console.warn('[premium]', e); } };
    // безопасное чтение глобальных переменных приложения (объявлены через let в app.js)
    const G = {
        top: () => (typeof lastByAll !== 'undefined' && Array.isArray(lastByAll) ? lastByAll : []),
        players: () => (typeof allPlayers !== 'undefined' && Array.isArray(allPlayers) ? allPlayers : null),
        guilds: () => (typeof allGuilds !== 'undefined' && Array.isArray(allGuilds) ? allGuilds : null)
    };
    const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2]; };
    const escH = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    const nf = n => Number(n).toLocaleString('ru-RU');
    const raf = (fn) => requestAnimationFrame(fn);

    /* ------------------------------------------------------------------
       1. ФОН: аврора + сетка + мягкие частицы (canvas, ~30 fps, спрайты)
       ------------------------------------------------------------------ */
    function initBackground() {
        if (isOverlay() || document.querySelector('.ff-bg')) return;
        const bg = document.createElement('div');
        bg.className = 'ff-bg'; bg.setAttribute('aria-hidden', 'true');
        bg.innerHTML = '<i class="a1"></i><i class="a2"></i><i class="a3"></i><i class="grid"></i>';
        const canvas = document.createElement('canvas');
        bg.appendChild(canvas);
        document.body.appendChild(bg);

        const ctx = canvas.getContext && canvas.getContext('2d');
        if (!ctx) return;
        let W = 0, H = 0, dpr = 1, parts = [], running = false, last = 0, sprites = null;

        const sprite = (rgb) => {
            const c = document.createElement('canvas'); c.width = c.height = 48;
            const x = c.getContext('2d'), gr = x.createRadialGradient(24, 24, 0, 24, 24, 24);
            gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(.25, 'rgba(' + rgb + ',.55)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
            x.fillStyle = gr; x.fillRect(0, 0, 48, 48); return c;
        };
        const target = () => {
            const base = Math.round((innerWidth * innerHeight) / 52000);
            const cores = navigator.hardwareConcurrency || 4;
            return Math.max(10, Math.min(cores <= 2 ? 16 : 44, base));
        };
        const spawn = (initial) => ({
            x: Math.random() * W, y: initial ? Math.random() * H : H + 20,
            r: 2 + Math.random() * 5.5, vy: 6 + Math.random() * 18, sway: Math.random() * 6.28, sp: .3 + Math.random() * .7,
            a: .25 + Math.random() * .55, k: Math.random() < .28 ? 1 : 0
        });
        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            W = innerWidth; H = innerHeight;
            canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const n = target();
            while (parts.length < n) parts.push(spawn(true));
            parts.length = Math.min(parts.length, n);
        };
        const frame = (t) => {
            if (!running) return;
            raf(frame);
            if (t - last < 30) return;                         // ~30 fps: мягко и дёшево
            const dt = Math.min((t - last) / 1000, .1); last = t;
            ctx.clearRect(0, 0, W, H);
            const warm = document.body.classList.contains('hw');
            const s = warm ? sprites.warm : sprites.cool;
            for (let i = 0; i < parts.length; i++) {
                const p = parts[i];
                p.y -= p.vy * dt; p.sway += p.sp * dt;
                p.x += Math.sin(p.sway) * 10 * dt;
                if (p.y < -20) { parts[i] = spawn(false); continue; }
                const fade = Math.min(1, Math.max(0, p.y / (H * .25)), (H - p.y) / 60 + .2);
                ctx.globalAlpha = p.a * Math.min(1, fade);
                const sz = p.r * 4;
                ctx.drawImage(p.k ? s.b : s.a, p.x - sz / 2, p.y - sz / 2, sz, sz);
            }
            ctx.globalAlpha = 1;
        };
        const start = () => { if (running || reduced() || document.hidden) return; running = true; last = 0; raf(frame); };
        const stop = () => { running = false; ctx.clearRect(0, 0, W, H); };

        sprites = { cool: { a: sprite('183,140,255'), b: sprite('255,79,216') }, warm: { a: sprite('255,170,70'), b: sprite('255,110,40') } };
        resize();
        let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 200); }, { passive: true });
        document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
        const onRM = () => { if (reduced()) { stop(); canvas.style.display = 'none'; } else { canvas.style.display = ''; start(); } };
        reduceMQ.addEventListener ? reduceMQ.addEventListener('change', onRM) : reduceMQ.addListener(onRM);
        if (reduced()) canvas.style.display = 'none'; else start();
    }

    /* ------------------------------------------------------------------
       2. Подсветка-«прожектор» под курсором на карточках (только мышь)
       ------------------------------------------------------------------ */
    function initSpotlight() {
        if (!fineMQ.matches) return;
        let tick = 0, ev = null;
        document.addEventListener('pointermove', e => {
            if (e.pointerType && e.pointerType !== 'mouse') return;
            ev = e; if (tick) return;
            tick = raf(() => {
                tick = 0;
                const el = ev.target && ev.target.closest && ev.target.closest('.ff-widget, .stat-card');
                if (!el) return;
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
                el.style.setProperty('--my', (ev.clientY - r.top) + 'px');
            });
        }, { passive: true });
    }

    /* ------------------------------------------------------------------
       3. Экран загрузки
       ------------------------------------------------------------------ */
    function initLoader() {
        const el = $('ff-loader');
        if (!el) return;
        const t0 = performance.now();
        let done = false;
        const finish = () => {
            if (done) return; done = true;
            el.classList.add('is-done'); document.body.classList.add('ff-ready');
            setTimeout(() => el.remove(), 900);
        };
        if (reduced()) { el.remove(); document.body.classList.add('ff-ready'); return; }
        const ready = () => {
            const pl = $('stat-players');
            const hasData = !!pl && pl.textContent.trim() !== '0' && pl.textContent.trim() !== '';
            return document.readyState === 'complete' && (hasData || performance.now() - t0 > 2200);
        };
        const poll = () => {
            if (done) return;
            if (performance.now() - t0 > 900 && ready()) return finish();
            if (performance.now() - t0 > 3500) return finish();   // не держим пользователя дольше 3.5 с
            setTimeout(poll, 80);
        };
        poll();
    }

    /* ------------------------------------------------------------------
       4. Полоса перехода между страницами
       ------------------------------------------------------------------ */
    function initProgress() {
        const bar = $('ff-progress');
        if (!bar) return;
        document.addEventListener('click', e => {
            const t = e.target.closest && e.target.closest('[data-page]');
            if (!t || reduced()) return;
            bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run');
        });
        const brand = document.querySelector('.brand[data-page]');
        if (brand) brand.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); brand.click(); } });
    }

    /* ------------------------------------------------------------------
       5. Анимированные счётчики (следят за значениями, которые пишет app.js)
       ------------------------------------------------------------------ */
    const easeOut = t => 1 - Math.pow(1 - t, 4);
    function countTo(el, to, dur) {
        if (!el) return;
        const from = Number(el.dataset.ffV) || 0;
        el.dataset.ffV = to;
        cancelAnimationFrame(el._ffRaf);
        const put = v => { const s = nf(Math.max(0, Math.round(v))); el.dataset.ffShown = s; el.textContent = s; };
        if (reduced() || from === to || document.hidden) return put(to);
        const t0 = performance.now(); dur = dur || 1100;
        const step = () => {
            const k = Math.min(1, Math.max(0, (performance.now() - t0) / dur));
            put(from + (to - from) * easeOut(k));
            if (k < 1) el._ffRaf = raf(step);
        };
        el._ffRaf = raf(step);
    }
    function watchCounter(el) {
        if (!el || el._ffWatch) return; el._ffWatch = true;
        const read = () => {
            const txt = el.textContent.trim();
            if (txt === el.dataset.ffShown) return;                       // это наша запись
            const n = parseFloat(txt.replace(/\s/g, '').replace(',', '.'));
            if (isFinite(n)) countTo(el, n);
        };
        new MutationObserver(read).observe(el, { childList: true, characterData: true, subtree: true });
        read();
    }
    function initCounters() {
        // stat-players / stat-videos / stat-bans уже анимирует extras.js — их не трогаем, чтобы не было конфликта
        watchCounter($('ff-stat-guilds'));
    }

    /* ------------------------------------------------------------------
       6. Верхняя панель: поиск, вход, перенос баланса / тумблера Хэллоуина
       ------------------------------------------------------------------ */
    function initTopbar() {
        const form = $('ff-search-form'), input = $('ff-search');
        if (!form || !input) return;
        const real = () => $('player-search');
        form.addEventListener('submit', e => {
            e.preventDefault();
            const v = input.value.trim(), tgt = real();
            if (typeof showPage === 'function') showPage('search');
            if (tgt) { tgt.value = v; tgt.dispatchEvent(new Event('input', { bubbles: true })); }
            input.blur();
        });
        input.addEventListener('input', () => {                    // когда уже на странице поиска — результаты обновляются на лету
            const page = $('page-search'), tgt = real();
            if (page && page.classList.contains('active') && tgt) { tgt.value = input.value; tgt.dispatchEvent(new Event('input', { bubbles: true })); }
        });
        const sync = () => {                                        // зеркалим значение, если ввели в поле на самой странице
            const tgt = real(); if (tgt && tgt.value !== input.value && document.activeElement !== input) input.value = tgt.value;
        };
        const tgt = real(); if (tgt) tgt.addEventListener('input', sync);

        // кнопка «Войти» / имя профиля
        const loginBtn = $('ff-login'), loginT = $('ff-login-t');
        const upd = () => {
            const box = $('profile-info-box'), nm = $('my-profile-display-name');
            const logged = !!(box && box.style.display !== 'none' && nm && nm.textContent.trim() && nm.textContent.trim() !== '-');
            loginBtn.classList.toggle('in', logged);
            loginT.textContent = logged ? nm.textContent.trim() : 'Войти';
        };
        const box = $('profile-info-box');
        if (box) new MutationObserver(upd).observe(box, { attributes: true, attributeFilter: ['style'], subtree: true, childList: true, characterData: true });
        upd();

        // баланс монет (#coin-chip) и тумблер Хэллоуина живут в шапке — на ПК переносим их в верхнюю панель
        const actions = $('ff-actions'), header = document.querySelector('.site-header'), burger = $('burger');
        const place = () => {
            const items = [$('coin-chip'), document.querySelector('.hw-toggle:not(.fixed)')].filter(Boolean);
            items.forEach(n => {
                if (deskMQ.matches) { if (n.parentNode !== actions) actions.appendChild(n); }
                else if (header && n.parentNode !== header) header.insertBefore(n, burger || null);
            });
        };
        if (header) new MutationObserver(place).observe(header, { childList: true });
        deskMQ.addEventListener ? deskMQ.addEventListener('change', place) : deskMQ.addListener(place);
        place(); setTimeout(place, 600); setTimeout(place, 2000);
    }

    /* ------------------------------------------------------------------
       7. Главная: виджеты на реальных данных
       ------------------------------------------------------------------ */
    let topShown = false, achShown = false, matchShown = false;
    const TIER_T = ['diamond', 'gold', 'silver', 'bronze', 'bronze'];
    const TIER_N = ['Алмазный ранг', 'Золотой ранг', 'Серебряный ранг', 'Бронзовый ранг', 'Бронзовый ранг'];
    const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z"/></svg>';

    function playerAv(p, i) {
        const tier = typeof tierOf === 'function' ? tierOf(i, (Number(p.elo) || 0) > 0) : '';
        if (typeof avatarBox === 'function') return safe(() => avatarBox(p.avatarUrl, tier, undefined, false, p)) || '';
        return '<img class="table-avatar-square" src="' + escH(p.avatarUrl || '') + '" alt="">';
    }

    function renderTop() {
        const list = $('ff-toplist'); if (!list) return;
        const arr = G.top();
        if (!arr.length) {
            const P = G.players();                                  // игроки загружены, но матчей ещё нет
            if (P && P.length) list.innerHTML = '<li class="ff-empty">Пока никто не сыграл матч</li>';
            return;
        }
        const first = !topShown; topShown = true;
        list.innerHTML = arr.slice(0, 5).map((p, i) => {
            const nm = escH(p.displayName || p.username || '—');
            return '<li data-pid="' + escH(p.id) + '" tabindex="0" role="button" class="' + (first ? 'ff-in' : '') + '" style="--i:' + i + '">' +
                '<span class="ff-rank">' + (i === 0 ? CROWN : (i + 1)) + '</span>' + playerAv(p, i) +
                '<span class="ff-nm">' + nm + (p.username ? '<small>@' + escH(String(p.username).replace(/^@/, '')) + '</small>' : '') + '</span>' +
                '<span class="ff-elo" data-elo="' + (Number(p.elo) || 0) + '">' + (first && !reduced() ? '0' : nf(Number(p.elo) || 0)) + '</span></li>';
        }).join('');
        if (first && !reduced()) list.querySelectorAll('.ff-elo').forEach(e => countTo(e, Number(e.dataset.elo) || 0, 1300));
    }

    function renderAch() {
        const box = $('ff-badges'); if (!box) return;
        const arr = G.top();
        const first = !achShown; achShown = true;
        box.innerHTML = TIER_T.map((t, i) => {
            const p = arr[i];
            const cls = p ? 't-' + t : 't-locked';
            return '<div class="ff-badge ' + cls + (first ? ' ff-in' : '') + '" style="--i:' + i + '" ' + (p ? 'data-pid="' + escH(p.id) + '" role="button" tabindex="0"' : '') + '>' +
                '<span class="ff-hexw"><span class="ff-hex"><span class="ff-hn">' + (i + 1) + '</span></span></span>' +
                '<span class="ff-b-t">' + (p ? TIER_N[i] : 'Свободно') + '</span>' +
                '<span class="ff-b-n">' + (p ? escH(p.displayName || p.username || '') : '—') + '</span></div>';
        }).join('');
    }

    /* --- зарубы: общий источник для графика и «Последних матчей» --- */
    let ZB = null, zbErr = false, range = 7;
    const DAY = 864e5;
    const ago = ts => {
        const s = Math.max(0, (Date.now() - ts) / 1000);
        if (s < 60) return 'только что';
        if (s < 3600) return Math.floor(s / 60) + ' мин. назад';
        if (s < 86400) return Math.floor(s / 3600) + ' ч. назад';
        if (s < 86400 * 30) return Math.floor(s / 86400) + ' дн. назад';
        return new Date(ts).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    function renderMatches() {
        const box = $('ff-matches'); if (!box) return;
        if (zbErr) { box.innerHTML = '<div class="ff-empty">Не удалось загрузить матчи</div>'; return; }
        if (ZB === null) return;
        if (!ZB.length) { box.innerHTML = '<div class="ff-empty">Заруб пока нет — они появятся после первого одобренного отчёта</div>'; return; }
        const first = !matchShown; matchShown = true;
        box.innerHTML = ZB.slice(0, 4).map((z, i) => {
            const w = z.winner;
            const tag = w === 'draw' ? '<span class="ff-tag draw">Ничья</span>' : (w === 'left' || w === 'right') ? '<span class="ff-tag win">🏆 ' + escH(w === 'left' ? z.left : z.right) + '</span>' : '';
            return '<div class="ff-match' + (first ? ' ff-in' : '') + '" style="--i:' + i + '" role="button" tabindex="0" data-zb="' + escH(z.id) + '">' +
                '<span class="ff-m-l' + (w === 'left' ? ' win' : '') + '">' + escH(z.left || '—') + '</span>' +
                '<span class="ff-m-s">' + (Number(z.l) || 0) + ' : ' + (Number(z.r) || 0) + '</span>' +
                '<span class="ff-m-r' + (w === 'right' ? ' win' : '') + '">' + escH(z.right || '—') + '</span>' +
                '<span class="ff-m-w">' + tag + '<span>' + escH(ago(z.ts)) + '</span></span></div>';
        }).join('');
    }

    /* --- график: количество зарубов по дням / неделям (SVG, рисуется под реальную ширину) --- */
    function buckets() {
        const now = Date.now(), d0 = new Date(now); d0.setHours(23, 59, 59, 999);
        const end = d0.getTime();
        const step = range === 90 ? 7 : 1, n = range === 90 ? 13 : range;
        const out = [];
        for (let i = n - 1; i >= 0; i--) {
            const to = end - i * step * DAY, from = to - step * DAY;
            out.push({ from, to, v: 0, label: '' });
        }
        (ZB || []).forEach(z => { const ts = Number(z.ts); if (!ts) return; const b = out.find(b => ts > b.from && ts <= b.to); if (b) b.v++; });
        out.forEach((b, i) => {
            const d = new Date(b.to);
            const wd = d.toLocaleDateString('ru', { weekday: 'short' });
            const dm = d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
            b.title = step === 7 ? 'Неделя до ' + dm : d.toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long' });
            b.label = range === 7 ? wd.charAt(0).toUpperCase() + wd.slice(1) : (range === 30 ? (i % 5 === 4 || i === 0 ? dm : '') : dm);
        });
        return out;
    }
    const smooth = (pts) => {
        if (pts.length < 2) return 'M' + pts[0].x + ',' + pts[0].y;
        let d = 'M' + pts[0].x + ',' + pts[0].y;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, t = .18;
            const c1x = p1.x + (p2.x - p0.x) * t, c1y = p1.y + (p2.y - p0.y) * t, c2x = p2.x - (p3.x - p1.x) * t, c2y = p2.y - (p3.y - p1.y) * t;
            d += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + p2.x.toFixed(1) + ',' + p2.y.toFixed(1);
        }
        return d;
    };
    function renderChart() {
        const box = $('ff-chart-body'); if (!box) return;
        const W = Math.max(260, box.clientWidth || 600), H = box.clientHeight || 230;
        if (ZB === null && !zbErr) { box.innerHTML = '<div class="ff-skel-row" style="height:100%"></div>'; return; }
        const b = buckets();
        const total = b.reduce((s, x) => s + x.v, 0);
        const max = Math.max(4, Math.ceil(Math.max.apply(null, b.map(x => x.v)) / 4) * 4);
        const L = 34, R = 12, T = 16, B = 30, iw = W - L - R, ih = H - T - B;
        const px = i => L + (b.length === 1 ? iw / 2 : (iw * i) / (b.length - 1));
        const py = v => T + ih - (v / max) * ih;
        const pts = b.map((x, i) => ({ x: +px(i).toFixed(1), y: +py(x.v).toFixed(1) }));
        const line = smooth(pts);
        const area = line + ' L' + pts[pts.length - 1].x + ',' + (T + ih) + ' L' + pts[0].x + ',' + (T + ih) + ' Z';
        let grid = '';
        for (let k = 0; k <= 4; k++) { const v = (max / 4) * k, y = py(v); grid += '<line class="ff-grid-l" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text class="ff-ax" x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + Math.round(v) + '</text>'; }
        const labels = b.map((x, i) => x.label ? '<text class="ff-ax" x="' + pts[i].x + '" y="' + (H - 8) + '" text-anchor="middle">' + escH(x.label) + '</text>' : '').join('');
        const dots = b.length <= 31 ? pts.map((p, i) => '<circle class="ff-dot" style="--i:' + i + '" cx="' + p.x + '" cy="' + p.y + '" r="' + (b.length > 14 ? 3 : 4.5) + '"/>').join('') : '';
        box.classList.remove('hover');
        box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="График количества зарубов">' +
            '<defs><linearGradient id="ffLineG" x1="0" x2="1"><stop offset="0" stop-color="#8f3dff"/><stop offset=".6" stop-color="#c08bff"/><stop offset="1" stop-color="#ff4fd8"/></linearGradient>' +
            '<linearGradient id="ffAreaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f3dff" stop-opacity=".5"/><stop offset="1" stop-color="#8f3dff" stop-opacity="0"/></linearGradient></defs>' +
            grid + '<path class="ff-area" d="' + area + '"/><path class="ff-line" d="' + line + '"/>' + dots + labels +
            '<line class="ff-guide" x1="0" x2="0" y1="' + T + '" y2="' + (T + ih) + '"/><circle class="ff-hov" r="6" cx="0" cy="0"/></svg>' +
            '<div class="ff-tip"><b></b><span></span></div>' + (total ? '' : '<div class="ff-chart-empty">' + (zbErr ? 'Не удалось загрузить данные' : 'За выбранный период зарубов не было') + '</div>');
        const path = box.querySelector('.ff-line');
        if (path && path.getTotalLength) path.style.setProperty('--len', Math.ceil(path.getTotalLength()) + 2);

        // тултип по наведению / касанию
        const svg = box.querySelector('svg'), tip = box.querySelector('.ff-tip'), guide = box.querySelector('.ff-guide'), hov = box.querySelector('.ff-hov');
        const move = (clientX) => {
            const r = svg.getBoundingClientRect(), x = (clientX - r.left) * (W / r.width);
            let bi = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.abs(p.x - x); if (d < bd) { bd = d; bi = i; } });
            const p = pts[bi];
            guide.setAttribute('x1', p.x); guide.setAttribute('x2', p.x); hov.setAttribute('cx', p.x); hov.setAttribute('cy', p.y);
            tip.style.left = (p.x / W * 100) + '%'; tip.style.top = (p.y / H * 100) + '%';
            tip.querySelector('b').textContent = b[bi].v + ' ' + plural(b[bi].v, ['заруб', 'заруба', 'зарубов']);
            tip.querySelector('span').textContent = b[bi].title;
            box.classList.add('hover');
        };
        svg.addEventListener('pointermove', e => move(e.clientX));
        svg.addEventListener('pointerdown', e => move(e.clientX));
        svg.addEventListener('pointerleave', () => box.classList.remove('hover'));
    }

    function initZaruby() {
        if (!$('ff-chart') || typeof db === 'undefined') return;
        // тот же запрос, что и во вкладке «Зарубы» — Firestore объединяет одинаковые подписки, лишних чтений нет
        safe(() => db.collection('zaruby').orderBy('ts', 'desc').limit(200).onSnapshot(s => {
            ZB = s.docs.map(d => ({ ...d.data(), id: d.id })); zbErr = false; renderMatches(); renderChart();
        }, () => { zbErr = true; ZB = ZB || []; renderMatches(); renderChart(); }));
        const rng = $('ff-range');
        if (rng) rng.addEventListener('click', e => {
            const b = e.target.closest('button[data-r]'); if (!b) return;
            range = Number(b.dataset.r); rng.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); renderChart();
        });
        let rt, lastW = 0;
        const box = $('ff-chart-body');
        if (box && window.ResizeObserver) new ResizeObserver(() => { const w = box.clientWidth; if (!w || Math.abs(w - lastW) < 4) return; lastW = w; clearTimeout(rt); rt = setTimeout(renderChart, 120); }).observe(box);
        renderChart();
    }

    /* --- «Битва месяца»: таймер до сброса + лидер --- */
    function renderLead() {
        const el = $('ff-arena-lead'); if (!el) return;
        const P = G.players(), pk = typeof periodKey === 'function' ? periodKey() : null;
        if (!P || !pk) return;
        const n = (o, k) => Number(o[k]) || 0;
        const arr = P.filter(p => !p.banned && p.monthKey === pk && n(p, 'mGames') > 0).sort((a, b) => (n(b, 'mElo') - n(a, 'mElo')) || (n(b, 'mWins') - n(a, 'mWins')) || (n(b, 'mKills') - n(a, 'mKills')));
        if (!arr.length) { el.textContent = 'Лидер месяца определится после первых матчей'; return; }
        const t = arr[0], e = n(t, 'mElo');
        el.innerHTML = 'Лидер месяца: <b>' + escH(t.displayName || t.username) + '</b> · ' + (e >= 0 ? '+' : '') + e + ' ELO · побед: ' + n(t, 'mWins');
    }
    function tickCountdown() {
        if (!$('ff-count') || typeof nextReset !== 'function' || document.hidden) return;
        const ms = Math.max(0, nextReset() - Date.now());
        const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
        const set = (id, v) => { const el = $(id); if (el && el.textContent !== v) el.textContent = v; };
        set('ff-cd-d', String(d)); set('ff-cd-h', String(h).padStart(2, '0')); set('ff-cd-m', String(m).padStart(2, '0')); set('ff-cd-s', String(s).padStart(2, '0'));
    }

    function initHome() {
        if (!$('ff-top')) return;
        // клики по строкам виджетов
        document.addEventListener('click', e => {
            const el = e.target.closest && e.target.closest('#ff-toplist [data-pid], #ff-badges [data-pid]');
            if (el && typeof openPlayerModal === 'function') openPlayerModal(el.dataset.pid);
        });
        document.addEventListener('keydown', e => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const el = e.target.closest && e.target.closest('#ff-toplist [data-pid], #ff-badges [data-pid]');
            if (el && typeof openPlayerModal === 'function') { e.preventDefault(); openPlayerModal(el.dataset.pid); }
        });
        // перерисовываем, когда app.js обновил рейтинг (renderRanks пишет в эти узлы)
        let pend = 0;
        const refresh = () => { if (pend) return; pend = raf(() => { pend = 0; renderTop(); renderAch(); renderLead(); const gl = G.guilds(); if (gl) { const el = $('ff-stat-guilds'); if (el && el.dataset.ffV !== String(gl.length)) el.textContent = gl.length; } }); };
        ['all-players', 'month-players', 'all-guilds'].forEach(id => { const n = $(id); if (n) new MutationObserver(refresh).observe(n, { childList: true }); });
        const tn = $('top1-player-name'); if (tn) new MutationObserver(refresh).observe(tn, { childList: true, characterData: true, subtree: true });
        refresh(); setTimeout(refresh, 800); setTimeout(refresh, 2500);

        initZaruby();
        tickCountdown(); setInterval(tickCountdown, 1000);
        // метки «N мин. назад» в последних матчах
        setInterval(() => { if (!document.hidden && ZB) renderMatches(); }, 60000);
    }

    /* ------------------------------------------------------------------
       Пауза анимаций вне экрана. В магазине и рейтингах у каждой карточки
       своя живая анимация (рамки, баннеры, эффекты) — на телефоне их сотни.
       IntersectionObserver помечает невидимые карточки классом .ff-off,
       а CSS ставит их анимации на паузу. Данные и вёрстку не трогаем.
       ------------------------------------------------------------------ */
    function initOffscreenPause() {
        if (isOverlay() || !('IntersectionObserver' in window) || !('MutationObserver' in window)) return;
        const SEL = '#shop-body .item, #shop-body .pf-item, .container tbody tr';
        const seen = new WeakSet();
        const io = new IntersectionObserver(entries => {
            entries.forEach(en => en.target.classList.toggle('ff-off', !en.isIntersecting));
        }, { rootMargin: '160px 0px' });
        let pend = 0;
        const scan = () => {
            pend = 0;
            document.querySelectorAll(SEL).forEach(el => { if (!seen.has(el)) { seen.add(el); io.observe(el); } });
        };
        const schedule = () => { if (!pend) pend = raf(scan); };
        new MutationObserver(schedule).observe(document.querySelector('main.container') || document.body, { childList: true, subtree: true });
        scan();
    }

    /* ------------------------------------------------------------------ */
    function boot() {
        safe(initOffscreenPause);
        safe(initBackground);
        safe(initSpotlight);
        safe(initLoader);
        safe(initProgress);
        safe(initCounters);
        safe(initTopbar);
        safe(initHome);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
