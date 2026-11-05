// ELO SNS — SUPER ELITE (50 000) и ADMIN GOD. Подключается после pframes-data.js.

// ======================= D1 · NEON BLOSSOM (референс: цветы из левого верхнего угла к правой центральной части) =======================
pfAdd('D', 'blossom', 'NEON BLOSSOM', 'Неоновые цветы и лианы тянутся из угла вдоль кромки, лепестки кружатся', { ring: 'conic-gradient(from var(--a),#22d3ee,#6366f1,#c026d3,#ff7ad9,#22d3ee)', w: 3, r: [22], sp: 7, gl: '#7ab8ff', go: 1, bl: 10,
    inner: `<i style="left:-10%;top:-30px;width:70%;height:90px;background:radial-gradient(ellipse at 20% 0,rgba(110,170,255,.55),transparent 65%);animation:pfDrift 6s ease-in-out infinite alternate"></i><i style="right:-10%;bottom:-30px;width:50%;height:80px;background:radial-gradient(ellipse at 80% 100%,rgba(200,100,255,.45),transparent 65%);animation:pfDrift 8s ease-in-out infinite alternate-reverse"></i>`,
    fx: [{ k: 'fall', n: 12, c: ['#7cf6ff', '#ff9de9', '#c4b5fd'], sd: 'tl', s: [2.5, 5], petal: true, d: [4, 8], dx: 26 }, { k: 'fall', n: 6, c: ['#ff9de9', '#c4b5fd'], sd: 'r', s: [2.5, 4], petal: true, d: [5, 9], dx: -14 },
        { k: 'tw', n: 14, c: ['#fff', '#aee6ff', '#ffc2f3'], sd: 'all', s: [1.6, 3.4], d: [2, 4.5] }, { k: 'rise', n: 6, c: ['#aee6ff'], sd: 'tl', s: [1.5, 2.5], d: [4, 7] }],
    deco: () => {
        let s = pfPath('M10 130C150 40 330 140 520 82', '#3dd6ff', 6) + pfPath('M500 88C650 40 790 100 1000 130', '#7aa2ff', 3.4) + pfPath('M60 150C190 110 260 160 380 120', '#8b5cf6', 3) + pfPath('M600 70C660 20 740 30 800 60', '#c084fc', 2);
        [[160, 82, -30, 70], [230, 108, 40, 62], [310, 86, -50, 56], [380, 120, 30, 50], [440, 70, -40, 50], [520, 96, 36, 44], [590, 62, -44, 40], [660, 84, 40, 36], [730, 60, -36, 34], [800, 92, 34, 30], [880, 108, -30, 26], [950, 124, 30, 22], [120, 60, -70, 56], [260, 52, -62, 50]].forEach(([x, y, a, l], i) => s += pfLeaf(x, y, a, l, i % 2 ? '#2a8cff' : '#22d3ee', i % 2 ? '#bfe0ff' : '#c8fbff', i * .17));
        s += pfBloom(170, 70, 98, 8, '#46b4ff', '#e0f7ff', { dl: 0 }) + pfBloom(52, 44, 64, 7, '#8b7bff', '#e6e0ff', { dl: .6, rot: 10 }) + pfBloom(240, 30, 56, 7, '#c084fc', '#f5e1ff', { dl: 1.1 })
            + pfBloom(330, 92, 42, 6, '#ff9de9', '#ffe3f8', { dl: .3 }) + pfBloom(470, 78, 34, 6, '#7aa2ff', '#e6f0ff', { dl: 1.4 }) + pfBloom(630, 78, 26, 5, '#22d3ee', '#d8fbff', { dl: .9 }) + pfBloom(800, 96, 20, 5, '#c084fc', '#f5e1ff', { dl: .5 });
        const right = pfPath('M110 4C70 60 100 130 62 196S28 270 18 326', '#7aa2ff', 3.4) + [[84, 50, 30, 36], [56, 120, 60, 30], [74, 168, -20, 28], [40, 230, 50, 24], [28, 290, 40, 20]].map(([x, y, a, l], i) => pfLeaf(x, y, a, l, '#2a8cff', '#bfe0ff', i * .3)).join('') + pfBloom(80, 86, 26, 6, '#c084fc', '#f5e1ff', { dl: .4 }) + pfBloom(52, 206, 18, 5, '#ff9de9', '#ffe3f8', { dl: 1 });
        return pfStrip('top', 1000, 220, s, { dy: -52, dx: -34 }) + pfSvg('tr', 120, 330, right, { dx: -26, dy: 14 })
            + pfSvg('br', 150, 120, pfLeaf(130, 108, 200, 70, '#22d3ee', '#c8fbff') + pfLeaf(130, 108, 232, 56, '#2a8cff', '#bfe0ff', .5) + pfLeaf(130, 108, 170, 50, '#8b5cf6', '#e6e0ff', 1) + pfBloom(120, 98, 14, 5, '#ff9de9', '#fff', { dl: .6 }), { dx: -20, dy: -20 })
            + pfSvg('bl', 70, 70, pfCrystal(30, 40, .8, -20, '#22d3ee', '#e0fbff') + pfCrystal(52, 48, .5, 20, '#c084fc', '#f5e1ff', .6), { dx: -14, dy: -14 }); } });

