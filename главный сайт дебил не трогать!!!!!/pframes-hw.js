// 🎃 ХЭЛЛОУИН: рамки окна профиля (временное событие до 7 ноября). Подключается после pframes-elite.js, до pframes.js.
// Цены берутся из категорий: pa=1500 pb=2500 pc=3500. pe_hw_dracula — ТОЛЬКО для безлимитного баланса (админ), без цены.
// Товары можно купить и за монеты, и за конфеты (кроме pe_). После 7 ноября купить нельзя, купленное остаётся.

// ---------- SVG-заготовки ----------
const hwPump = (x, y, s, dl = 0) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="an bob" style="animation-delay:${dl}s">
    <ellipse cx="0" cy="4" rx="40" ry="34" fill="rgba(255,140,30,.22)"/>
    <ellipse cx="-14" cy="0" rx="20" ry="24" fill="#c24a08"/><ellipse cx="14" cy="0" rx="20" ry="24" fill="#c24a08"/>
    <ellipse cx="0" cy="0" rx="22" ry="26" fill="#ff7a1a"/><ellipse cx="0" cy="0" rx="8" ry="26" fill="#ffa24a" opacity=".7"/>
    <rect x="-4" y="-35" width="8" height="12" rx="3" fill="#4d8f2a"/>
    <g class="an pu"><path d="M-17 -4L-7 -4L-12 -14Z M7 -4L17 -4L12 -14Z" fill="#ffe36b"/><path d="M-15 8Q0 22 15 8L10 15L4 8L0 16L-4 8L-10 15Z" fill="#ffe36b"/></g></g></g>`;
const hwBat = (x, y, s, dl = 0, fill = '#1b0b2a', st = '#9b5de5') => `<g transform="translate(${x} ${y}) scale(${s})"><g class="an bob" style="animation-delay:${dl}s;--t:1.1s">
    <path d="M0 0C-6 -10 -18 -14 -32 -6C-25 -4 -22 2 -16 5C-12 0 -6 2 0 9C6 2 12 0 16 5C22 2 25 -4 32 -6C18 -14 6 -10 0 0Z" fill="${fill}" stroke="${st}" stroke-width="1.6"/>
    <circle cx="-3" cy="-1" r="1.5" fill="#ff3d5c"/><circle cx="3" cy="-1" r="1.5" fill="#ff3d5c"/></g></g>`;
const hwGhost = (x, y, s, dl = 0) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="an bob" style="animation-delay:${dl}s;--t:3.4s">
    <path d="M-15 20V-4C-15 -26 15 -26 15 -4V20L10 14L5 20L0 14L-5 20L-10 14Z" fill="#f2f6ff" fill-opacity=".92" stroke="#bcd0ff" stroke-width="1.4"/>
    <ellipse cx="-5" cy="-5" rx="2.6" ry="4" fill="#12142a"/><ellipse cx="5" cy="-5" rx="2.6" ry="4" fill="#12142a"/><ellipse cx="0" cy="6" rx="3" ry="4" fill="#12142a"/></g></g>`;
const hwWeb = (s = 1) => `<g transform="scale(${s})" fill="none" stroke="#e8e0ff" stroke-width="1.3" stroke-linecap="round" opacity=".85"><path d="M0 0L120 0M0 0L112 44M0 0L90 90M0 0L44 112M0 0L0 120"/><path d="M24 0Q20 18 0 24M48 0Q40 36 0 48M72 0Q60 56 0 72M96 0Q80 76 0 96"/></g>`;
const hwSpider = (x, y, len, dl = 0) => `<g transform="translate(${x} ${y})"><g class="an sw" style="animation-delay:${dl}s;transform-origin:0 0"><line x1="0" y1="0" x2="0" y2="${len}" stroke="#e8e0ff" stroke-width="1.2"/>
    <g transform="translate(0 ${len})"><ellipse cx="0" cy="0" rx="7" ry="6" fill="#1a1a22"/><circle cx="0" cy="-7" r="4" fill="#1a1a22"/><circle cx="-1.8" cy="-8" r="1" fill="#ff3d5c"/><circle cx="1.8" cy="-8" r="1" fill="#ff3d5c"/>
    <path d="M-6 -2L-15 -8M-6 1L-16 2M-6 4L-14 11M6 -2L15 -8M6 1L16 2M6 4L14 11" stroke="#1a1a22" stroke-width="1.5" fill="none"/></g></g></g>`;
