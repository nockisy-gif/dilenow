// ELO SNS — каталог рамок окна профиля. Слот equipped.pframe. Подключается ПОСЛЕ shop-data.js.
// Цена зашита в префиксе id и продублирована в firestore.rules (itemPrice):
//   pa_=1500  pb_=2500  pc_=3500  pd_=50000  pe_=ADMIN GOD (только при unlimited == true, проверяет сервер)
const PF_CATS = {
    A: { name: 'Обычные',        price: 1500,  prefix: 'pa', rar: 'ОБЫЧНАЯ',     col: '#9fb3d9', sub: 'без анимаций' },
    B: { name: 'Анимированные',  price: 2500,  prefix: 'pb', rar: 'РЕДКАЯ',      col: '#4ad8ff', sub: 'свет, искры, пульсация' },
    C: { name: 'Эксклюзивные',   price: 3500,  prefix: 'pc', rar: 'ЭПИЧЕСКАЯ',   col: '#c77dff', sub: 'растения, золото, кристаллы' },
    D: { name: 'SUPER ELITE',    price: 50000, prefix: 'pd', rar: 'ЛЕГЕНДАРНАЯ', col: '#ffd166', sub: 'пять элитных концепций' },
    E: { name: 'ADMIN GOD',      price: null,  prefix: 'pe', rar: '👑 ADMIN GOD', col: '#ff3d5e', sub: 'только безлимитный баланс' }
};
const PF_LIST = [];
const PF_BY_ID = {};