// ======================= D2 · DRAGON EMPEROR =======================
pfAdd('D', 'dragon', 'DRAGON EMPEROR', 'Золотой дракон вьётся по кромке и дышит огнём', { ring: 'conic-gradient(from var(--a),#ffd166,#ff3d00,#b91c1c,#ffd166,#fff3c2,#f5b82e,#ffd166)', w: 4, r: [18], sp: 5, gl: '#ff8a00', go: 1, bl: 10,
    inner: `<i style="left:-20%;bottom:-26px;width:140%;height:90px;background:radial-gradient(ellipse at 50% 100%,rgba(255,90,0,.55),transparent 70%);animation:pfFlicker 2.4s ease-in-out infinite"></i><i style="right:-6%;top:-20px;width:46%;height:90px;background:radial-gradient(ellipse at 80% 0,rgba(255,200,60,.5),transparent 65%);animation:pfDrift 4s ease-in-out infinite alternate"></i>`,
    fx: [{ k: 'rise', n: 12, c: ['#ffb300', '#ff5a00', '#fff1a8'], sd: 'tr', s: [2, 5], d: [1.6, 3.2], dx: -30 }, { k: 'spark', n: 8, c: ['#ffd166', '#fff'], sd: 'lr', s: [1.8, 3], d: [1, 2] }, { k: 'tw', n: 10, c: ['#ffe08a', '#fff'], sd: 'all', s: [2, 4] }],
    deco: () => {
        const body = 'M880 66C770 18 690 112 560 68S330 22 210 72S70 124 40 96C28 74 58 60 66 82';
        let s = `<path d="${body}" fill="none" stroke="#5a3204" stroke-width="22" stroke-linecap="round"/>` + pfPath(body, '#f5b82e', 16) + pfPath(body, '#fff3c2', 4, 'transform="translate(0 -4)" opacity=".75"')
            + `<path class="an dash" d="${body}" fill="none" stroke="#7a4a08" stroke-width="15" stroke-dasharray="3 10"/>`
            + `<path class="an dash" d="${body}" fill="none" stroke="#ff4d00" stroke-width="9" stroke-dasharray="2 26" transform="translate(0 -11)"/>`
            + pfPath('M860 70C900 90 930 100 960 96', '#ffe08a', 1.6) + pfPath('M860 58C910 46 930 30 968 34', '#ffe08a', 1.6);
        const head = `<g transform="translate(846 6)"><g class="an bob"><path d="M100 30Q96 0 124 -16Q116 12 124 32Z" fill="#ffe08a" stroke="#8a5a10" stroke-width="1.5"/><path d="M136 30Q140 4 160 -4Q150 20 152 34Z" fill="#ffe08a" stroke="#8a5a10" stroke-width="1.5"/>
            <path d="M0 74L30 58L62 52L92 36L104 14L118 34L140 30L150 10L158 40L160 74L146 98L112 104L90 124L50 108L22 100Z" fill="#f5b82e" stroke="#7a4a08" stroke-width="2.4" stroke-linejoin="round"/>
            <path d="M4 80L60 82L100 94" stroke="#5a3204" stroke-width="2" fill="none"/><path d="M18 81l5 9 5-8M32 83l5 9 5-8M46 84l5 9 5-8" fill="#fff" stroke="#5a3204" stroke-width="1"/>
            <circle cx="86" cy="62" r="8" fill="#ff1744" class="an glint"/><ellipse cx="86" cy="62" rx="2" ry="6" fill="#1a0000"/><circle cx="14" cy="66" r="2.6" fill="#ff5a00"/></g>
            <g transform="translate(2 78)"><path class="an fl" style="transform-origin:0 0;animation-delay:.1s" d="M0 0Q-70 -26 -150 -4Q-70 8 0 0Z" fill="#ff5a00" fill-opacity=".85"/><path class="an fl" style="transform-origin:0 0;animation-delay:.3s" d="M0 0Q-50 -14 -108 0Q-50 12 0 0Z" fill="#ffb300"/><path class="an fl" style="transform-origin:0 0;animation-delay:.2s" d="M0 0Q-30 -6 -62 2Q-30 8 0 0Z" fill="#fff1a8"/></g></g>`;
        return pfStrip('top', 1000, 170, s + head, { dy: -34, dx: -28 })
            + pfSvg('bl', 110, 110, `<g class="an pu"><path d="M10 100Q40 70 30 40Q60 50 90 14" fill="none" stroke="#ff6a00" stroke-width="2.4"/><path d="M30 40L22 20M60 44L74 34" stroke="#ffd166" stroke-width="1.6" fill="none"/></g>`, { dx: -6, dy: -6 })
            + pfSvg('br', 110, 110, `<g transform="translate(110 0) scale(-1 1)"><g class="an pu" style="animation-delay:.6s"><path d="M10 100Q40 70 30 40Q60 50 90 14" fill="none" stroke="#ff6a00" stroke-width="2.4"/><path d="M30 40L22 20M60 44L74 34" stroke="#ffd166" stroke-width="1.6" fill="none"/></g></g>`, { dx: -6, dy: -6 }); } });