const hwGrave = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 30V-4Q-14 -22 0 -22Q14 -22 14 -4V30Z" fill="#59606e" stroke="#9aa4b8" stroke-width="1.6"/><path d="M0 -12V6M-6 -5H6" stroke="#cfd6e6" stroke-width="2.2" stroke-linecap="round"/></g>`;
const hwEye = (x, y, s, dl = 0, c = '#9dff3d') => `<g transform="translate(${x} ${y}) scale(${s})"><g class="an pu" style="animation-delay:${dl}s"><ellipse cx="0" cy="0" rx="13" ry="9" fill="#10051a" stroke="${c}" stroke-width="1.6"/><circle cx="0" cy="0" r="5.5" fill="${c}"/><ellipse cx="0" cy="0" rx="1.8" ry="5.5" fill="#06020a"/></g></g>`;
const hwDrip = (x, len, dl) => `<path class="an bob" style="animation-delay:${dl}s;--t:2.4s" d="M${x - 5} 0Q${x - 5} ${len} ${x} ${len + 6}Q${x + 5} ${len} ${x + 5} 0Z" fill="#b3122e"/>`;
const hwMoon = (x, y, r, c1 = '#fff0d0', c2 = '#ffb347') => `<g transform="translate(${x} ${y})"><circle r="${r * 1.5}" fill="${c2}" opacity=".16"/><circle r="${r}" fill="${c1}"/><circle cx="${-r * .3}" cy="${-r * .15}" r="${r * .2}" fill="${c2}" opacity=".35"/><circle cx="${r * .35}" cy="${r * .3}" r="${r * .14}" fill="${c2}" opacity=".35"/></g>`;

// ======================= A · ОБЫЧНЫЕ (1500) — без анимации =======================
pfAdd('A', 'hw_pumpkin', 'Тыквенный контур', '🎃 Хэллоуин · оранжевая линия и тыквы в углах', { ring: 'linear-gradient(135deg,#ffd9a0,#ff7a00 45%,#7a2e00)', w: 4, r: [22], sp: 0, gl: '#ff7a1f', go: .35,
    css: `&{outline:1px solid rgba(255,140,30,.35);outline-offset:-8px}`,
    deco: () => pfSvg('tl', 70, 70, hwPump(35, 38, .8), { dx: -18, dy: -18 }) + pfSvg('br', 70, 70, hwPump(35, 38, .8), { dx: -18, dy: -18 }) });
pfAdd('A', 'hw_bone', 'Костяная', '🎃 Хэллоуин · кости по кромке и череп сверху', { ring: 'repeating-linear-gradient(90deg,#f4efe2 0 10px,#cfc6ad 10px 14px)', w: 5, r: [14], sp: 0, gl: '#e9e1c8', go: .3,
    deco: () => pfSvg('tc', 60, 56, `<ellipse cx="30" cy="24" rx="20" ry="18" fill="#f4efe2" stroke="#8a826c" stroke-width="1.6"/><rect x="21" y="36" width="18" height="12" rx="3" fill="#f4efe2" stroke="#8a826c" stroke-width="1.6"/><ellipse cx="22" cy="24" rx="5" ry="6" fill="#14101c"/><ellipse cx="38" cy="24" rx="5" ry="6" fill="#14101c"/><path d="M30 30L27 36H33Z" fill="#14101c"/>`, { dy: -30 }) });

// ======================= B · АНИМИРОВАННЫЕ (2500) =======================
pfAdd('B', 'hw_ghost', 'Призрачный свет', '🎃 Хэллоуин · привидения парят у кромки', { ring: 'conic-gradient(from var(--a),#ffffff,#9db4ff,#4a5bd0,#d9e4ff,#ffffff)', w: 3, r: [24], sp: 8, gl: '#b8c8ff', go: .8,
    css: `&::after{animation:pfPulse 3.2s ease-in-out infinite}`,
    fx: [{ k: 'rise', n: 12, c: ['#e8f0ff', '#b8c8ff'], sd: 'b', s: [2, 4], d: [3, 6] }, { k: 'tw', n: 10, c: ['#fff', '#cfe0ff'], sd: 'all', s: [1.6, 3], d: [2, 4] }],
    deco: () => pfSvg('tl', 80, 80, hwGhost(40, 42, 1.2), { dx: -26, dy: -30 }) + pfSvg('br', 80, 80, hwGhost(40, 42, 1, 1.2), { dx: -26, dy: -26 }) + pfSvg('tr', 60, 60, hwGhost(30, 32, .7, .6), { dx: -14, dy: -16 }) });
