// ELO SNS — дополнения: фон, монеты, магазин, стримеры (YouTube), правила, предпросмотр файлов
// Подключается ПОСЛЕ app.js и social.js.  Использует: db, auth, toast, esc, me, curUser, isAdmin, showPage, avatarBox
(function () {
    const $ = id => document.getElementById(id);
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    // =====================================================================
    // 1. ФОН: неоновые частицы, соединяющиеся линиями
    // =====================================================================
    function initBackground() {
        if (reduce || $('bg-fx')) return;
        ['bg-aurora', 'bg-grid'].forEach(c => { const d = document.createElement('div'); d.className = c; document.body.prepend(d); });
        const cv = document.createElement('canvas'); cv.id = 'bg-fx'; document.body.prepend(cv);
        const ctx = cv.getContext('2d');
        const COLORS = ['34,227,255', '139,92,246', '255,61,139'];
        let W = 0, H = 0, dpr = 1, dots = [], raf = 0, mx = -999, my = -999;
        const mobile = () => innerWidth < 768;

        function resize() {
            dpr = Math.min(devicePixelRatio || 1, 2);
            W = innerWidth; H = innerHeight;
            cv.width = W * dpr; cv.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const n = Math.round(Math.min(90, W * H / (mobile() ? 16000 : 15000)));
            dots = Array.from({ length: n }, () => ({
                x: Math.random() * W, y: Math.random() * H,
                vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35 - .05,
                r: Math.random() * 1.8 + .6, c: COLORS[(Math.random() * 3) | 0], p: Math.random() * 6.28
            }));
        }
        function frame(t) {
            ctx.clearRect(0, 0, W, H);
            const link = mobile() ? 90 : 130;
            for (let i = 0; i < dots.length; i++) {
                const a = dots[i];
                a.x += a.vx; a.y += a.vy;
                if (a.x < -10) a.x = W + 10; if (a.x > W + 10) a.x = -10;
                if (a.y < -10) a.y = H + 10; if (a.y > H + 10) a.y = -10;
                const tw = .55 + .45 * Math.sin(t / 700 + a.p);
                ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283);
                ctx.fillStyle = `rgba(${a.c},${.85 * tw})`; ctx.shadowColor = `rgba(${a.c},1)`; ctx.shadowBlur = 12; ctx.fill();
                ctx.shadowBlur = 0;
                for (let j = i + 1; j < dots.length; j++) {
                    const b = dots[j], dx = a.x - b.x, dy = a.y - b.y, d = dx * dx + dy * dy;
                    if (d < link * link) {
                        ctx.strokeStyle = `rgba(${a.c},${(1 - Math.sqrt(d) / link) * .22})`; ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
                const mdx = a.x - mx, mdy = a.y - my, md = mdx * mdx + mdy * mdy;
                if (md < 140 * 140) { ctx.strokeStyle = `rgba(255,255,255,${(1 - Math.sqrt(md) / 140) * .3})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); ctx.stroke(); }
            }
            raf = requestAnimationFrame(frame);
        }
        resize();
        addEventListener('resize', resize);
        addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
        addEventListener('pointerleave', () => { mx = my = -999; });
        document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(frame); });
        raf = requestAnimationFrame(frame);
    }

    // свечение карточек главной следует за курсором
    document.addEventListener('pointermove', e => {
        const f = e.target.closest && e.target.closest('.feature');
        if (!f) return;
        const r = f.getBoundingClientRect();
        f.style.setProperty('--mx', (e.clientX - r.left) / r.width * 100 + '%');
        f.style.setProperty('--my', (e.clientY - r.top) / r.height * 100 + '%');
    }, { passive: true });

    // счётчики на главной плавно «накручиваются»
    function countUp(el) {
        const to = Number(String(el.textContent).replace(/\D/g, '')) || 0;
        if (reduce || el._to === to) return;
        const from = Number(el._shown) || 0; el._to = to;
        const t0 = performance.now(), dur = 900;
        (function step(t) {
            const k = Math.min(1, (t - t0) / dur), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
            el._shown = v; el.textContent = v;
            if (k < 1) requestAnimationFrame(step);
        })(t0);
    }
    ['stat-players', 'stat-videos', 'stat-bans'].forEach(id => {
        const el = $(id); if (!el) return;
        new MutationObserver(() => { if (el._busy) return; el._busy = true; countUp(el); setTimeout(() => { el._busy = false; }, 1000); }).observe(el, { childList: true, characterData: true, subtree: true });
    });

    // =====================================================================
    // 2. МОНЕТЫ: баланс в шапке и всплывающее «+N»
    // =====================================================================
    function ensureChip() {
        if ($('coin-chip')) return $('coin-chip');
        const chip = document.createElement('button');
        chip.id = 'coin-chip'; chip.className = 'coin-chip'; chip.type = 'button'; chip.title = 'Мой баланс — открыть обменник';
        chip.innerHTML = '<span class="coin"></span><span id="coin-val">0</span><span class="candy-bal" id="candy-bal"><i>🍬</i><span id="candy-val">0</span></span>';
        chip.addEventListener('click', () => openExchange());
        const burger = $('burger');
        if (burger) burger.parentNode.insertBefore(chip, burger); else document.querySelector('header').appendChild(chip);
        return chip;
    }
    let lastCoins = null;
    function updateCoins() {
        const chip = ensureChip();
        if (!me) { chip.classList.remove('on'); lastCoins = null; lastCandies = null; return; }
        chip.classList.add('on');
        $('coin-val').textContent = coinsText(me);
        updateCandies();
        const cur = coinsOf(me);
        const key = 'elo_coins_' + me.id;
        const stored = lastCoins !== null ? lastCoins : Number(localStorage.getItem(key));
        if (cur !== Infinity) {
            if (Number.isFinite(stored) && localStorage.getItem(key) !== null && cur > stored) coinGain(cur - stored);
            try { localStorage.setItem(key, String(cur)); } catch (e) {}
        }
        lastCoins = cur === Infinity ? null : cur;
    }
    // 🍬 конфеты: показываем, пока идёт событие (или пока они есть на счёте), и радуемся каждой новой
    let lastCandies = null;
    function updateCandies() {
        const wrap = $('candy-bal'); if (!wrap || !me) return;
        const k = candiesOf(me);
        $('candy-val').textContent = candiesText(me);
        wrap.style.display = (!eventOver() || k > 0) ? '' : 'none';
        const key = 'elo_candies_' + me.id;
        const stored = lastCandies !== null ? lastCandies : Number(localStorage.getItem(key));
        if (Number.isFinite(stored) && localStorage.getItem(key) !== null && k > stored) {
            const chip = $('coin-chip'); chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
            toast('Награда: +' + (k - stored) + ' 🍬 конфет', 'success');
        }
        try { localStorage.setItem(key, String(k)); } catch (e) {}
        lastCandies = k;
        const xc = $('xc-candies'); if (xc) renderExchange();
    }
    function coinGain(n) {
        const chip = $('coin-chip');
        chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
        const f = document.createElement('div'); f.className = 'coin-float'; f.textContent = '+' + n + ' 🪙';
        const r = chip.getBoundingClientRect();
        f.style.right = Math.max(10, innerWidth - r.right) + 'px'; f.style.top = (r.bottom + 6) + 'px';
        document.body.appendChild(f); setTimeout(() => f.remove(), 2300);
        toast('Награда за матчи: +' + n + ' монет', 'success');
    }
    window.onMeExtras = function () { updateCoins(); if ($('page-shop') && $('page-shop').classList.contains('active')) renderShop(); };

    // =====================================================================
    // 3. МАГАЗИН
    // =====================================================================
    let shopTab = 'all';
    const owned = () => new Set((me && me.inventory) || []);
    const eq = () => (me && me.equipped) || {};

    function previewItem(it) {
        const src = me && me.avatarUrl;
        const p = { id: '__pv', equipped: { [it.type]: it.id } };
        const letter = esc(String((me && me.displayName) || 'E').trim().charAt(0).toUpperCase());
        if (it.type === 'banner') {
            const av = src ? `<span class="av-wrap"><img class="table-avatar-square" src="${esc(src)}" alt=""></span>` : `<span class="av-wrap"><span class="g-letter">${letter}</span></span>`;
            return `<div class="bn-prev ${bnClasses(p)}">${bnLayer(p)}${av}<span><b>${esc((me && me.displayName) || 'Твой ник')}</b></span></div>`;
        }
        if (src) return avatarBox(src, '', 'avatar-square', false, p);
        return `<span class="av-wrap ${cosClasses(p)}"><span class="g-letter">${letter}</span>${cosLayer(p)}</span>`;
    }
    // две кнопки покупки: за монеты и за конфеты. Хэллоуин-товары после события — «Временное событие»
    function shopBuyButtons(it, me) {
        if (it.hw && eventOver()) return '<button class="btn btn-sm btn-ghost btn-event" disabled>⏳ Временное событие</button>';
        if (me && me.unlimited) return `<button class="btn btn-sm" data-buy="${it.id}"><span class="price"><span class="coin"></span>Бесплатно</span></button>`;
        const candy = !eventOver() && !it.needUnlimited && it.price > 0
            ? `<button class="btn btn-sm btn-candy" data-buy-candy="${it.id}" title="${candyPriceOf(it.price)} конфет"><span class="price"><i>🍬</i>${candyPriceOf(it.price)}</span></button>` : '';
        return `<div class="buy-row"><button class="btn btn-sm" data-buy="${it.id}"><span class="price"><span class="coin"></span>${it.price}</span></button>${candy}</div>`;
    }
    window.shopBuyButtons = shopBuyButtons;
    function itemCard(it) {
        if (it.type === 'pframe') return PF.card(it, me, owned(), eq());
        const slot = it.type, has = owned().has(it.id), aw = awardOn(me, slot);
        let on = eq()[slot] === it.id && !aw, btn;
        if (it.award) {
            const mine = !!me && AWARD_RANK[me.id] === it.award;
            on = mine && aw;
            btn = !mine ? `<button class="btn btn-sm btn-ghost" disabled>🏆 Награда ${TOP_NAME[it.award]} месяца</button>`
                : on ? `<button class="btn btn-sm btn-ghost" data-unequip="${it.id}">Снять награду</button>`
                : `<button class="btn btn-sm btn-green" data-equip="${it.id}">Надеть награду</button>`;
        }
        else if (!me) btn = '<button class="btn btn-sm btn-ghost" data-shop-login>Войти, чтобы купить</button>';
        else if (on) btn = `<button class="btn btn-sm btn-ghost" data-unequip="${it.id}">Снять</button>`;
        else if (has) btn = `<button class="btn btn-sm btn-green" data-equip="${it.id}">Надеть</button>`;
        else btn = shopBuyButtons(it, me);
        const tag = it.award ? ['НАГРАДА', 'e'] : it.type === 'charm' ? ['БРЕЛОК', ''] : it.type === 'banner' ? (it.tier === 'excl' ? ['ЭКСКЛЮЗИВ', 'e'] : it.tier === 'prem' ? ['ПРЕМИУМ БАННЕР', 'e'] : it.tier === 'anim' ? ['БАННЕР · АНИМАЦИЯ', ''] : ['БАННЕР', 's']) : it.type === 'effect' ? ['АНИМАЦИЯ', ''] : it.tier === 'prem' ? ['ПРЕМИУМ РАМКА', 'e'] : ['РАМКА', 's'];
        return `<div class="item ${it.type === 'effect' || it.tier === 'anim' ? 'fx' : ''} ${it.tier === 'excl' || it.tier === 'prem' || it.award ? 'excl' : ''} ${on ? 'on' : ''}">
            <span class="tag ${tag[1]}">${tag[0]}</span>${on ? '<span class="tag e">НАДЕТО</span>' : ''}
            <div class="pv">${previewItem(it)}</div>
            <div class="nm">${esc(it.name)}</div><div class="ds">${esc(it.desc)}</div>${btn}</div>`;
    }
    function renderShop() {
        const box = $('shop-body'); if (!box) return;
        $('shop-bal').innerHTML = me
            ? `<span class="coin"></span><div><span id="shop-bal-n">${coinsText(me)}</span><small>${me.unlimited ? 'безлимитный баланс' : 'золотых монет'}</small></div>${(!eventOver() || candiesOf(me)) ? `<span class="shop-candy" data-xchg-open title="Открыть обменник"><i>🍬</i><div><span>${candiesText(me)}</span><small>конфет · обменник</small></div></span>` : ''}`
            : '<div><small style="margin:0">Войди в профиль, чтобы тратить монеты</small></div>';
        document.querySelectorAll('[data-shop-tab]').forEach(b => b.classList.toggle('on', b.dataset.shopTab === shopTab));
        const inv = owned();
        let noHw = false;
        const by = (type, fn) => SHOP_ITEMS.filter(i => i.type === type && !(noHw && i.hw) && (!fn || fn(i)));
        const sec = (title, sub, list) => list.length ? `<div class="shop-sec">${title} <small>${sub}</small></div><div class="shop-grid">${list.map(itemCard).join('')}</div>` : '';
        const frSecs = () => sec('👑 Премиум рамки', '2500 монет · драконы, громовержцы, феникс, портал', by('frame', i => i.price === 2500))
            + sec('🌸 Премиум рамки', '2000 монет · аниме, неон, мороз, космос', by('frame', i => i.price === 2000))
            + sec('🖼 Рамки', `${PRICE_FRAME} монет`, by('frame', i => i.tier !== 'prem'));
        const chSecs = () => sec('🦸 Брелки · Марвел', '1000 монет', by('charm', i => i.group === 'marvel'))
            + sec('🍥 Брелки · Аниме', '800 монет', by('charm', i => i.group === 'anime'))
            + sec('🐾 Брелки · Животные', '600 монет', by('charm', i => i.group === 'animals'))
            + sec('🎃 Брелки · Хэллоуин', '600 / 800 / 1000 монет', by('charm', i => i.group === 'halloween'));
        const bnSecs = () => sec('💎 Эксклюзивные баннеры', '1500 монет · анимация с героями, драконами и магией', by('banner', i => i.tier === 'excl'))
            + sec('🌌 Премиум баннеры', '2500 монет · неон, драконы, космос, аниме', by('banner', i => i.price === 2500))
            + sec('🌸 Премиум баннеры', '2000 монет · неон-Токио, сакура, лисы, рамен', by('banner', i => i.price === 2000))
            + sec('🎞 Анимированные баннеры', '500 / 700 / 800 монет', by('banner', i => i.tier === 'anim'))
            + sec('🏳 Обычные баннеры', '200 / 300 монет', by('banner', i => i.tier === 'plain'));
        const hwSecs = () => '<div class="shop-hint hw-hint">🎃 <b>Хэллоуин-коллекция.</b> Тыквы, призраки, летучие мыши, монстры и сам граф Дракула — рамки, баннеры, эффекты, брелки и рамки профиля. Временное событие до 7 ноября: всё можно купить за монеты <i>или</i> за конфеты 🍬, а после праздника товары уйдут из продажи (купленное останется у тебя навсегда).</div>'
            + (eventOver() ? '<div class="shop-hint event-over">⏳ <b>Временное событие завершено.</b> Хэллоуин-товары больше нельзя купить, но всё купленное осталось у игроков.</div>' : '')
            + sec('🕸 Баннеры', '500 – 2500 монет', SHOP_ITEMS.filter(i => i.hw && i.type === 'banner'))
            + sec('🖼 Рамки', '2000 / 2500 монет', SHOP_ITEMS.filter(i => i.hw && i.type === 'frame'))
            + sec('✨ Эффекты', `${PRICE_EFFECT} монет`, SHOP_ITEMS.filter(i => i.hw && i.type === 'effect'))
            + sec('🧷 Брелки', '600 / 800 / 1000 монет', SHOP_ITEMS.filter(i => i.hw && i.type === 'charm'))
            + sec('🪟 Рамки профиля', '1500 – 3500 монет · 👑 ADMIN DRACULA только для безлимита', SHOP_ITEMS.filter(i => i.hw && i.type === 'pframe'));
        let html = '';
        if (shopTab === 'mine') {
            const mine = [...SHOP_ITEMS.filter(i => inv.has(i.id))];
            const r = me && AWARD_RANK[me.id];
            if (r) mine.unshift(...TOP_ITEMS.filter(i => i.award === r));
            html = mine.length ? `<div class="shop-grid">${mine.map(itemCard).join('')}</div>` : '<div class="shop-hint">У тебя пока нет покупок. Загляни во вкладки «Баннеры», «Эффекты» и «Рамки».</div>';
        } else if (shopTab === 'top') {
            html = '<div class="shop-hint">🏆 <b>Награды ТОП-3 месяца.</b> Игроки, занявшие 1–3 места в рейтинге «За месяц», автоматически получают эксклюзивные баннер, рамку и анимацию — они не продаются и держатся до следующего сброса статистики (17 числа). Все видят, что ты в топе!</div>'
                + [1, 2, 3].map(r => `<div class="shop-sec">${r === 1 ? '👑' : '🏆'} ${TOP_NAME[r]} месяца</div><div class="shop-grid">${TOP_ITEMS.filter(i => i.award === r).map(itemCard).join('')}</div>`).join('');
        } else if (shopTab === 'hw') html = hwSecs();
        else if (shopTab === 'banner') html = bnSecs();
        else if (shopTab === 'excl') html = sec('💎 Эксклюзив', '1500 монет', by('banner', i => i.tier === 'excl'));
        else if (shopTab === 'effect') html = sec('✨ Анимированные эффекты и аватарки', `${PRICE_EFFECT} монет`, by('effect'));
        else if (shopTab === 'frame') html = frSecs();
        else if (shopTab === 'pframe') html = PF.shop(me);
        else if (shopTab === 'charm') html = '<div class="shop-hint">🧷 Брелок крепится к рамке аватарки и качается, вращается или пульсирует. Видно везде: в рейтингах, профиле и на стриме.</div>' + chSecs();
        else { noHw = true; html = hwSecs() + bnSecs() + sec('✨ Анимированные эффекты и аватарки', `${PRICE_EFFECT} монет`, by('effect')) + frSecs() + chSecs(); }
        box.innerHTML = html;
    }
    document.addEventListener('click', async e => {
        const t = e.target;
        let el;
        if ((el = t.closest('[data-shop-tab]'))) { shopTab = el.dataset.shopTab; renderShop(); return; }
        if (t.closest('[data-shop-login]')) { showPage('profile'); return; }
        if (t.closest('[data-xchg-open]')) return openExchange();
        if ((el = t.closest('[data-buy-candy]'))) return buy(el.dataset.buyCandy, el, 'candy');
        if ((el = t.closest('[data-buy]'))) return buy(el.dataset.buy, el, 'coin');
        if ((el = t.closest('[data-equip]'))) return equip(el.dataset.equip, true);
        if ((el = t.closest('[data-unequip]'))) return equip(el.dataset.unequip, false);
        if (t.closest('[data-page="shop"]')) setTimeout(renderShop, 0);
    });

    let buyBusy = false;
    async function buy(id, btn, cur = 'coin') {
        const it = ITEM_BY_ID.get(id);
        if (!me || !it) return;
        if (buyBusy) return;                                   // защита от повторного клика
        if (owned().has(id)) return toast('Это уже у тебя есть');
        if (it.hw && eventOver()) return toast('Временное событие завершено — этот товар больше не продаётся', 'error');
        if (it.needUnlimited && !me.unlimited) return toast('Эта рамка доступна только аккаунту с безлимитным балансом', 'error');
        const candy = cur === 'candy' && !me.unlimited, cp = candyPriceOf(it.price);
        if (candy && eventOver()) return toast('Конфеты работают только во время события', 'error');
        if (candy && candiesOf(me) < cp) return toast(`Не хватает конфет: нужно ${cp} 🍬, у тебя ${candiesText(me)}. Их можно получить за эйсы и серии или обменять на монеты`, 'error');
        if (!candy && !me.unlimited && coinsOf(me) < it.price) return toast(`Не хватает монет: нужно ${it.price}, у тебя ${coinsText(me)}`, 'error');
        if (!confirm(`Купить «${it.name}» за ${me.unlimited ? '0 монет' : candy ? cp + ' 🍬' : it.price + ' монет'}?`)) return;
        btn.disabled = true; buyBusy = true;
        const ref = db.collection('players').doc(me.id);
        try {
            await db.runTransaction(async tx => {
                const s = await tx.get(ref), d = s.data() || {};
                const inv = d.inventory || [];
                if (inv.includes(id)) throw new Error('already');
                if (d.unlimited) tx.update(ref, { inventory: [...inv, id] });
                else if (candy) {
                    const k = Number(d.candies) || 0;
                    if (k < cp) throw new Error('candies');
                    tx.update(ref, { candies: k - cp, inventory: [...inv, id] });
                } else {
                    const c = Number(d.coins) || 0;
                    if (c < it.price) throw new Error('coins');
                    tx.update(ref, { coins: c - it.price, inventory: [...inv, id] });
                }
            });
            const slot = it.type;
            await ref.update({ equipped: { ...eq(), [slot]: id, ...(AWARD_RANK[me.id] && ['frame', 'effect', 'banner'].includes(slot) ? { aoff: { ...(eq().aoff || {}), [slot]: true } } : {}) } }).catch(() => {});
            burst();
            toast(`«${it.name}» куплено и надето!`, 'success');
        } catch (err) {
            toast(err.message === 'coins' ? 'Не хватает монет' : err.message === 'candies' ? 'Не хватает конфет' : err.message === 'already' ? 'Уже куплено' : 'Не удалось купить: ' + (err.code || err.message), 'error');
        }
        btn.disabled = false; buyBusy = false;
    }

    // =====================================================================
    // 🍬 ОБМЕННИК: открывается по клику на баланс. 1 конфета = 200 монет в обе стороны
    // =====================================================================
    let xDir = 'buy', xBusy = false;
    function ensureExchange() {
        let ov = $('xchg'); if (ov) return ov;
        ov = document.createElement('div'); ov.id = 'xchg'; ov.className = 'xchg-ov';
        ov.innerHTML = `<div class="xchg-card" role="dialog" aria-label="Обменник">
            <button class="xchg-x" data-xchg-close aria-label="Закрыть">✕</button>
            <h3>🍬 Обменник <span>временное событие</span></h3>
            <p class="xchg-sub" id="xc-sub"></p>
            <div class="xchg-bal"><div><span class="coin"></span><b id="xc-coins">0</b><small>монет</small></div><div class="xchg-arrow">⇄</div><div><i>🍬</i><b id="xc-candies">0</b><small>конфет</small></div></div>
            <div class="xchg-tabs"><button data-xdir="buy" class="on">Монеты → Конфеты</button><button data-xdir="sell">Конфеты → Монеты</button></div>
            <div class="xchg-row"><button data-xstep="-1">−</button><input id="xc-n" type="number" min="1" step="1" value="1" inputmode="numeric"><button data-xstep="1">+</button><button data-xmax>Макс</button></div>
            <div class="xchg-calc" id="xc-calc"></div>
            <div class="xchg-btns"><button class="btn" id="xc-go">Обменять</button><button class="btn btn-ghost" data-xchg-shop>🛍 В магазин</button></div>
        </div>`;
        document.body.appendChild(ov);
        ov.addEventListener('click', ev => {
            const t = ev.target;
            if (t === ov || t.closest('[data-xchg-close]')) return ov.classList.remove('on');
            if (t.closest('[data-xchg-shop]')) { ov.classList.remove('on'); return showPage('shop'); }
            let el;
            if ((el = t.closest('[data-xdir]'))) { xDir = el.dataset.xdir; return renderExchange(); }
            if ((el = t.closest('[data-xstep]'))) { $('xc-n').value = Math.max(1, (parseInt($('xc-n').value, 10) || 1) + Number(el.dataset.xstep)); return renderExchange(); }
            if (t.closest('[data-xmax]')) { $('xc-n').value = Math.max(1, xMax()); return renderExchange(); }
            if (t.closest('#xc-go')) return doExchange();
        });
        $('xc-n').addEventListener('input', renderExchange);
        document.addEventListener('keydown', ev => { if (ev.key === 'Escape') ov.classList.remove('on'); });
        return ov;
    }
    const xMax = () => xDir === 'buy' ? Math.floor(coinsOf(me) / COINS_PER_CANDY) : candiesOf(me);
    function xCount() { return Math.max(0, Math.floor(Number($('xc-n').value)) || 0); }
    function renderExchange() {
        if (!$('xchg') || !me) return;
        const over = eventOver(), n = xCount(), max = xMax();
        $('xc-coins').textContent = coinsText(me); $('xc-candies').textContent = candiesText(me);
        $('xc-sub').innerHTML = over ? '⏳ <b>Временное событие завершено.</b> Обмен закрыт, конфеты больше не тратятся.' : '1 конфета = <b>200 монет</b> и наоборот · работает до 7 ноября';
        document.querySelectorAll('#xchg [data-xdir]').forEach(b => b.classList.toggle('on', b.dataset.xdir === xDir));
        const cost = n * COINS_PER_CANDY;
        $('xc-calc').innerHTML = xDir === 'buy'
            ? `Отдаёшь <b>${cost.toLocaleString('ru')}</b> <span class="coin"></span> → получаешь <b>${n}</b> 🍬`
            : `Отдаёшь <b>${n}</b> 🍬 → получаешь <b>${cost.toLocaleString('ru')}</b> <span class="coin"></span>`;
        const go = $('xc-go');
        go.disabled = over || !!me.unlimited || n < 1 || n > max;
        go.textContent = over ? 'Событие завершено' : me.unlimited ? 'Безлимит: обмен не нужен' : n > max ? (xDir === 'buy' ? 'Не хватает монет' : 'Не хватает конфет') : 'Обменять';
    }
    function openExchange() {
        if (!me) return showPage('profile');
        ensureExchange().classList.add('on'); $('xc-n').value = 1; renderExchange();
    }
    async function doExchange() {
        const n = xCount(); if (xBusy || eventOver() || me.unlimited || n < 1) return;
        xBusy = true; $('xc-go').disabled = true;
        const ref = db.collection('players').doc(me.id), buy = xDir === 'buy';
        try {
            await db.runTransaction(async tx => {
                const d = (await tx.get(ref)).data() || {}, c = Number(d.coins) || 0, k = Number(d.candies) || 0;
                if (buy) { if (c < n * COINS_PER_CANDY) throw new Error('coins'); tx.update(ref, { coins: c - n * COINS_PER_CANDY, candies: k + n }); }
                else { if (k < n) throw new Error('candies'); tx.update(ref, { coins: c + n * COINS_PER_CANDY, candies: k - n }); }
            });
            toast(buy ? `Обменяно: +${n} 🍬` : `Обменяно: +${(n * COINS_PER_CANDY).toLocaleString('ru')} монет`, 'success');
        } catch (err) {
            toast(err.message === 'coins' ? 'Не хватает монет' : err.message === 'candies' ? 'Не хватает конфет' : 'Не удалось обменять: ' + (err.code || err.message), 'error');
        }
        xBusy = false; renderExchange();
    }
    async function equip(id, on) {
        const it = ITEM_BY_ID.get(id); if (!me || !it) return;
        const slot = it.type;
        const next = { ...eq() };
        const off = { ...(next.aoff || {}) };
        if (it.award) {
            // награда ТОП: «снять» = носить свои купленные вещи, «надеть» = вернуть награду
            if (on) delete off[slot]; else off[slot] = true;
        } else if (on) { next[slot] = id; if (me && AWARD_RANK[me.id]) off[slot] = true; }   // своя вещь вместо награды
        else delete next[slot];
        if (Object.keys(off).length) next.aoff = off; else delete next.aoff;
        try { await db.collection('players').doc(me.id).update({ equipped: next }); toast(on ? 'Надето' : 'Снято', 'success'); }
        catch (err) { toast('Ошибка: ' + (err.code || err.message), 'error'); }
    }
    // конфетти из монет
    function burst() {
        if (reduce) return;
        for (let i = 0; i < 26; i++) {
            const c = document.createElement('div');
            const a = Math.random() * 6.283, v = 120 + Math.random() * 220;
            c.textContent = ['🪙', '✨', '⭐'][i % 3];
            c.style.cssText = `position:fixed;left:50%;top:45%;z-index:100010;pointer-events:none;font-size:${16 + Math.random() * 14}px;transition:transform 1.3s cubic-bezier(.1,.7,.3,1),opacity 1.3s;`;
            document.body.appendChild(c);
            requestAnimationFrame(() => { c.style.transform = `translate(${Math.cos(a) * v}px,${Math.sin(a) * v + 120}px) rotate(${Math.random() * 540}deg)`; c.style.opacity = '0'; });
            setTimeout(() => c.remove(), 1400);
        }
    }

    // =====================================================================
    // 4. СТРИМЕРЫ: карточки с YouTube
    // =====================================================================
    const ytIcon = '<i>▶</i>';
    function subsText(n) {
        n = Number(n) || 0; if (!n) return '';
        if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' млн подписчиков';
        if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + ' тыс. подписчиков';
        return n + ' подписчиков';
    }
    // ---- автоопределение эфира: YouTube (по ключу API) и открытый кабинет стримера (heartbeat) ----
    const YT = { live: new Map(), ts: 0, busy: false, key: undefined, ch: {} };
    const beatFresh = s => Date.now() - (Number(s.lastBeat) || 0) < 3 * 60e3;
    const liveNow = s => !!s.isLive || YT.live.has(s.name) || beatFresh(s);
    async function ytKey() {
        if (typeof YT_API_KEY === 'string' && YT_API_KEY) return YT_API_KEY;
        if (YT.key === undefined) {
            try { YT.key = String(((await db.collection('site_content').doc('media').get()).data() || {}).ytKey || '').trim(); }
            catch (e) { YT.key = ''; }
        }
        return YT.key;
    }
    async function ytCheck(list) {
        if (YT.busy || Date.now() - YT.ts < 150e3) return;
        const jobs = (list || []).filter(s => s.ytUrl);
        if (!jobs.length) return;
        try { const c = JSON.parse(localStorage.getItem('yt_live_v1') || 'null'); if (c && Date.now() - c.ts < 150e3) { YT.live = new Map(c.live); YT.ts = c.ts; return; } } catch (e) {}
        const key = await ytKey(); if (!key) return;
        YT.busy = true; YT.ts = Date.now();
        const api = (p, q) => fetch('https://www.googleapis.com/youtube/v3/' + p + '&key=' + key + '&' + (q || '')).then(r => r.json());
        try {
            const ids = [], owner = new Map();
            await Promise.all(jobs.map(async s => {
                let ch = s.ytChannelId || YT.ch[s.name];
                if (!ch) {
                    const y = ytParse(s.ytUrl); if (!y) return;
                    const q = y.kind === 'handle' ? 'forHandle=' + encodeURIComponent(y.handle) : y.kind === 'channel' ? 'id=' + encodeURIComponent(y.handle) : 'forUsername=' + encodeURIComponent(y.handle);
                    const j = await api('channels?part=id', q); ch = j.items && j.items[0] && j.items[0].id;
                    if (!ch) return; YT.ch[s.name] = ch;
                }
                const j = await api('playlistItems?part=contentDetails&maxResults=5&playlistId=UU' + ch.slice(2));      // живая трансляция лежит среди последних видео канала
                (j.items || []).forEach(i => { const v = i.contentDetails && i.contentDetails.videoId; if (v) { ids.push(v); owner.set(v, s.name); } });
            }));
            const live = new Map();
            for (let i = 0; i < ids.length; i += 50) {
                const j = await api('videos?part=snippet&id=' + ids.slice(i, i + 50).join(','));
                (j.items || []).forEach(v => { if (v.snippet && v.snippet.liveBroadcastContent === 'live' && !live.has(owner.get(v.id))) live.set(owner.get(v.id), v.id); });
            }
            const changed = JSON.stringify([...live]) !== JSON.stringify([...YT.live]);
            YT.live = live;
            try { localStorage.setItem('yt_live_v1', JSON.stringify({ ts: YT.ts, live: [...live] })); } catch (e) {}
            if (changed && typeof renderStreamers === 'function') renderStreamers();
        } catch (e) { /* нет сети или квота — остаёмся на данных кабинета */ }
        YT.busy = false;
    }
    setInterval(() => { if (typeof streamersList !== 'undefined') ytCheck(streamersList); if (typeof renderStreamers === 'function') renderStreamers(); }, 150e3);

    function streamerCard(s, canEnd) {
        const yt = ytParse(s.ytUrl);
        const live = liveNow(s);
        const ytVid = YT.live.get(s.name);
        const name = s.ytTitle || s.name;
        const av = s.ytAvatar || s.avatar;
        const letter = esc(String(name || '?').trim().charAt(0).toUpperCase());
        const avHtml = `<span class="sc-av">${av ? `<img src="${esc(av)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="ph">${letter}</span>`}</span>`;
        const sub = yt ? `<span class="sc-yt">${ytIcon} ${esc(s.ytTitle ? (subsText(s.ytSubs) || 'YouTube-канал') : (yt.handle.startsWith('@') ? yt.handle : 'YouTube-канал'))}</span>` : '<span class="sc-yt">Канал пока не добавлен</span>';
        const badge = live ? '<span class="sc-badge">В ЭФИРЕ</span>' : '<span class="sc-badge">ОФФЛАЙН</span>';
        const go = yt ? `<span class="go">${live ? '▶ Смотреть трансляцию' : '↗ Открыть канал'}</span>` : '';
        const inner = `${avHtml}<span class="sc-info"><span class="sc-name">${esc(s.name)}${s.ytTitle && s.ytTitle !== s.name ? '' : ''}</span>${sub}${badge}</span>${go}`;
        const card = yt
            ? `<a class="sc-card ${live ? 'live' : 'off'}" href="${esc(live ? (ytVid ? 'https://www.youtube.com/watch?v=' + ytVid : yt.live) : yt.base)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(s.name)} — ${live ? 'смотреть стрим' : 'открыть канал'}">${inner}</a>`
            : `<div class="sc-card ${live ? 'live' : 'off'}">${inner}</div>`;
        const vk = s.vkUrl ? `<a class="sc-vk" href="${esc(s.vkUrl)}" target="_blank" rel="noopener noreferrer" title="VK профиль ${esc(s.name)}">VK</a>` : '';
        return `<div class="sc-item">${card}${vk}${canEnd ? `<button class="btn btn-red btn-sm sc-end" data-endlive="${esc(s.name)}">⏹ Завершить</button>` : ''}</div>`;
    }
    window.xRenderStreamers = function (list, user, admin) {
        const box = $('streamers-list');
        ytCheck(list);
        const liveN = list.filter(liveNow).length;
        document.querySelectorAll('.nav-btn[data-page="streamers"], .mobile-menu [data-page="streamers"]').forEach(b => b.classList.toggle('has-live', liveN > 0));
        const bn = document.querySelector('.bottom-nav [data-page="streamers"]'); if (bn) bn.classList.toggle('has-live', liveN > 0);
        const cnt = $('streamers-count');
        if (cnt) { cnt.className = 'sc-count' + (liveN ? ' live' : ''); cnt.textContent = liveN ? `🔴 В эфире сейчас: ${liveN}` : 'Сейчас все оффлайн'; }

        if (!list.length) { box.innerHTML = '<p class="empty">Стримеры ещё не добавлены.</p>'; }
        else {
            const sorted = [...list].sort((a, b) => (liveNow(b) ? 1 : 0) - (liveNow(a) ? 1 : 0) || String(a.name).localeCompare(String(b.name), 'ru'));
            box.innerHTML = `<div class="sc-list">${sorted.map(s => streamerCard(s, s.isLive && ((user && s.playerUid === user.uid) || admin))).join('')}</div>`;
        }
        // полоска «Сейчас в эфире» на главной
        const strip = $('live-strip');
        if (strip) {
            const live = list.filter(liveNow);
            strip.classList.toggle('on', live.length > 0);
            $('live-strip-list').innerHTML = live.length ? `<div class="sc-list">${live.map(s => streamerCard(s, false)).join('')}</div>` : '';
        }
    };
    if (typeof renderStreamers === 'function') renderStreamers();

    // =====================================================================
    // 5. ПРАВИЛА (редактирует админ в админ-панели)
    // =====================================================================
    const DEFAULT_RULES = [
        { icon: '🤝', title: 'Играем честно', text: 'Никаких читов, багов и договорных матчей. Нарушение — бан.' },
        { icon: '📣', title: 'Уважение к соперникам', text: 'Без оскорблений, угроз и токсичности в чатах, комментариях и на стримах.' },
        { icon: '🎬', title: 'Решение стримера', text: 'Результат матча фиксирует стример. Его решение окончательное, спорные моменты разбирает администратор.' }
    ];
    function fmtRuleText(t) {
        const lines = String(t || '').split('\n');
        let html = '', list = [];
        const flush = () => { if (list.length) { html += '<ul>' + list.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>'; list = []; } };
        lines.forEach(l => {
            const m = l.match(/^\s*[-•*]\s+(.*)$/);
            if (m) list.push(m[1]); else { flush(); if (l.trim()) html += `<p>${esc(l)}</p>`; }
        });
        flush(); return html;
    }
    function renderRules(data) {
        const box = $('rules-body'); if (!box) return;
        const blocks = (data && Array.isArray(data.blocks) && data.blocks.length) ? data.blocks : DEFAULT_RULES;
        box.innerHTML = blocks.map(b => `<article class="rule"><div class="ri">${esc(b.icon || '📌')}</div><div><h4>${esc(b.title || '')}</h4>${fmtRuleText(b.text)}</div></article>`).join('');
        const meta = $('rules-meta');
        if (meta) meta.textContent = data && data.updatedAt ? 'Обновлено: ' + new Date(data.updatedAt).toLocaleString('ru', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    }
    renderRules(null);
    db.collection('site_content').doc('rules').onSnapshot(s => renderRules(s.exists ? s.data() : null), () => renderRules(null));

    // =====================================================================
    // 6. ПРЕДПРОСМОТР ФАЙЛОВ ПЕРЕД ЗАГРУЗКОЙ
    // =====================================================================
    function bindPreview(inputId, boxId, max) {
        const inp = $(inputId), box = $(boxId); if (!inp || !box) return;
        let files = [];
        const sync = () => {
            const dt = new DataTransfer(); files.forEach(f => dt.items.add(f)); inp.files = dt.files;
            box.querySelectorAll('[data-url]').forEach(n => URL.revokeObjectURL(n.dataset.url));
            box.innerHTML = files.map((f, i) => {
                const u = URL.createObjectURL(f), v = f.type.startsWith('video/');
                return `<div class="up-th"><${v ? 'video' : 'img'} src="${u}" data-url="${u}" ${v ? 'muted playsinline preload="metadata"' : 'alt=""'}></${v ? 'video' : 'img'}><span class="k">${v ? '🎬 видео' : '📷 фото'}</span><button type="button" class="x" data-rm-file="${i}" aria-label="Убрать">✕</button></div>`;
            }).join('');
        };
        inp.addEventListener('change', () => {
            const add = [...inp.files].filter(f => /^(image|video)\//.test(f.type));
            files = [...files, ...add].slice(0, max); sync();
        });
        box.addEventListener('click', e => { const b = e.target.closest('[data-rm-file]'); if (b) { files.splice(Number(b.dataset.rmFile), 1); sync(); } });
        inp._reset = () => { files = []; sync(); };
        const dz = inp.closest('.dropzone');
        if (dz) {
            ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
            ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, () => dz.classList.remove('over')));
        }
    }
    bindPreview('up-file', 'up-preview', 6);
    bindPreview('complaint-files', 'complaint-file-list', 4);

    // =====================================================================
    // 7. ПОДДЕРЖКА И ГРУППЫ (ссылки задаёт админ)
    // =====================================================================
    let LINKS = null;
    const linkLabel = u => { try { const x = new URL(u); return decodeURIComponent(x.pathname.replace(/\/$/, '').split('/').pop() || x.hostname); } catch (e) { return u; } };
    function renderSupport() {
        const sup = $('support-box'), grp = $('groups-box'); if (!sup || !grp) return;
        const s1 = safeLink(LINKS && LINKS.support, 'vk') || 'https://vk.com/dilenow';
        sup.innerHTML = `<p class="muted" style="margin-bottom:12px">Не загружается видео, пропали монеты, нужен разбан или другая проблема с сайтом? Напиши технической поддержке администрации — отвечаем в VK.</p>
            <a class="btn" href="${esc(s1)}" target="_blank" rel="noopener noreferrer">💬 Тех-поддержка VK · @${esc(linkLabel(s1))}</a>`;
        const vk = ((LINKS && LINKS.vk) || []).map(x => safeLink(x, 'vk')).filter(Boolean);
        const wa = ((LINKS && LINKS.wa) || []).map(x => safeLink(x, 'wa')).filter(Boolean);
        const row = (u, ico, name, cls) => `<a class="btn ${cls}" href="${esc(u)}" target="_blank" rel="noopener noreferrer" style="margin:0 8px 8px 0">${ico} ${name}</a>`;
        grp.innerHTML = (vk.length || wa.length)
            ? (vk.length ? `<p class="muted">VK</p><div>${vk.map((u, i) => row(u, '🔵', 'Группа VK' + (vk.length > 1 ? ' ' + (i + 1) : ''), '')).join('')}</div>` : '')
              + (wa.length ? `<p class="muted">WhatsApp</p><div>${wa.map((u, i) => row(u, '🟢', 'Группа WhatsApp' + (wa.length > 1 ? ' ' + (i + 1) : ''), 'btn-green')).join('')}</div>` : '')
            : '<p class="empty">Ссылки на группы пока не добавлены.</p>';
    }
    db.collection('site_content').doc('links').onSnapshot(sn => { LINKS = sn.exists ? sn.data() : null; renderSupport(); }, () => renderSupport());
    renderSupport();

    // кнопка «Админ-панель» в меню (в т.ч. на телефоне): админ входит в панель отдельно, его сессия не мешает профилю
    try {
        const admApp = firebase.apps.find(x => x.name === 'admin') || firebase.initializeApp(firebaseConfig, 'admin');
        admApp.auth().onAuthStateChanged(u => {
            const ok = isAdminUser(u);
            document.querySelectorAll('.admin-link').forEach(n => n.remove());
            const re = $('rules-edit'); if (re) re.style.display = ok ? 'inline-flex' : 'none';
            if (!ok) return;
            [$('mobile-menu'), document.querySelector('.desktop-nav')].forEach(box => {
                if (!box) return;
                const bt = document.createElement('button'); bt.className = 'nav-btn admin-link'; bt.textContent = '🔥 Админ-панель';
                bt.addEventListener('click', () => { location.href = 'admin.html'; }); box.appendChild(bt);
            });
        });
    } catch (err) { console.error(err); }

    // =====================================================================
    initBackground();
    updateCoins();
    renderShop();
})();