// ---------- помощники для SVG ----------
const _n = v => +(+v).toFixed(1);
const _K = v => `calc(${v}px*var(--k))`;
// svg, привязанный к углу/краю окна (размеры масштабируются переменной --k)
function pfSvg(pos, w, h, inner, o = {}) {
    const dx = o.dx || 0, dy = o.dy || 0;
    const p = {
        tl: `left:${_K(dx)};top:${_K(dy)}`, tr: `right:${_K(dx)};top:${_K(dy)}`,
        bl: `left:${_K(dx)};bottom:${_K(dy)}`, br: `right:${_K(dx)};bottom:${_K(dy)}`,
        tc: `left:50%;margin-left:${_K(-w / 2)};top:${_K(dy)}`, bc: `left:50%;margin-left:${_K(-w / 2)};bottom:${_K(dy)}`,
        lc: `left:${_K(dx)};top:50%;margin-top:${_K(-h / 2)}`, rc: `right:${_K(dx)};top:50%;margin-top:${_K(-h / 2)}`
    }[pos];
    return `<svg class="pf-a ${o.cls || ''}" viewBox="0 0 ${w} ${h}" style="width:${_K(w)};height:${_K(h)};${p};${o.st || ''}">${inner}</svg>`;
}
// широкая полоса вдоль края: ширина = ширина окна + вылет
function pfStrip(pos, vw, vh, inner, o = {}) {
    const side = pos === 'top' ? `top:${_K(o.dy ?? -30)}` : `bottom:${_K(o.dy ?? -30)}`;
    return `<svg class="pf-a ${o.cls || ''}" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="xMinYMid meet" style="left:${_K(o.dx ?? -24)};width:calc(100% + ${_K(-2 * (o.dx ?? -24))});height:auto;aspect-ratio:${vw}/${vh};${side};${o.st || ''}">${inner}</svg>`;
}
const pfG = (t, inner, cls = '', st = '') => `<g transform="${t}"><g class="an ${cls}" style="${st}">${inner}</g></g>`;
const pfPath = (d, c, w, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;

// цветок: n лепестков двумя слоями, центр светится
function pfBloom(cx, cy, r, n, c1, c2, o = {}) {
    const a = 360 / n, pet = (s, fill, op, rot) => {
        let h = '';
        for (let i = 0; i < n; i++) {
            const d = o.round
                ? `M0 0C${_n(-.7 * r * s)} ${_n(-.2 * r * s)} ${_n(-.62 * r * s)} ${_n(-.95 * r * s)} 0 ${_n(-.86 * r * s)}C${_n(.62 * r * s)} ${_n(-.95 * r * s)} ${_n(.7 * r * s)} ${_n(-.2 * r * s)} 0 0Z`
                : `M0 0C${_n(-.38 * r * s)} ${_n(-.45 * r * s)} ${_n(-.32 * r * s)} ${_n(-.95 * r * s)} 0 ${_n(-r * s)}C${_n(.32 * r * s)} ${_n(-.95 * r * s)} ${_n(.38 * r * s)} ${_n(-.45 * r * s)} 0 0Z`;
            h += `<path transform="rotate(${_n(i * a + rot)})" d="${d}" fill="${fill}" fill-opacity="${op}" stroke="${c2}" stroke-width="1"/>`;
        }
        return h;
    };
    return pfG(`translate(${cx} ${cy}) rotate(${o.rot || 0})`, pet(1, c1, .78, 0) + pet(.6, c2, .85, a / 2) + `<circle r="${_n(r * .13)}" fill="${o.core || '#fff'}"/>`, 'bl', `animation-delay:${o.dl || 0}s`);
}
function pfLeaf(x, y, rot, len, c1, c2, dl = 0) {
    return pfG(`translate(${x} ${y}) rotate(${rot})`,
        `<path d="M0 0C${_n(len * .3)} ${_n(-len * .3)} ${_n(len * .75)} ${_n(-len * .26)} ${len} 0C${_n(len * .75)} ${_n(len * .26)} ${_n(len * .3)} ${_n(len * .3)} 0 0Z" fill="${c1}" fill-opacity=".8" stroke="${c2}" stroke-width="1"/><path d="M0 0L${_n(len * .88)} 0" stroke="${c2}" stroke-width=".8" opacity=".7"/>`, 'sw', `animation-delay:${dl}s`);
}
function pfCrystal(x, y, s, rot, c1, c2, dl = 0) {
    return pfG(`translate(${x} ${y}) rotate(${rot}) scale(${s})`,
        `<polygon points="0,-44 13,-30 13,12 0,26 -13,12 -13,-30" fill="${c1}" fill-opacity=".55" stroke="${c2}" stroke-width="1.4"/><path d="M0 -44L0 26M-13 -30L0 -18L13 -30M-13 12L0 -2L13 12" stroke="${c2}" stroke-width=".9" fill="none" opacity=".8"/>`, 'pu', `animation-delay:${dl}s`);
}
function pfFrond(x, y, rot, len, n, c1, c2, dl = 0) {
    let h = `<path d="M0 0Q${len / 2} ${_n(-len * .3)} ${len} 0" fill="none" stroke="${c2}" stroke-width="1.6"/>`;
    for (let i = 1; i <= n; i++) {
        const t = i / (n + 1), px = _n(len * t), py = _n(2 * t * (1 - t) * -len * .3), L = _n(len * .24 * (1 - t * .75));
        h += `<path transform="translate(${px} ${py}) rotate(-58)" d="M0 0Q${_n(L * .5)} ${_n(-L * .35)} ${L} 0Q${_n(L * .5)} ${_n(L * .2)} 0 0Z" fill="${c1}" fill-opacity=".8"/>`
            + `<path transform="translate(${px} ${py}) rotate(58)" d="M0 0Q${_n(L * .5)} ${_n(L * .35)} ${L} 0Q${_n(L * .5)} ${_n(-L * .2)} 0 0Z" fill="${c1}" fill-opacity=".8"/>`;
    }
    return pfG(`translate(${x} ${y}) rotate(${rot})`, h, 'sw', `animation-delay:${dl}s`);
}
function pfCrown(cx, cy, s, metal, dark, gem, gem2) {
    return `<g transform="translate(${cx} ${cy}) scale(${s})"><g class="an bob">
        <path d="M-46 22L-52 -18L-28 2L-14 -30L0 -4L14 -30L28 2L52 -18L46 22Z" fill="${metal}" stroke="${dark}" stroke-width="2"/>
        <rect x="-46" y="22" width="92" height="12" rx="3" fill="${dark}" stroke="${metal}" stroke-width="1.6"/>
        <circle cx="-52" cy="-20" r="5" fill="${gem2}"/><circle cx="52" cy="-20" r="5" fill="${gem2}"/><circle cx="-14" cy="-32" r="5" fill="${gem2}"/><circle cx="14" cy="-32" r="5" fill="${gem2}"/>
        <g class="an glint"><path d="M0 -4L9 10L0 20L-9 10Z" fill="${gem}" stroke="#fff" stroke-width="1.2"/><circle cx="-26" cy="28" r="3.2" fill="${gem2}"/><circle cx="0" cy="28" r="3.2" fill="${gem2}"/><circle cx="26" cy="28" r="3.2" fill="${gem2}"/></g></g></g>`;
}
// крыло из n перьев; side = 1 вправо, -1 влево
function pfWing(side, n, len, c1, c2, st = '') {
    let h = '';
    for (let i = 0; i < n; i++) {
        const ang = -78 + i * (62 / (n - 1)), L = _n(len * (1 - i * .06));
        h += `<path transform="rotate(${_n(ang)})" d="M0 0C${_n(L * .25)} ${_n(-L * .16)} ${_n(L * .75)} ${_n(-L * .14)} ${L} 0C${_n(L * .72)} ${_n(L * .12)} ${_n(L * .25)} ${_n(L * .14)} 0 0Z" fill="${c1}" fill-opacity=".72" stroke="${c2}" stroke-width="1.2"/>`;
    }
    return `<g transform="scale(${side} 1)"><g class="an flap" style="${st}">${h}</g></g>`;
}
const pfFlameTongue = (x, w, h, base, c, dl) => `<path class="an fl" style="transform-origin:${x}px ${base}px;animation-delay:${dl}s;--t:${_n(.8 + (dl % .5))}s" d="M${x - w / 2} ${base}C${x - w / 2} ${base - h * .5} ${x - w * .1} ${base - h * .55} ${x} ${base - h}C${x + w * .15} ${base - h * .55} ${x + w / 2} ${base - h * .5} ${x + w / 2} ${base}Z" fill="${c}"/>`;

// ---------- частицы ----------
function pfRand(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
function pfParts(id, cfgs, mock) {
    const rnd = pfRand([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    let out = '';
    cfgs.forEach(c => {
        const n = mock ? Math.max(2, Math.round(c.n / 3)) : c.n;
        for (let i = 0; i < n; i++) {
            let x, y; const sd = c.sd || 'all';
            const side = sd === 'all' ? ['t', 'b', 'l', 'r'][Math.floor(rnd() * 4)] : sd;
            if (side === 't') { x = rnd() * 100; y = -3 + rnd() * 7; }
            else if (side === 'b') { x = rnd() * 100; y = 96 + rnd() * 6; }
            else if (side === 'l') { x = -3 + rnd() * 6; y = rnd() * 100; }
            else if (side === 'r') { x = 97 + rnd() * 6; y = rnd() * 100; }
            else if (side === 'lr') { x = rnd() < .5 ? -3 + rnd() * 6 : 97 + rnd() * 6; y = rnd() * 100; }
            else if (side === 'tl') { x = -2 + rnd() * 34; y = -3 + rnd() * 12; }
            else if (side === 'tr') { x = 66 + rnd() * 34; y = -3 + rnd() * 14; }
            else if (side === 'corners') { const cx = rnd() < .5, cy = rnd() < .5; x = cx ? -2 + rnd() * 12 : 90 + rnd() * 12; y = cy ? -2 + rnd() * 12 : 90 + rnd() * 12; }
            else { x = rnd() * 100; y = rnd() * 100; }
            const s = c.s || [2, 4], col = c.c[Math.floor(rnd() * c.c.length)];
            out += `<i class="pf-p ${c.k} ${c.petal ? 'pt' : ''}" style="--x:${_n(x)}%;--y:${_n(y)}%;--s:${_n(s[0] + rnd() * (s[1] - s[0]))}px;--pc:${col};--d:${_n((c.d || [3, 6])[0] + rnd() * ((c.d || [3, 6])[1] - (c.d || [3, 6])[0]))}s;--dl:-${_n(rnd() * 6)}s;--dx:${_n((rnd() - .5) * 2 * (c.dx || 14))}px"></i>`;
        }
    });
    return out;
}

// ---------- регистрация ----------
function pfAdd(cat, key, name, desc, o) {
    const C = PF_CATS[cat], id = C.prefix + '_' + key;
    const it = { id, type: 'pframe', pf: true, cat, name, desc, price: C.price, rar: C.rar, tier: cat, ...o };
    PF_LIST.push(it); PF_BY_ID[id] = it; return it;
}
const _glow = (c, a = .8) => c;

// ======================= A · ОБЫЧНЫЕ (1500) — без анимаций =======================
pfAdd('A', 'sapphire', 'Сапфир', 'Синяя линия с тонким внутренним контуром', { ring: 'linear-gradient(135deg,#8fd0ff,#2a6df4 45%,#14306e)', w: 3, r: [20], sp: 0, gl: '#3b82f6', go: .25,
    css: `&{outline:1px solid rgba(120,180,255,.3);outline-offset:-8px}` });
pfAdd('A', 'amethyst', 'Аметист', 'Фиолетовый, углы скруглены по-разному', { ring: 'linear-gradient(160deg,#e0c3ff,#9b5cff 50%,#3d1d8a)', w: 3, r: [30, 8, 30, 8], sp: 0, gl: '#9b5cff', go: .25,
    css: `&{box-shadow:inset 0 0 34px rgba(155,92,255,.13)}` });
pfAdd('A', 'turquoise', 'Бирюза', 'Максимально мягкие углы и бирюзовый блеск', { ring: 'linear-gradient(90deg,#5ff5e0,#14b8a6,#0b5f66,#14b8a6,#5ff5e0)', w: 4, r: [38], sp: 0, gl: '#14b8a6', go: .22 });
pfAdd('A', 'ruby', 'Рубин', 'Толстый красный контур и тонкая внутренняя нить', { ring: 'linear-gradient(180deg,#ff8a9a,#e11d48 50%,#6b0a22)', w: 5, r: [8], sp: 0, gl: '#e11d48', go: .22,
    css: `&{outline:1px solid rgba(255,110,130,.45);outline-offset:-10px}` });
pfAdd('A', 'gold', 'Золото', 'Золотая окантовка с пунктирной строчкой', { ring: 'linear-gradient(135deg,#fff3c2,#f5b82e 30%,#a8741a 55%,#ffe08a 80%,#b9801f)', w: 4, r: [16], sp: 0, gl: '#f5b82e', go: .25,
    css: `&{outline:1px dashed rgba(255,215,110,.5);outline-offset:-9px}` });
pfAdd('A', 'silver', 'Серебро', 'Шлифованный металл с четырьмя заклёпками', { ring: 'repeating-linear-gradient(100deg,#f4f7fb 0 6px,#aeb8c7 6px 12px,#e1e6ee 12px 18px)', w: 4, r: [12], sp: 0, gl: '#c9d3e3', go: .18,
    css: `&{background:radial-gradient(circle at 14px 14px,#dfe5ee 0 2.4px,transparent 3.4px),radial-gradient(circle at calc(100% - 14px) 14px,#dfe5ee 0 2.4px,transparent 3.4px),radial-gradient(circle at 14px calc(100% - 14px),#dfe5ee 0 2.4px,transparent 3.4px),radial-gradient(circle at calc(100% - 14px) calc(100% - 14px),#dfe5ee 0 2.4px,transparent 3.4px),#0e0a1d}` });
pfAdd('A', 'emerald', 'Изумруд', 'Зелёные бусины по всему контуру', { ring: 'repeating-conic-gradient(#34e0a1 0 5deg,#0b6b4d 5deg 10deg)', w: 5, r: [22], sp: 0, gl: '#34e0a1', go: .2 });
pfAdd('A', 'rosequartz', 'Розовый кварц', 'Нежное розовое свечение внутри рамки', { ring: 'linear-gradient(135deg,#ffe4ee,#ff7aa8,#a8316a)', w: 3, r: [24], sp: 0, gl: '#ff7aa8', go: .25,
    css: `&{box-shadow:inset 0 0 56px rgba(255,122,168,.15)}` });
pfAdd('A', 'obsidian', 'Обсидиан', 'Тонкая серая линия и уголки-скобки', { ring: 'linear-gradient(135deg,#ffffff,#6b7280 50%,#d1d5db)', w: 2, r: [6], sp: 0, gl: '#e5e7eb', go: .12,
    css: `&{background:linear-gradient(#e5e7eb,#e5e7eb) 10px 10px/22px 2px no-repeat,linear-gradient(#e5e7eb,#e5e7eb) 10px 10px/2px 22px no-repeat,linear-gradient(#e5e7eb,#e5e7eb) right 10px top 10px/22px 2px no-repeat,linear-gradient(#e5e7eb,#e5e7eb) right 10px top 10px/2px 22px no-repeat,linear-gradient(#e5e7eb,#e5e7eb) left 10px bottom 10px/22px 2px no-repeat,linear-gradient(#e5e7eb,#e5e7eb) left 10px bottom 10px/2px 22px no-repeat,linear-gradient(#e5e7eb,#e5e7eb) right 10px bottom 10px/22px 2px no-repeat,linear-gradient(#e5e7eb,#e5e7eb) right 10px bottom 10px/2px 22px no-repeat,#0b0813}` });
pfAdd('A', 'copper', 'Медь', 'Рифлёная медная рамка с двойной канавкой', { ring: 'linear-gradient(135deg,#ffd9b8,#d9803f 35%,#7a3a10 60%,#e09a5c)', w: 6, r: [14], sp: 0, gl: '#d9803f', go: .2,
    css: `&{outline:2px double rgba(224,154,92,.55);outline-offset:-12px}` });

// ======================= B · АНИМИРОВАННЫЕ (2500) =======================
pfAdd('B', 'neonrun', 'Неоновый бегун', 'Световой хвост бежит по контуру', { ring: 'conic-gradient(from var(--a),transparent 0 50%,rgba(34,211,238,.25) 62%,#22d3ee 90%,#fff 100%),linear-gradient(#0e7490,#0e7490)', w: 3, r: [20], sp: 3, gl: '#22d3ee', go: .85,
    fx: [{ k: 'tw', n: 6, c: ['#22d3ee', '#fff'], sd: 'all', s: [2, 3.5] }] });
pfAdd('B', 'heartbeat', 'Пульс', 'Дышащее розовое свечение', { ring: 'linear-gradient(135deg,#ff5fd2,#c026d3 50%,#6d28d9)', w: 3, r: [20], sp: 0, gl: '#ff5fd2', go: .9,
    css: `&::after{animation:pfPulse 1.5s ease-in-out infinite}&::before{animation:pfBright 1.5s ease-in-out infinite}`,
    fx: [{ k: 'tw', n: 6, c: ['#ff9de9', '#fff'], sd: 'corners', s: [2, 4] }] });
pfAdd('B', 'comet', 'Две кометы', 'Два золотых блика гоняются по контуру', { ring: 'conic-gradient(from var(--a),transparent 0 35%,#ffd166 45%,#fff 50%,transparent 52%,transparent 85%,#ff9f43 95%,#fff 100%),linear-gradient(#5c4310,#5c4310)', w: 3, r: [18], sp: 2.6, gl: '#ffd166', go: .8,
    fx: [{ k: 'spark', n: 6, c: ['#ffd166', '#fff'], sd: 'corners', s: [2, 3] }] });
pfAdd('B', 'storm', 'Шторм', 'Молнии в углах и электрические искры', { ring: 'linear-gradient(135deg,#9ad1ff,#3b82f6 50%,#1e1b4b)', w: 3, r: [12], sp: 0, gl: '#7cc0ff', go: .8,
    css: `&::before{animation:pfFlicker 1.3s steps(1) infinite}`,
    fx: [{ k: 'spark', n: 12, c: ['#bfe3ff', '#fff', '#7cc0ff'], sd: 'corners', s: [2, 3.5], d: [.8, 1.8] }],
    deco: () => pfSvg('tl', 110, 90, `<g class="an bolt"><path d="M10 4L44 30L28 34L62 62L40 62L74 86" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/><path d="M44 30L70 22" stroke="#9ad1ff" stroke-width="1.6" fill="none"/></g>`, { dx: -10, dy: -10 })
        + pfSvg('br', 110, 90, `<g class="an bolt" style="animation-delay:.7s"><path d="M100 86L66 60L82 56L48 26L70 26L36 4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/><path d="M66 60L40 68" stroke="#9ad1ff" stroke-width="1.6" fill="none"/></g>`, { dx: -10, dy: -10 }) });
pfAdd('B', 'spectrum', 'Спектр', 'Плавная смена всех цветов радуги', { ring: 'linear-gradient(90deg,#ff3d81,#ffb300,#4ade80,#22d3ee,#8b5cf6,#ff3d81)', w: 3, r: [22], sp: 4, gl: '#c084fc', go: .85,
    css: `&::before,&::after{background-size:200% 100%;background-repeat:repeat-x;animation:pfBg 4s linear infinite}`,
    fx: [{ k: 'tw', n: 8, c: ['#ff3d81', '#ffb300', '#4ade80', '#22d3ee', '#a78bfa'], sd: 'all', s: [2, 4] }] });
pfAdd('B', 'ember', 'Жар', 'Огонь по нижней кромке, искры летят вверх', { ring: 'linear-gradient(0deg,#ffcf5a,#ff5a00 35%,#7a0f00 85%)', w: 3, r: [16], sp: 0, gl: '#ff6a00', go: .85,
    css: `&::before{animation:pfFlicker 1.1s ease-in-out infinite}`,
    fx: [{ k: 'rise', n: 12, c: ['#ffb300', '#ff5a00', '#fff1a8'], sd: 'b', s: [2, 4], d: [1.8, 3.4] }],
    deco: () => { let t = ''; for (let i = 0; i < 12; i++) t += pfFlameTongue(25 + i * 50, 34, 30 + (i % 3) * 12, 56, i % 2 ? '#ff7a18' : '#ffcf5a', i * .13); return pfStrip('bottom', 600, 60, t, { dy: -22, dx: -6 }); } });
pfAdd('B', 'arcane', 'Аркана', 'Вращающиеся магические руны в углах', { ring: 'conic-gradient(from var(--a),#7c3aed,#c084fc,#4c1d95,#a78bfa,#7c3aed)', w: 3, r: [20], sp: 8, gl: '#a78bfa', go: .8,
    fx: [{ k: 'tw', n: 8, c: ['#e9d5ff', '#c084fc'], sd: 'corners', s: [2, 4] }],
    deco: () => { const rune = `<g class="an rot" style="transform-origin:45px 45px"><circle cx="45" cy="45" r="38" fill="none" stroke="#c084fc" stroke-width="1.6" stroke-dasharray="4 5"/><polygon points="45,12 74,62 16,62" fill="none" stroke="#e9d5ff" stroke-width="1.4"/></g><g class="an rotr" style="transform-origin:45px 45px"><polygon points="45,78 16,28 74,28" fill="none" stroke="#a78bfa" stroke-width="1.2"/></g><circle cx="45" cy="45" r="6" fill="#e9d5ff"/>`;
        return pfSvg('tl', 90, 90, rune, { dx: -30, dy: -30 }) + pfSvg('tr', 90, 90, rune, { dx: -30, dy: -30 }) + pfSvg('bl', 90, 90, rune, { dx: -30, dy: -30 }) + pfSvg('br', 90, 90, rune, { dx: -30, dy: -30 }); } });
pfAdd('B', 'aurora', 'Северное сияние', 'Зелёно-фиолетовые волны вдоль кромки', { ring: 'linear-gradient(90deg,#34d399,#22d3ee,#8b5cf6,#34d399)', w: 3, r: [24], sp: 6, gl: '#34d399', go: .9, bl: 14,
    css: `&::before,&::after{background-size:200% 100%;background-repeat:repeat-x;animation:pfBg 6s linear infinite}`,
    inner: `<i style="left:-50%;top:-24px;width:200%;height:80px;background:radial-gradient(ellipse at 30% 0,rgba(52,211,153,.6),transparent 60%),radial-gradient(ellipse at 70% 0,rgba(139,92,246,.55),transparent 60%);animation:pfDrift 7s ease-in-out infinite alternate"></i><i style="left:-50%;bottom:-24px;width:200%;height:70px;background:radial-gradient(ellipse at 60% 100%,rgba(34,211,238,.5),transparent 60%),radial-gradient(ellipse at 20% 100%,rgba(167,139,250,.45),transparent 60%);animation:pfDrift 9s ease-in-out infinite alternate-reverse"></i>`,
    fx: [{ k: 'tw', n: 8, c: ['#a7f3d0', '#c4b5fd'], sd: 'tl', s: [2, 3.5] }] });
pfAdd('B', 'plasma', 'Плазма', 'Энергетические сегменты и пульсирующие узлы', { ring: 'repeating-conic-gradient(from var(--a),#ff4df0 0 8deg,#2b1466 8deg 16deg,#22d3ee 16deg 22deg,#2b1466 22deg 36deg)', w: 4, r: [14], sp: 2.4, gl: '#ff4df0', go: .8,
    fx: [{ k: 'spark', n: 8, c: ['#ff4df0', '#22d3ee', '#fff'], sd: 'all', s: [2, 3], d: [1, 2] }],
    deco: () => ['tl', 'tr', 'bl', 'br'].map((p, i) => pfSvg(p, 26, 26, `<g class="an pu" style="animation-delay:${i * .4}s;transform-origin:13px 13px"><circle cx="13" cy="13" r="9" fill="#ff4df0" fill-opacity=".35" stroke="#ffb3f7" stroke-width="1.6"/><circle cx="13" cy="13" r="3.6" fill="#fff"/></g>`, { dx: -9, dy: -9 })).join('') });
pfAdd('B', 'frost', 'Морозный блик', 'Ледяной свет скользит по краю, снег искрится', { ring: 'linear-gradient(135deg,#ffffff,#8fdcff 45%,#2a6fb8)', w: 3, r: [18], sp: 0, gl: '#8fdcff', go: .7,
    inner: `<i style="top:-10px;bottom:-10px;left:0;width:36%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);animation:pfSweep 3.6s ease-in-out infinite"></i>`,
    fx: [{ k: 'fall', n: 9, c: ['#fff', '#bfe9ff'], sd: 't', s: [2, 3.5], d: [4, 7], dx: 10 }, { k: 'tw', n: 6, c: ['#fff', '#8fdcff'], sd: 'all', s: [2, 4] }] });

// ======================= C · ЭКСКЛЮЗИВНЫЕ (3500) =======================
pfAdd('C', 'lotus', 'Неоновый лотос', 'Лотосы в нижних углах и всплывающие лепестки', { ring: 'linear-gradient(135deg,#ff9de9,#c026d3 40%,#22d3ee)', w: 3, r: [30], sp: 0, gl: '#ff7ad9', go: .7,
    css: `&::after{animation:pfPulse 3.4s ease-in-out infinite}`,
    fx: [{ k: 'rise', n: 10, c: ['#ff9de9', '#7cf6ff'], sd: 'b', s: [2.5, 4.5], petal: true, d: [3, 5.5] }],
    deco: () => { const lot = (m) => `<g transform="scale(${m} 1)">${pfBloom(70, 60, 54, 8, '#ff7ad9', '#ffd1f5', { dl: 0 })}${pfBloom(20, 82, 34, 6, '#6ee7ff', '#e0fbff', { dl: .6 })}${pfLeaf(70, 106, 190, 58, '#14b8a6', '#99f6e4')}${pfLeaf(60, 104, -20, 46, '#0f9d8f', '#99f6e4', .5)}</g>`;
        return pfSvg('bl', 140, 120, lot(1), { dx: -26, dy: -26 }) + pfSvg('br', 140, 120, `<g transform="translate(140 0) scale(-1 1)">${lot(1)}</g>`, { dx: -26, dy: -26 }); } });
pfAdd('C', 'goldivy', 'Золотой плющ', 'Золотая лоза с листьями вдоль верхней кромки', { ring: 'linear-gradient(135deg,#fff3c2,#f5b82e 30%,#a8741a 55%,#ffe08a 80%,#b9801f)', w: 4, r: [18], sp: 0, gl: '#f5b82e', go: .55,
    css: `&{outline:1px solid rgba(245,184,46,.35);outline-offset:-9px}`,
    fx: [{ k: 'tw', n: 12, c: ['#fff3c2', '#ffd166'], sd: 't', s: [2, 4], d: [2, 4] }],
    deco: () => { let h = pfPath('M20 38C140 6 220 70 340 34S520 46 620 30', '#f5b82e', 3.2) + pfPath('M300 40C340 70 380 70 400 92', '#c98a14', 2);
        for (let i = 0; i < 9; i++) { const x = 40 + i * 65, y = 36 + (i % 2 ? 12 : -4); h += pfLeaf(x, y, i % 2 ? 60 : -50, 30, '#ffd166', '#fff3c2', i * .25); }
        return pfStrip('top', 640, 100, h, { dy: -22 }) + pfSvg('tl', 70, 70, pfBloom(35, 35, 28, 5, '#ffd166', '#fff3c2', { round: 1 }), { dx: -20, dy: -20 }); } });
pfAdd('C', 'geode', 'Жеода', 'Кристаллы пульсируют в четырёх углах', { ring: 'linear-gradient(135deg,#7cf6ff,#8b5cf6 55%,#1e1b4b)', w: 3, r: [12], sp: 0, gl: '#7cf6ff', go: .6,
    fx: [{ k: 'tw', n: 10, c: ['#e0fbff', '#c4b5fd'], sd: 'corners', s: [2, 4] }],
    deco: () => `${pfSvg('tl', 120, 110, pfCrystal(30, 60, 1.2, -25, '#22d3ee', '#e0fbff') + pfCrystal(62, 70, .8, 18, '#8b5cf6', '#ddd6fe', .5) + pfCrystal(92, 52, .55, 35, '#22d3ee', '#e0fbff', 1), { dx: -22, dy: -26 })}
        ${pfSvg('br', 120, 110, pfCrystal(90, 52, 1.2, 155, '#8b5cf6', '#ddd6fe') + pfCrystal(58, 42, .8, 198, '#22d3ee', '#e0fbff', .5) + pfCrystal(28, 60, .55, 215, '#8b5cf6', '#ddd6fe', 1), { dx: -22, dy: -26 })}
        ${pfSvg('tr', 80, 80, pfCrystal(40, 44, .8, 20, '#22d3ee', '#e0fbff', .3), { dx: -14, dy: -14 })}${pfSvg('bl', 80, 80, pfCrystal(40, 36, .8, -160, '#8b5cf6', '#ddd6fe', .8), { dx: -14, dy: -14 })}` });
pfAdd('C', 'hexcut', 'Гекс-матрица', 'Геометрия, острые срезы и бегущая линия-сканер', { ring: 'conic-gradient(from 40deg,#ff2bd6,#22d3ee,#ff2bd6,#22d3ee,#ff2bd6)', w: 3, r: [30, 4, 30, 4], sp: 0, gl: '#c026d3', go: .65,
    inner: `<i style="left:-30%;top:0;width:30%;height:3px;background:linear-gradient(90deg,transparent,#22d3ee,#fff,transparent);animation:pfSweep 3.2s linear infinite;box-shadow:0 0 10px #22d3ee"></i><i style="left:-30%;bottom:0;width:30%;height:3px;background:linear-gradient(90deg,transparent,#ff2bd6,#fff,transparent);animation:pfSweep 3.2s linear infinite 1.6s;box-shadow:0 0 10px #ff2bd6"></i>`,
    deco: () => { const hexes = (c) => [0, 1, 2].map(i => `<polygon transform="translate(${28 + i * 30} ${40 + (i % 2) * 22})" points="0,-14 12,-7 12,7 0,14 -12,7 -12,-7" fill="none" stroke="${c}" stroke-width="1.6"/>`).join('');
        return pfSvg('tl', 130, 100, `<path d="M6 80V20Q6 6 20 6H90M18 80V32Q18 18 32 18H80" fill="none" stroke="#22d3ee" stroke-width="2"/>${hexes('#22d3ee')}<g class="an pu"><polygon points="110,6 122,13 122,27 110,34 98,27 98,13" fill="#22d3ee" fill-opacity=".4" stroke="#fff"/></g>`, { dx: -14, dy: -14 })
            + pfSvg('br', 130, 100, `<g transform="rotate(180 65 50)"><path d="M6 80V20Q6 6 20 6H90M18 80V32Q18 18 32 18H80" fill="none" stroke="#ff2bd6" stroke-width="2"/>${hexes('#ff2bd6')}<g class="an pu" style="animation-delay:.8s"><polygon points="110,6 122,13 122,27 110,34 98,27 98,13" fill="#ff2bd6" fill-opacity=".4" stroke="#fff"/></g></g>`, { dx: -14, dy: -14 }); } });
pfAdd('C', 'fern', 'Светящийся папоротник', 'Неоновые побеги качаются, светлячки у кромки', { ring: 'linear-gradient(135deg,#d9ff7a,#34d399 45%,#065f46)', w: 3, r: [22, 22, 22, 22], sp: 0, gl: '#7cffb0', go: .6,
    fx: [{ k: 'tw', n: 12, c: ['#eaff7a', '#9dffb8'], sd: 'lr', s: [2.5, 4.5], d: [2.5, 5] }, { k: 'rise', n: 5, c: ['#eaff7a'], sd: 'b', s: [2, 3] }],
    deco: () => pfSvg('bl', 190, 180, pfFrond(14, 168, -62, 150, 11, '#34d399', '#d9ff7a') + pfFrond(10, 172, -38, 130, 9, '#22c55e', '#bbf7d0', .5) + pfFrond(16, 176, -84, 110, 8, '#10b981', '#a7f3d0', 1), { dx: -26, dy: -26 })
        + pfSvg('tr', 170, 150, pfFrond(156, 14, 118, 140, 10, '#34d399', '#d9ff7a', .3) + pfFrond(160, 18, 142, 120, 8, '#22c55e', '#bbf7d0', .9), { dx: -24, dy: -24 }) });
pfAdd('C', 'royal', 'Королевские самоцветы', 'Золото с рубином, сапфирами и изумрудом', { ring: 'linear-gradient(135deg,#fff3c2,#f5b82e 30%,#8a5a10 55%,#ffe08a 80%,#b9801f)', w: 5, r: [14], sp: 0, gl: '#f5b82e', go: .55,
    css: `&{outline:1px dashed rgba(255,215,110,.45);outline-offset:-10px}`,
    fx: [{ k: 'tw', n: 10, c: ['#fff', '#ffe08a'], sd: 'all', s: [2, 4] }],
    deco: () => { const gem = (x, y, c, s = 1, dl = 0) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="an glint" style="animation-delay:${dl}s"><path d="M0 -13L12 0L0 14L-12 0Z" fill="${c}" stroke="#fff3c2" stroke-width="2"/><path d="M-12 0H12M0 -13L-4 0L0 14L4 0Z" stroke="#fff" stroke-width=".7" fill="none" opacity=".7"/></g></g>`;
        const curl = `<path d="M6 6Q50 6 52 40Q54 64 30 60Q14 56 22 40" fill="none" stroke="#f5b82e" stroke-width="3" stroke-linecap="round"/>`;
        return pfSvg('tc', 40, 40, gem(20, 20, '#e11d48', 1.2), { dy: -18 }) + pfSvg('bc', 40, 40, gem(20, 20, '#10b981', 1.2, .8), { dy: -18 }) + pfSvg('lc', 40, 40, gem(20, 20, '#3b82f6', 1.1, .4), { dx: -18 }) + pfSvg('rc', 40, 40, gem(20, 20, '#3b82f6', 1.1, 1.2), { dx: -18 })
            + pfSvg('tl', 70, 70, curl, { dx: -6, dy: -6 }) + pfSvg('tr', 70, 70, `<g transform="translate(70 0) scale(-1 1)">${curl}</g>`, { dx: -6, dy: -6 }) + pfSvg('bl', 70, 70, `<g transform="translate(0 70) scale(1 -1)">${curl}</g>`, { dx: -6, dy: -6 }) + pfSvg('br', 70, 70, `<g transform="translate(70 70) scale(-1 -1)">${curl}</g>`, { dx: -6, dy: -6 }); } });
pfAdd('C', 'orchid', 'Сумеречная орхидея', 'Орхидеи свисают с правого верхнего угла', { ring: 'linear-gradient(135deg,#f0abfc,#a21caf 45%,#4c1d95)', w: 3, r: [8, 34, 8, 34], sp: 0, gl: '#e879f9', go: .65,
    css: `&::after{animation:pfPulse 4s ease-in-out infinite}`,
    fx: [{ k: 'fall', n: 8, c: ['#f0abfc', '#c084fc'], sd: 'tr', s: [2.5, 4], petal: true, d: [4.5, 7.5], dx: -22 }],
    deco: () => { const orch = (x, y, s, dl) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="an bl" style="animation-delay:${dl}s"><ellipse cx="0" cy="-22" rx="11" ry="22" fill="#e879f9" fill-opacity=".75" stroke="#fdf4ff" stroke-width="1"/><ellipse cx="-20" cy="-8" rx="22" ry="11" fill="#c026d3" fill-opacity=".7" stroke="#fdf4ff" stroke-width="1"/><ellipse cx="20" cy="-8" rx="22" ry="11" fill="#c026d3" fill-opacity=".7" stroke="#fdf4ff" stroke-width="1"/><path d="M-12 8Q0 30 12 8Q0 14 -12 8Z" fill="#fdf4ff" fill-opacity=".9"/><circle cy="-4" r="4" fill="#fde047"/></g></g>`;
        return pfSvg('tr', 200, 190, pfPath('M196 12C150 8 120 40 118 90S96 150 104 182', '#86efac', 2.4) + pfLeaf(160, 22, 170, 44, '#22c55e', '#bbf7d0') + pfLeaf(118, 100, 70, 40, '#16a34a', '#bbf7d0', .6) + orch(150, 60, 1, 0) + orch(112, 120, .8, .7) + orch(104, 168, .6, 1.4), { dx: -22, dy: -22 }); } });
pfAdd('C', 'artdeco', 'Ар-деко', 'Золото и чёрный: ступенчатые углы и веер света', { ring: 'linear-gradient(90deg,#b9801f,#fff3c2,#f5b82e,#fff3c2,#b9801f)', w: 4, r: [3], sp: 0, gl: '#f5b82e', go: .45,
    css: `&{outline:2px double rgba(245,184,46,.55);outline-offset:-10px}`,
    inner: `<i style="top:-10px;bottom:-10px;left:0;width:30%;background:linear-gradient(90deg,transparent,rgba(255,226,140,.8),transparent);animation:pfSweep 4.4s ease-in-out infinite"></i>`,
    deco: () => { const step = `<path d="M4 70V40H24V22H44V6H80" fill="none" stroke="#f5b82e" stroke-width="3"/><path d="M14 70V48H34V30H54V16H80" fill="none" stroke="#ffe08a" stroke-width="1.4"/>`;
        let fan = ''; for (let i = 0; i < 9; i++) fan += `<line x1="50" y1="40" x2="${_n(50 + 46 * Math.cos((200 + i * 17.5) * Math.PI / 180))}" y2="${_n(40 + 46 * Math.sin((200 + i * 17.5) * Math.PI / 180))}" stroke="#f5b82e" stroke-width="1.6"/>`;
        return pfSvg('tl', 80, 70, step, { dx: -10, dy: -10 }) + pfSvg('tr', 80, 70, `<g transform="translate(80 0) scale(-1 1)">${step}</g>`, { dx: -10, dy: -10 }) + pfSvg('bl', 80, 70, `<g transform="translate(0 70) scale(1 -1)">${step}</g>`, { dx: -10, dy: -10 }) + pfSvg('br', 80, 70, `<g transform="translate(80 70) scale(-1 -1)">${step}</g>`, { dx: -10, dy: -10 })
            + pfSvg('tc', 100, 50, `<g class="an glint">${fan}<path d="M10 44Q50 0 90 44" fill="none" stroke="#ffe08a" stroke-width="2"/></g>`, { dy: -34 }) + pfSvg('bc', 100, 50, `<g transform="rotate(180 50 25)"><g class="an glint" style="animation-delay:1.2s">${fan.replace(/y1="40"/g, 'y1="40"')}</g></g>`, { dy: -34 }); } });
pfAdd('C', 'icegarden', 'Ледяной сад', 'Морозные узоры, снегопад и мерцание кристаллов', { ring: 'linear-gradient(135deg,#ffffff,#9fe3ff 45%,#3b82f6)', w: 3, r: [26], sp: 0, gl: '#9fe3ff', go: .65,
    fx: [{ k: 'fall', n: 10, c: ['#fff', '#bfe9ff'], sd: 'lr', s: [2, 4], d: [4, 7.5], dx: 8 }, { k: 'tw', n: 8, c: ['#fff', '#9fe3ff'], sd: 'all', s: [2, 4] }],
    deco: () => { const flake = (x, y, s, dl) => { let a = ''; for (let i = 0; i < 6; i++) a += `<g transform="rotate(${i * 60})"><path d="M0 0V-30M0 -16L-8 -24M0 -16L8 -24M0 -8L-6 -14M0 -8L6 -14" stroke="#e0f6ff" stroke-width="1.8" stroke-linecap="round" fill="none"/></g>`; return `<g transform="translate(${x} ${y}) scale(${s})"><g class="an rot" style="--t:${30 + dl * 5}s">${a}</g></g>`; };
        return pfSvg('tl', 120, 120, flake(48, 48, 1.4, 0) + flake(98, 26, .6, 1) + flake(24, 100, .6, 2) + pfCrystal(88, 84, .5, 20, '#9fe3ff', '#fff', .4), { dx: -26, dy: -26 }) + pfSvg('br', 120, 120, flake(72, 72, 1.4, 1) + flake(22, 94, .6, 2) + flake(96, 22, .6, 0) + pfCrystal(32, 34, .5, 200, '#9fe3ff', '#fff', .9), { dx: -26, dy: -26 }); } });
pfAdd('C', 'sakura', 'Ветвь сакуры', 'Цветущая ветка и падающие лепестки', { ring: 'linear-gradient(135deg,#fff0f6,#ff9ec4 45%,#c2477a)', w: 3, r: [22], sp: 0, gl: '#ff9ec4', go: .6,
    fx: [{ k: 'fall', n: 12, c: ['#ffc2da', '#ff9ec4', '#fff0f6'], sd: 'tr', s: [2.5, 4.5], petal: true, d: [4, 8], dx: -26 }, { k: 'fall', n: 4, c: ['#ffc2da'], sd: 'r', s: [3, 4.5], petal: true, d: [5, 8], dx: 18 }],
    deco: () => { let h = pfPath('M620 14C520 20 470 54 380 48S210 28 120 60', '#8a5a44', 4.5) + pfPath('M430 50C410 80 380 86 360 110', '#8a5a44', 3) + pfPath('M240 38C230 14 200 6 170 8', '#8a5a44', 2.6);
        [[580, 24, 22], [510, 38, 18], [440, 52, 24], [360, 46, 20], [290, 34, 26], [200, 40, 18], [140, 58, 22], [370, 106, 18], [180, 10, 15]].forEach(([x, y, r], i) => h += pfBloom(x, y, r, 5, '#ffb3d1', '#fff0f6', { round: 1, dl: i * .3, core: '#ff4d8d' }));
        return pfStrip('top', 640, 120, h, { dy: -26 }); } });