pfAdd('B', 'hw_bats', 'Летучая стая', '🎃 Хэллоуин · мыши порхают по краю окна', { ring: 'conic-gradient(from var(--a),#7a3fe0,#12031e,#c084fc,#12031e,#7a3fe0)', w: 3, r: [20], sp: 6, gl: '#9b5de5', go: .8,
    fx: [{ k: 'tw', n: 10, c: ['#c084fc', '#ff9a3d'], sd: 'all', s: [1.6, 3.2], d: [2, 4] }],
    deco: () => pfStrip('top', 600, 90, hwBat(60, 50, 1.3) + hwBat(170, 30, .9, .3) + hwBat(300, 56, 1.1, .6) + hwBat(430, 28, .8, .15) + hwBat(540, 50, 1.2, .45), { dy: -34, dx: -10 })
        + pfSvg('bl', 80, 60, hwBat(40, 30, 1.1, .2), { dx: -18, dy: -20 }) + pfSvg('br', 80, 60, hwBat(40, 30, 1.1, .7), { dx: -18, dy: -20 }) });
pfAdd('B', 'hw_witch', 'Ведьмин огонь', '🎃 Хэллоуин · зелёное пламя из котла', { ring: 'linear-gradient(0deg,#d4ff3a,#2ee59d 40%,#1a0a2e 90%)', w: 3, r: [16], sp: 0, gl: '#7bff5c', go: .8,
    css: `&::before{animation:pfFlicker 1.2s ease-in-out infinite}`,
    fx: [{ k: 'rise', n: 14, c: ['#d4ff3a', '#7bff5c', '#b78cff'], sd: 'b', s: [2, 4.5], d: [1.8, 3.6] }],
    deco: () => { let t = ''; for (let i = 0; i < 12; i++) t += pfFlameTongue(25 + i * 50, 34, 30 + (i % 3) * 14, 60, i % 2 ? '#7bff5c' : '#c6ff4a', i * .13); return pfStrip('bottom', 600, 64, t, { dy: -22, dx: -6 }); } });

// ======================= C · ЭКСКЛЮЗИВНЫЕ (3500) =======================
pfAdd('C', 'hw_vampire', 'Вампирский бал', '🎃 Хэллоуин · кровь стекает с кромки, мыши и алая луна', { ring: 'linear-gradient(135deg,#ffb3c1,#e11d48 40%,#2a0008)', w: 4, r: [18], sp: 0, gl: '#ff3d5c', go: .7,
    css: `&::after{animation:pfPulse 3s ease-in-out infinite}`,
    fx: [{ k: 'rise', n: 8, c: ['#ff3d5c', '#b3122e'], sd: 'b', s: [2, 4], d: [2, 4] }, { k: 'tw', n: 8, c: ['#fff', '#ffb3c1'], sd: 'all', s: [1.6, 3], d: [2, 4] }],
    deco: () => { let d = ''; [30, 110, 190, 250, 330, 410, 480, 560].forEach((x, i) => { d += hwDrip(x, 18 + (i * 7) % 24, i * .3); }); return pfStrip('top', 600, 64, d, { dy: -6, dx: -4 })
        + pfSvg('tr', 90, 90, hwMoon(48, 46, 22, '#ffd0d6', '#ff3d5c'), { dx: -22, dy: -30 }) + pfSvg('tl', 80, 60, hwBat(40, 30, 1.3) + hwBat(16, 46, .7, .4), { dx: -26, dy: -24 }) + pfSvg('bl', 70, 50, hwBat(35, 25, 1, .8), { dx: -16, dy: -18 }); } });
pfAdd('C', 'hw_graveyard', 'Кладбище', '🎃 Хэллоуин · могилы, привидения и туман снизу', { ring: 'linear-gradient(135deg,#d6fff1,#3a6a5a 45%,#0a1412)', w: 3, r: [14], sp: 0, gl: '#7af0c0', go: .55,
    fx: [{ k: 'rise', n: 12, c: ['#cfe8e0', '#7af0c0'], sd: 'b', s: [3, 6], d: [4, 7], dx: 20 }],
    inner: `<i style="left:-10%;bottom:-24px;width:120%;height:90px;background:radial-gradient(ellipse at 50% 100%,rgba(160,240,210,.4),transparent 70%);animation:pfDrift 7s ease-in-out infinite alternate"></i>`,
    deco: () => pfSvg('bl', 120, 80, hwGrave(30, 44, 1) + hwGrave(78, 56, .8) + hwGhost(100, 20, .7, .5), { dx: -12, dy: -18 }) + pfSvg('br', 120, 80, hwGrave(90, 44, 1) + hwGrave(42, 56, .8) + hwGhost(20, 20, .7, 1), { dx: -12, dy: -18 }) });