// ======================= D3 · GALAXY KING =======================
pfAdd('D', 'galaxy', 'GALAXY KING', 'Туманность, спиральная галактика, планета на орбите и падающие звёзды', { ring: 'conic-gradient(from var(--a),#6366f1,#22d3ee,#c026d3,#312e81,#8b5cf6,#6366f1)', w: 4, r: [20], sp: 6, gl: '#7c6bff', go: 1, bl: 11,
    css: `&{background:radial-gradient(ellipse at 15% 10%,rgba(99,102,241,.18),transparent 55%),radial-gradient(ellipse at 90% 95%,rgba(192,38,211,.16),transparent 55%),#0b0820}`,
    inner: `<i style="left:-40%;top:-20px;width:180%;height:90px;background:radial-gradient(ellipse at 30% 0,rgba(99,102,241,.6),transparent 60%),radial-gradient(ellipse at 75% 0,rgba(192,38,211,.5),transparent 60%);animation:pfDrift 9s ease-in-out infinite alternate"></i><i style="left:-40%;bottom:-20px;width:180%;height:90px;background:radial-gradient(ellipse at 20% 100%,rgba(34,211,238,.45),transparent 60%),radial-gradient(ellipse at 70% 100%,rgba(139,92,246,.5),transparent 60%);animation:pfDrift 11s ease-in-out infinite alternate-reverse"></i><i style="left:-30%;top:12px;width:22%;height:2px;background:linear-gradient(90deg,transparent,#fff);box-shadow:0 0 8px #fff;animation:pfSweep 5s linear infinite"></i><i style="left:-30%;bottom:14px;width:22%;height:2px;background:linear-gradient(90deg,transparent,#aee6ff);box-shadow:0 0 8px #7cf6ff;animation:pfSweep 6.5s linear infinite 2.2s"></i>`,
    fx: [{ k: 'tw', n: 26, c: ['#fff', '#aee6ff', '#e0c3ff', '#ffe08a'], sd: 'all', s: [1.4, 3.6], d: [2, 5] }],
    deco: () => {
        const star = (x, y, s, dl) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="an pu" style="animation-delay:${dl}s"><path d="M0 -14L3 -3L14 0L3 3L0 14L-3 3L-14 0L-3 -3Z" fill="#fff" stroke="#aee6ff" stroke-width=".8"/></g></g>`;
        let gal = ''; for (let i = 0; i < 4; i++) gal += `<ellipse cx="60" cy="60" rx="52" ry="${14 + i * 3}" fill="none" stroke="${['#7cf6ff', '#a78bfa', '#f0abfc', '#fff'][i]}" stroke-width="1.6" opacity=".8" transform="rotate(${i * 45} 60 60)"/>`;
        return pfSvg('tl', 130, 130, `<g class="an rot" style="--t:22s;transform-origin:60px 60px">${gal}</g><circle cx="60" cy="60" r="8" fill="#fff" class="an pu"/><g class="an rotr" style="--t:9s;transform-origin:60px 60px"><circle cx="112" cy="60" r="7" fill="#ff9d4d" stroke="#ffe08a"/><ellipse cx="112" cy="60" rx="13" ry="3.4" fill="none" stroke="#ffe08a" stroke-width="1.2" transform="rotate(-25 112 60)"/></g>`, { dx: -34, dy: -34 })
            + pfSvg('br', 150, 100, `<polyline points="6,84 40,60 70,70 100,34 140,14" fill="none" stroke="#aee6ff" stroke-width="1.2" stroke-dasharray="3 4" opacity=".8"/>` + [[6, 84], [40, 60], [70, 70], [100, 34], [140, 14]].map(([x, y], i) => star(x, y, .5 + (i % 3) * .2, i * .4)).join(''), { dx: -14, dy: -14 })
            + pfSvg('tr', 70, 70, star(35, 35, 1.2, .2) + star(12, 12, .5, 1), { dx: -10, dy: -10 }) + pfSvg('bl', 70, 70, star(35, 35, 1, .9), { dx: -10, dy: -10 }); } });

// ======================= D4 · INFERNO =======================
pfAdd('D', 'inferno', 'INFERNO', 'Раскалённые трещины, живое пламя по низу и искры по бокам', { ring: 'conic-gradient(from var(--a),#ff2d00,#ffb300,#7a0000,#ff5a00,#ffe066,#ff2d00)', w: 4, r: [14], sp: 3, gl: '#ff3d00', go: 1, bl: 12,
    css: `&{background:radial-gradient(ellipse at 50% 108%,rgba(255,60,0,.2),transparent 60%),#0e0709}`,
    inner: `<i style="left:-10%;bottom:-24px;width:120%;height:100px;background:radial-gradient(ellipse at 50% 100%,rgba(255,70,0,.75),transparent 70%);animation:pfFlicker 1.6s ease-in-out infinite"></i><i style="left:-10%;top:-24px;width:120%;height:60px;background:radial-gradient(ellipse at 50% 0,rgba(255,150,30,.35),transparent 70%);animation:pfFlicker 2.2s ease-in-out infinite .5s"></i>`,
    fx: [{ k: 'rise', n: 14, c: ['#ffb300', '#ff5a00', '#fff1a8', '#ff2d00'], sd: 'lr', s: [2, 4.5], d: [1.6, 3.4], dx: 10 }, { k: 'rise', n: 8, c: ['#ffb300', '#ff5a00'], sd: 'b', s: [2, 4], d: [1.4, 2.8] }, { k: 'spark', n: 8, c: ['#fff1a8', '#ffb300'], sd: 'corners', s: [1.6, 3], d: [.8, 1.6] }],
    deco: () => {
        let back = '', mid = '', front = '';
        for (let i = 0; i < 16; i++) { back += pfFlameTongue(25 + i * 50, 60, 70 + (i * 37 % 4) * 14, 118, '#b91c1c', i * .11); mid += pfFlameTongue(10 + i * 50, 48, 56 + (i * 53 % 4) * 10, 118, '#ff5a00', i * .09 + .2); front += pfFlameTongue(40 + i * 50, 34, 36 + (i * 29 % 3) * 10, 118, '#ffcf5a', i * .13 + .1); }
        const crack = (d, dl) => `<g class="an pu" style="animation-delay:${dl}s"><path d="${d}" fill="none" stroke="#ff6a00" stroke-width="3" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#fff1a8" stroke-width="1.2" stroke-linejoin="round"/></g>`;
        return pfStrip('bottom', 800, 120, back + mid + front, { dy: -44, dx: -20 })
            + pfSvg('tl', 120, 100, crack('M0 20L26 28L40 14L58 40L86 34L100 62', 0) + crack('M30 0L38 30L22 52L40 74', .5), { dx: -12, dy: -12 })
            + pfSvg('tr', 120, 100, `<g transform="translate(120 0) scale(-1 1)">${crack('M0 20L26 28L40 14L58 40L86 34L100 62', .3) + crack('M30 0L38 30L22 52L40 74', .8)}</g>`, { dx: -12, dy: -12 })
            + pfSvg('lc', 40, 160, crack('M0 10L22 40L8 70L26 100L12 130L30 156', .4), { dx: -10 }) + pfSvg('rc', 40, 160, `<g transform="translate(40 0) scale(-1 1)">${crack('M0 10L22 40L8 70L26 100L12 130L30 156', .9)}</g>`, { dx: -10 }); } });

// ======================= D5 · CELESTIAL CROWN =======================
pfAdd('D', 'celestial', 'CELESTIAL CROWN', 'Небесная корона, сияющие крылья, лучи света и кристаллы', { ring: 'conic-gradient(from var(--a),#fff3c2,#7cf6ff,#ffffff,#c4b5fd,#ffd166,#fff3c2)', w: 4, r: [22], sp: 7, gl: '#aee6ff', go: 1, bl: 11,
    inner: `<i style="left:25%;top:-14px;width:50%;height:90px;background:radial-gradient(ellipse at 50% 0,rgba(255,243,194,.6),transparent 70%);animation:pfFlicker 3s ease-in-out infinite"></i><i style="top:-10px;bottom:-10px;left:0;width:26%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent);animation:pfSweep 4.8s ease-in-out infinite"></i>`,
    fx: [{ k: 'fall', n: 10, c: ['#fff', '#fff3c2', '#aee6ff'], sd: 'lr', s: [2, 4], d: [5, 9], dx: 8 }, { k: 'tw', n: 14, c: ['#fff', '#ffe08a', '#aee6ff'], sd: 'all', s: [2, 4.5], d: [2, 4.5] }, { k: 'rise', n: 5, c: ['#fff3c2'], sd: 'tr', s: [1.6, 3], d: [3, 5] }],
    deco: () => {
        let rays = ''; for (let i = 0; i < 11; i++) { const a = (200 + i * 14) * Math.PI / 180; rays += `<line x1="150" y1="118" x2="${_n(150 + 138 * Math.cos(a))}" y2="${_n(118 + 108 * Math.sin(a))}" stroke="#fff3c2" stroke-width="${i % 2 ? 1.2 : 2.2}" opacity=".7"/>`; }
        const w = (side) => `<g transform="translate(158 140)">${pfWing(side, 7, 150, '#e6fbff', '#ffffff')}</g>`, w2 = (side) => `<g transform="translate(158 150)">${pfWing(side, 5, 100, '#fff3c2', '#ffd166', 'animation-delay:.4s')}</g>`;
        return pfSvg('tc', 300, 130, `<g class="an glint">${rays}</g>`, { dy: -84 })
            + pfSvg('tc', 180, 60, `<ellipse cx="90" cy="16" rx="62" ry="9" fill="none" stroke="#fff3c2" stroke-width="2.4" class="an pu" style="transform-origin:90px 16px"/>${pfCrown(90, 40, 1.3, '#ffe08a', '#8a5a10', '#7cf6ff', '#fff')}`, { dy: -76 })
            + pfSvg('tl', 170, 170, w(-1) + w2(-1), { dx: -148, dy: -62 }) + pfSvg('tr', 170, 170, `<g transform="translate(170 0) scale(-1 1)">${w(-1) + w2(-1)}</g>`, { dx: -148, dy: -62 })
            + pfSvg('bl', 80, 80, pfCrystal(34, 44, 1, -18, '#aee6ff', '#fff') + pfCrystal(58, 52, .6, 18, '#fff3c2', '#fff', .6), { dx: -14, dy: -16 }) + pfSvg('br', 80, 80, pfCrystal(46, 44, 1, 18, '#aee6ff', '#fff', .3) + pfCrystal(20, 52, .6, -18, '#fff3c2', '#fff', .9), { dx: -14, dy: -16 }); } });

// ======================= E · ADMIN GOD (только безлимитный баланс, проверка на сервере) =======================
pfAdd('E', 'admingod', 'ADMIN GOD', 'Корона администратора, энергетические крылья, волны света. Только для безлимитного баланса', { price: 0, needUnlimited: true,
    ring: 'conic-gradient(from var(--a),#ff1744,#7c3aed,#f5b82e,#0b0b10,#ff1744,#7c3aed,#f5b82e,#0b0b10,#ff1744)', w: 5, r: [20], sp: 4, gl: '#ff3d5e', go: 1, bl: 14,
    css: `&{outline:2px solid rgba(245,184,46,.85);outline-offset:9px;background:radial-gradient(ellipse at 50% -10%,rgba(255,30,70,.2),transparent 55%),radial-gradient(ellipse at 50% 110%,rgba(124,58,237,.22),transparent 55%),#0a060d}.modal-card&{animation:pfGodIn 1.1s cubic-bezier(.2,.8,.2,1) both}`,
    inner: `<i style="left:-40%;top:-18px;width:180%;height:80px;background:radial-gradient(ellipse at 30% 0,rgba(255,40,80,.6),transparent 60%),radial-gradient(ellipse at 75% 0,rgba(167,100,255,.55),transparent 60%);animation:pfDrift 5s ease-in-out infinite alternate"></i><i style="left:-40%;bottom:-18px;width:180%;height:80px;background:radial-gradient(ellipse at 25% 100%,rgba(245,184,46,.45),transparent 60%),radial-gradient(ellipse at 70% 100%,rgba(255,40,80,.5),transparent 60%);animation:pfDrift 6s ease-in-out infinite alternate-reverse"></i><i style="top:-10px;bottom:-10px;left:0;width:22%;background:linear-gradient(90deg,transparent,rgba(255,215,120,.75),transparent);animation:pfSweep 3.4s ease-in-out infinite"></i>`,
    fx: [{ k: 'rise', n: 14, c: ['#ff3d5e', '#f5b82e', '#c084fc', '#fff1a8'], sd: 'lr', s: [2, 4.5], d: [1.6, 3.4], dx: 12 }, { k: 'spark', n: 10, c: ['#fff1a8', '#ff6a8a'], sd: 'corners', s: [1.8, 3.2], d: [.8, 1.6] }, { k: 'tw', n: 14, c: ['#fff', '#ffd166', '#e9d5ff'], sd: 'all', s: [2, 4.5] }, { k: 'fall', n: 6, c: ['#ffd166', '#ff3d5e'], sd: 'tl', s: [2, 3.5], d: [4, 7], dx: 16 }],
    deco: () => {
        const gem = (x, y, s, dl) => `<g transform="translate(${x} ${y}) scale(${s})" style="animation:pfHue 5s linear infinite ${dl}s"><path d="M0 -15L13 0L0 16L-13 0Z" fill="#ff1744" stroke="#f5b82e" stroke-width="2.4"/><path d="M-13 0H13M0 -15L-4 0L0 16L4 0Z" stroke="#fff" stroke-width=".8" fill="none" opacity=".75"/><circle r="3" fill="#fff"/></g>`;
        const wing = (side) => `<g transform="translate(150 150)">${pfWing(side, 9, 170, '#7c3aed', '#f5b82e')}</g><g transform="translate(150 158)">${pfWing(side, 7, 120, '#e11d48', '#ffd166', 'animation-delay:.3s')}</g>`;
        let fl = ''; for (let i = 0; i < 5; i++) fl += pfFlameTongue(16 + i * 26, 22, 26 + (i % 3) * 14, 56, i % 2 ? '#ff3d5e' : '#a855f7', i * .14);
        return `<span class="pf-wave"></span><span class="pf-wave w2"></span><span class="pf-wave w3"></span>`
            + pfSvg('tc', 140, 70, fl, { dy: -112 })
            + pfSvg('tc', 220, 120, pfCrown(110, 66, 2.1, '#1a1a22', '#f5b82e', '#ff1744', '#a855f7'), { dy: -86 })
            + pfSvg('tl', 180, 190, wing(-1), { dx: -158, dy: -72 }) + pfSvg('tr', 180, 190, `<g transform="translate(180 0) scale(-1 1)">${wing(-1)}</g>`, { dx: -158, dy: -72 })
            + pfSvg('tl', 40, 40, gem(20, 20, 1, 0), { dx: -14, dy: -14 }) + pfSvg('tr', 40, 40, gem(20, 20, 1, -1.2), { dx: -14, dy: -14 }) + pfSvg('bl', 40, 40, gem(20, 20, 1, -2.4), { dx: -14, dy: -14 }) + pfSvg('br', 40, 40, gem(20, 20, 1, -3.6), { dx: -14, dy: -14 })
            + pfSvg('lc', 34, 34, gem(17, 17, .8, -.6), { dx: -12 }) + pfSvg('rc', 34, 34, gem(17, 17, .8, -1.8), { dx: -12 })
            + `<div class="pf-plate">ADMIN GOD</div>`; } });

PF_LIST.forEach(it => { if (!ITEM_BY_ID.has(it.id)) { ITEM_BY_ID.set(it.id, it); SHOP_ITEMS.push(it); } });
