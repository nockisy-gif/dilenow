// ELO SNS — движок рамок окна профиля: генерация CSS, применение к #modal, вкладка магазина, режим эффектов.
// Подключается после pframes-data.js и pframes-elite.js, до app.js. Баланс/покупки не дублирует: использует существующие
// buy()/equip() из extras.js (транзакция Firestore + firestore.rules), слот equipped.pframe.
(function () {
    // ---------- CSS каждой рамки ----------
    (function inject() {
        let css = '';
        PF_LIST.forEach(it => {
            const s = '.pf-' + it.id, w = it.w, r = it.r.length === 1 ? [it.r[0], it.r[0], it.r[0], it.r[0]] : it.r;
            css += `${s}{--w:${w}px;--r:${r.map(v => v + 'px').join(' ')};--rr:${r.map(v => (v + w) + 'px').join(' ')};--sp:${it.sp || 4}s;--gl:${it.gl};--go:${it.go ?? .7};${it.bl ? `--bl:${it.bl}px;` : ''}}`;
            css += `${s}::before,${s}::after{background:${it.ring}}`;
            if (!it.sp) css += `${s}::before,${s}::after{animation:none}`;
            if (it.css) css += it.css.replace(/&/g, s);
        });
        const st = document.createElement('style'); st.id = 'pf-css'; st.textContent = css; document.head.appendChild(st);
    })();

    // ---------- режим эффектов: full / lite / off (слабые устройства и «уменьшить движение» — автоматически) ----------
    const KEY = 'pf_fx';
    const root = document.documentElement;
    function autoMode() {
        try {
            if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off';
            if ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2) return 'lite';
        } catch (e) { }
        return 'full';
    }
    let mode; try { mode = localStorage.getItem(KEY); } catch (e) { }
    if (!['full', 'lite', 'off'].includes(mode)) mode = autoMode();
    root.dataset.pfFx = mode;

    // ---------- декор ----------
    function deco(id, mock) {
        const it = PF_BY_ID[id]; if (!it) return '';
        return `<div class="pf-deco" aria-hidden="true">${it.inner ? `<div class="pf-in">${it.inner}</div>` : ''}${it.deco ? it.deco() : ''}${it.fx ? `<div class="pf-pw" style="position:absolute;inset:0">${pfParts(id, it.fx, mock)}</div>` : ''}</div>`;
    }
    const cardEl = () => document.querySelector('#modal .modal-card');
    function clear() {
        const c = cardEl(); if (!c) return;
        if (c.dataset.pf) { c.classList.remove('pf-host', 'pf-' + c.dataset.pf); delete c.dataset.pf; }
        c.querySelectorAll(':scope > .pf-deco').forEach(e => e.remove());
    }
    // надеть рамку игрока p на открытое окно профиля
    function apply(p) {
        clear();
        const id = p && p.equipped && p.equipped.pframe;
        if (!id || !PF_BY_ID[id]) return;
        const c = cardEl(); if (!c) return;
        c.classList.add('pf-host', 'pf-' + id); c.dataset.pf = id;
        c.insertAdjacentHTML('beforeend', deco(id, false));
        const b = document.getElementById('modal-body'); if (b) b.scrollTop = 0;
    }

    // надеть рамку игрока p на любой элемент (страница профиля игрока из поиска); true — рамка надета
    function mount(el, p) {
        if (!el) return false;
        if (el.dataset.pf) { el.classList.remove('pf-host', 'pf-' + el.dataset.pf); delete el.dataset.pf; }
        el.querySelectorAll(':scope > .pf-deco').forEach(e => e.remove());
        const id = p && p.equipped && p.equipped.pframe;
        if (!id || !PF_BY_ID[id]) return false;
        el.classList.add('pf-host', 'pf-' + id); el.dataset.pf = id;
        el.insertAdjacentHTML('beforeend', deco(id, false));
        return true;
    }

    // ---------- магазин ----------
    const fmt = n => Number(n).toLocaleString('ru');
    const escH = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function card(it, me, inv, eq) {
        const has = inv.has(it.id), on = (eq || {}).pframe === it.id, C = PF_CATS[it.cat];
        let btn;
        if (!me) btn = '<button class="btn btn-sm btn-ghost" data-shop-login>Войти, чтобы купить</button>';
        else if (on) btn = `<button class="btn btn-sm btn-ghost" data-unequip="${it.id}">Снять</button>`;
        else if (has) btn = `<button class="btn btn-sm btn-green" data-equip="${it.id}">Применить</button>`;
        else if (it.needUnlimited && !me.unlimited) btn = '<button class="btn btn-sm btn-ghost" disabled>🔒 Только безлимитный баланс</button>';
        else btn = window.shopBuyButtons ? window.shopBuyButtons(it, me) : `<button class="btn btn-sm" data-buy="${it.id}"><span class="price"><span class="coin"></span>${me.unlimited ? 'Бесплатно' : fmt(it.price)}</span></button>`;
        const status = on ? '<span class="tag e">НАДЕТО</span>' : has ? '<span class="tag s">✔ КУПЛЕНО</span>' : '';
        return `<div class="item pf-item r-${it.cat} ${on ? 'on' : ''}">
            ${status}<span class="pf-rar" style="color:${C.col}">${C.rar}</span>
            <div class="pf-prev-wrap"><div class="pf-mock pf-host pf-${it.id}"><div class="pf-fake"><i></i><div><b></b><u></u></div></div>${deco(it.id, true)}</div></div>
            <div class="nm">${escH(it.name)}</div><div class="ds">${escH(it.desc)}</div>
            ${it.needUnlimited ? '<div class="pf-lock">Недоступна обычным аккаунтам</div>' : ''}${btn}</div>`;
    }
    function shop(me) {
        const inv = new Set((me && me.inventory) || []), eq = (me && me.equipped) || {};
        const cur = eq.pframe && PF_BY_ID[eq.pframe];
        const modeBtn = (m, t) => `<button data-pf-mode="${m}" class="${mode === m ? 'on' : ''}">${t}</button>`;
        let h = `<div class="shop-hint">🪟 <b>Рамки окна профиля.</b> Видны всем, кто открывает твою статистику. Купил → «Применить» → закрой и открой профиль снова: выбранная рамка сохраняется в аккаунте.</div>
            <div class="pf-bar"><span>Эффекты:</span>${modeBtn('full', 'Полные')}${modeBtn('lite', 'Лёгкие')}${modeBtn('off', 'Выкл')}
            ${cur ? `<button data-unequip="${cur.id}">✖ Снять «${escH(cur.name)}» — вернуть стандартное окно</button>` : ''}</div>`;
        Object.keys(PF_CATS).forEach(k => {
            const C = PF_CATS[k], list = PF_LIST.filter(i => i.cat === k); if (!list.length) return;
            h += `<div class="shop-sec">${k === 'D' ? '👑 ' : k === 'E' ? '⚡ ' : ''}${C.name} <small>${C.price ? fmt(C.price) + ' монет · ' + Math.ceil(C.price / 200) + ' 🍬' : 'только безлимитный баланс'} · ${C.sub} · ${list.length} шт.</small></div><div class="shop-grid">${list.map(i => card(i, me, inv, eq)).join('')}</div>`;
        });
        return h;
    }

    // ---------- события ----------
    document.addEventListener('click', e => {
        const b = e.target.closest('[data-pf-mode]'); if (!b) return;
        mode = b.dataset.pfMode; root.dataset.pfFx = mode;
        try { localStorage.setItem(KEY, mode); } catch (er) { }
        b.parentElement.querySelectorAll('[data-pf-mode]').forEach(x => x.classList.toggle('on', x === b));
    });
    // превью вне экрана не анимируем (производительность)
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(es => es.forEach(en => en.target.classList.toggle('pf-paused', !en.isIntersecting)), { rootMargin: '80px' });
        const sb = document.getElementById('shop-body');
        if (sb) new MutationObserver(() => sb.querySelectorAll('.pf-mock:not([data-io])').forEach(m => { m.dataset.io = 1; io.observe(m); })).observe(sb, { childList: true });
    }

    window.PF = { apply, clear, mount, shop, card, deco, get mode() { return mode; } };
})();