pfAdd('C', 'hw_monsters', 'Монстры из тьмы', '🎃 Хэллоуин · глаза монстров следят из углов', { ring: 'conic-gradient(from var(--a),#9dff3d,#6a1fa8,#ff3d8b,#1a0a2e,#9dff3d)', w: 4, r: [26], sp: 7, gl: '#9dff3d', go: .75,
    fx: [{ k: 'tw', n: 12, c: ['#9dff3d', '#ff3d8b', '#c084fc'], sd: 'all', s: [1.8, 3.6], d: [1.6, 3.6] }],
    deco: () => pfSvg('tl', 110, 70, hwEye(30, 28, 1.2) + hwEye(66, 40, .8, .5, '#ff3d8b'), { dx: -22, dy: -22 }) + pfSvg('tr', 110, 70, hwEye(80, 28, 1.2, .3, '#ff3d8b') + hwEye(44, 42, .8, .8), { dx: -22, dy: -22 })
        + pfSvg('bl', 90, 60, hwEye(36, 30, 1, .6, '#c084fc'), { dx: -16, dy: -16 }) + pfSvg('br', 90, 60, hwEye(54, 30, 1, .2), { dx: -16, dy: -16 }) });
pfAdd('C', 'hw_webs', 'Паучья сеть', '🎃 Хэллоуин · паутина в углах, пауки на нитях', { ring: 'linear-gradient(135deg,#ffffff,#9aa4c4 45%,#1a1a2a)', w: 3, r: [10], sp: 0, gl: '#ff6a00', go: .45,
    deco: () => pfSvg('tl', 130, 130, hwWeb(1.05), { dx: -4, dy: -4 }) + pfSvg('tr', 130, 130, `<g transform="translate(130 0) scale(-1 1)">${hwWeb(1.05)}</g>`, { dx: -4, dy: -4 })
        + pfSvg('tc', 120, 110, hwSpider(40, 0, 56) + hwSpider(84, 0, 34, .6), { dy: -4 }) });

// ======================= E · ADMIN DRACULA (только безлимитный баланс, проверка на сервере) =======================
(function () {
    // огромное перепончатое крыло летучей мыши с косточками; корень в (0,0), крыло тянется вправо
    const wingPath = 'M0 0C28 -78 118 -102 178 -56C160 -42 154 -22 138 -6C122 -20 104 -14 92 4C74 -10 54 -2 42 16C28 4 12 10 0 26Z';
    const bones = '<path d="M0 0L176 -56M0 0L136 -8M0 0L90 2M0 0L40 16" stroke="#ff4d6d" stroke-width="2.2" stroke-linecap="round" fill="none"/>';
    const bat = (sd, delay, scale, c1, c2) => `<g transform="translate(180 120) scale(${sd * scale} ${scale})"><g class="an flap" style="animation-delay:${delay}s"><path d="${wingPath}" fill="${c1}" fill-opacity=".86" stroke="${c2}" stroke-width="2"/>${bones}</g></g>`;
    const face = `<g transform="translate(110 78)">
        <path d="M-70 78L-50 28L-24 52L0 62L24 52L50 28L70 78Z" fill="#7a0a24" stroke="#ff4d6d" stroke-width="2"/>
        <path d="M-46 78L-30 40L-10 58L0 64L10 58L30 40L46 78Z" fill="#1a0008"/>
        <ellipse cx="0" cy="12" rx="30" ry="36" fill="#eadfe6" stroke="#b9a7b4" stroke-width="1.6"/>
        <path d="M-32 6C-34 -30 -6 -42 0 -22C6 -42 34 -30 32 6C26 -10 14 -16 0 -6C-14 -16 -26 -10 -32 6Z" fill="#0a0410" stroke="#3a2a4a" stroke-width="1.2"/>
        <path d="M-22 6L-8 12M22 6L8 12" stroke="#0a0410" stroke-width="3.2" stroke-linecap="round"/>
        <g class="an pu" style="--t:1.6s"><ellipse cx="-12" cy="14" rx="5" ry="3.8" fill="#ff1744"/><ellipse cx="12" cy="14" rx="5" ry="3.8" fill="#ff1744"/><circle cx="-12" cy="14" r="1.6" fill="#fff"/><circle cx="12" cy="14" r="1.6" fill="#fff"/></g>
        <path d="M0 18L-3 28H3Z" fill="#b9a7b4"/>
        <path d="M-13 36Q0 44 13 36Q0 40 -13 36Z" fill="#7a0a24" stroke="#7a0a24" stroke-width="2"/>
        <path d="M-8 37L-5 48L-2 38Z M2 38L5 48L8 37Z" fill="#fff" stroke="#c9b9c6" stroke-width=".8"/>
        <path class="an bob" style="--t:2s" d="M5 47Q5 54 6.5 56Q8 54 8 47Z" fill="#e11d48"/></g>`;
    pfAdd('E', 'hw_dracula', 'ADMIN DRACULA', 'Граф Дракула с огромными крыльями, алая луна, стая мышей и кровавые волны. Только для безлимитного баланса', { price: 0, needUnlimited: true,
        ring: 'conic-gradient(from var(--a),#ff1744,#2a0008,#ffb3c1,#0b0b10,#ff1744,#7c3aed,#2a0008,#ff1744)', w: 5, r: [20], sp: 4, gl: '#ff1744', go: 1, bl: 16,
        css: `&{outline:2px solid rgba(225,29,72,.85);outline-offset:9px;background:radial-gradient(ellipse at 50% -10%,rgba(255,23,68,.26),transparent 55%),radial-gradient(ellipse at 50% 110%,rgba(124,58,237,.2),transparent 55%),#0a0308}&::after{animation:pfPulse 2.6s ease-in-out infinite}`,
        inner: `<i style="left:-40%;top:-18px;width:180%;height:90px;background:radial-gradient(ellipse at 30% 0,rgba(255,23,68,.6),transparent 60%),radial-gradient(ellipse at 75% 0,rgba(167,100,255,.45),transparent 60%);animation:pfDrift 5s ease-in-out infinite alternate"></i><i style="left:-10%;bottom:-24px;width:120%;height:100px;background:radial-gradient(ellipse at 50% 100%,rgba(255,23,68,.4),transparent 70%);animation:pfFlicker 2.8s ease-in-out infinite"></i>`,
        fx: [{ k: 'rise', n: 16, c: ['#ff1744', '#ff6a8a', '#c084fc', '#fff1a8'], sd: 'lr', s: [2, 4.5], d: [1.6, 3.4], dx: 14 }, { k: 'spark', n: 10, c: ['#ffb3c1', '#ff1744'], sd: 'corners', s: [1.8, 3.2], d: [.8, 1.6] }, { k: 'tw', n: 14, c: ['#fff', '#ffb3c1', '#e9d5ff'], sd: 'all', s: [1.6, 3.4], d: [2, 4.5] }, { k: 'fall', n: 8, c: ['#b3122e', '#e11d48'], sd: 't', s: [2, 3.6], d: [3, 6], dx: 6 }],
        deco: () => {
            let drips = ''; [26, 90, 160, 230, 300, 360].forEach((x, i) => { drips += hwDrip(x, 14 + (i * 9) % 22, i * .35); });
            return `<span class="pf-wave"></span><span class="pf-wave w2"></span><span class="pf-wave w3"></span>`
                + pfSvg('tl', 190, 180, bat(-1, 0, 1, '#2a0a3a', '#e11d48') + bat(-1, .35, .66, '#7a0a24', '#ff6a8a'), { dx: -170, dy: -64 })
                + pfSvg('tr', 190, 180, `<g transform="translate(190 0) scale(-1 1)">${bat(-1, 0, 1, '#2a0a3a', '#e11d48') + bat(-1, .35, .66, '#7a0a24', '#ff6a8a')}</g>`, { dx: -170, dy: -64 })
                + pfSvg('tc', 220, 170, face, { dy: -104 })
                + pfSvg('tl', 90, 70, hwMoon(46, 38, 22, '#ffd0d6', '#ff1744'), { dx: -8, dy: -52 })
                + pfSvg('tr', 110, 70, hwBat(30, 30, 1.2) + hwBat(78, 46, .8, .5) + hwBat(90, 18, .6, .2), { dx: -30, dy: -48 })
                + pfSvg('bl', 100, 60, hwBat(36, 26, 1, .3) + hwBat(70, 40, .7, .7), { dx: -20, dy: -26 })
                + pfSvg('br', 100, 60, hwBat(60, 26, 1, .5) + hwBat(26, 40, .7, .9), { dx: -20, dy: -26 })
                + pfStrip('top', 400, 52, drips, { dy: -2, dx: -2 })
                + `<div class="pf-plate">ADMIN DRACULA</div>`;
        } });
})();

// ---------- регистрируем всё, что добавили (элитный файл уже отработал) ----------
PF_LIST.forEach(it => {
    if (/^p[a-e]_hw_/.test(it.id)) it.hw = true;
    if (!ITEM_BY_ID.has(it.id)) { ITEM_BY_ID.set(it.id, it); SHOP_ITEMS.push(it); }
});
